"use client";

import { useEffect, useRef, useState } from "react";
import { RecaptchaVerifier, getAuth, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { getApps, initializeApp } from "firebase/app";
import { useLanguage } from "@/components/LanguageProvider";

const firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

export type ProfileValues = {
  name: string;
  email: string;
  phone: string;
  address: string;
  language: "ENGLISH" | "HINDI";
  phoneVerified: boolean;
  emailVerified: boolean;
};

export default function ProfileForm({ name, phone, address, language, phoneVerified, email, emailVerified, onSaved, onVerified }: { name: string; phone: string | null; address: string | null; language: "ENGLISH" | "HINDI"; phoneVerified: boolean; email: string; emailVerified: boolean; onSaved?: (values: ProfileValues) => void; onVerified?: (values: ProfileValues) => void }) {
  const [nameValue, setNameValue] = useState(name);
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [addressValue, setAddressValue] = useState(address ?? "");
  const [phoneIsVerified, setPhoneIsVerified] = useState(phoneVerified);
  const [emailIsVerified, setEmailIsVerified] = useState(emailVerified);
  // The dropdown holds the pending language choice. The page copy follows the
  // saved language (from context) so nothing flips until "Save profile" is
  // pressed.
  const [languageValue, setLanguageValue] = useState(language);
  const { hindi, setLanguage } = useLanguage();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const confirmationResult = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

  function currentValues(): ProfileValues {
    return {
      name: nameValue,
      email,
      phone: phoneValue,
      address: addressValue,
      language: languageValue,
      phoneVerified: phoneIsVerified,
      emailVerified: emailIsVerified,
    };
  }

  // Initialize the invisible reCAPTCHA verifier once on mount so the
  // grecaptcha script is loaded before the user requests phone OTP.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const auth = getAuth(firebaseApp);
    if (!recaptchaVerifier.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, "phone-recaptcha", {
        size: "invisible",
        callback: () => {
          // reCAPTCHA solved — the verifier will be used by signInWithPhoneNumber.
        },
      });
    }
  }, [firebaseApp]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    // Only a changed phone needs OTP verification. Saving the name, address or
    // language must work even when the phone on the account is unverified.
    if (phoneValue !== (phone ?? "") && !phoneIsVerified) {
      setMessage(hindi ? "सेव करने से पहले नए फोन नंबर का OTP सत्यापित करें।" : "Verify the new phone number with OTP before saving.");
      setSaving(false);
      return;
    }

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameValue, phone: phoneValue, address: addressValue, language: languageValue }),
    });

    const data = await response.json().catch(() => ({ error: "Could not update profile. Please try again." }));
    if (response.ok) {
      // Apply the saved language to the app-wide context so the header, the
      // account summary and every other client component flip together.
      setLanguage(languageValue);
      onSaved?.(currentValues());
      setMessage(hindi ? "प्रोफ़ाइल अपडेट हो गई।" : "Profile updated.");
    } else {
      setMessage(data.error || (hindi ? "प्रोफ़ाइल अपडेट नहीं हो सकी।" : "Could not update profile."));
    }
    setSaving(false);
  }

  async function sendOtp() {
    const response = await fetch("/api/profile/phone/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: phoneValue }) });
    const data = await response.json().catch(() => ({ error: "Could not send phone verification code. Please try again." }));
    if (response.ok) {
      try {
        const auth = getAuth(firebaseApp);
        confirmationResult.current = await signInWithPhoneNumber(auth, data.phone || phoneValue, recaptchaVerifier.current!);
        setMessage(hindi ? "फोन पर सत्यापन कोड भेज दिया गया है।" : "Phone verification code sent.");
      } catch (error) {
        const firebaseCode = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown-error";
        const errorMessage = firebaseCode === "auth/operation-not-allowed"
          ? "Phone sign-in is disabled in Firebase. Enable Phone in Firebase Authentication providers."
          : firebaseCode === "auth/unauthorized-domain"
            ? "This website is not an authorized Firebase domain. Add localhost in Firebase Authentication settings."
            : firebaseCode === "auth/invalid-phone-number"
              ? "Firebase rejected this phone number. Include the country code, for example +919876543210."
              : `Firebase could not send the OTP (${firebaseCode}). Check the browser console for details.`;
        setMessage(hindi ? `OTP नहीं भेजा जा सका। ${errorMessage}` : errorMessage);
        recaptchaVerifier.current?.clear();
        recaptchaVerifier.current = null;
        await fetch("/api/profile/phone/send", { method: "DELETE" });
        return;
      }
      setPhoneValue(data.phone || phoneValue);
      setCode("");
      setOtpSent(true);
    } else setMessage(data.error);
  }

  async function verifyPhone() {
    if (!confirmationResult.current) return;
    let firebaseUser;
    try {
      firebaseUser = (await confirmationResult.current.confirm(code)).user;
    } catch {
      setMessage(hindi ? "फोन सत्यापन कोड गलत या समाप्त हो गया है।" : "The phone verification code is invalid or expired.");
      return;
    }
    const response = await fetch("/api/profile/phone/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: phoneValue, idToken: await firebaseUser.getIdToken() }) });
    const data = await response.json().catch(() => ({ error: "Could not verify phone number. Please try again." }));
    setMessage(response.ok ? (hindi ? "फोन नंबर सत्यापित हो गया।" : "Phone number verified.") : data.error);
    if (response.ok) {
      const verifiedPhone = data.phone || phoneValue;
      setPhoneValue(verifiedPhone);
      setOtpSent(false);
      setPhoneIsVerified(true);
      onVerified?.({ ...currentValues(), phone: verifiedPhone, phoneVerified: true });
      confirmationResult.current = null;
      recaptchaVerifier.current?.clear();
      recaptchaVerifier.current = null;
    }
  }

  async function sendEmailOtp() {
    // The email is fixed at registration, so the code always goes to the
    // address on the account — there is nothing for the user to type.
    const response = await fetch("/api/profile/email/send", { method: "POST", headers: { "Content-Type": "application/json" } });
    const data = await response.json().catch(() => ({ error: "Could not send email verification code. Please try again." }));
    setMessage(response.ok ? (hindi ? "ईमेल पर सत्यापन कोड भेज दिया गया है।" : "Email verification code sent.") : data.error);
    if (response.ok) {
      setEmailCode("");
      setEmailOtpSent(true);
    }
  }

  async function verifyEmail() {
    const response = await fetch("/api/profile/email/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: emailCode }) });
    const data = await response.json().catch(() => ({ error: "Could not verify email address. Please try again." }));
    setMessage(response.ok ? (hindi ? "ईमेल सत्यापित हो गया।" : "Email verified.") : data.error);
    if (response.ok) {
      setEmailOtpSent(false);
      setEmailIsVerified(true);
      onVerified?.({ ...currentValues(), emailVerified: true });
    }
  }

  return (
    <form onSubmit={saveProfile} className="space-y-7">
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{hindi ? "प्राथमिकताएं" : "Preferences"}</h3>
        <label htmlFor="language" className="block text-sm text-gray-500 mb-1">{hindi ? "भाषा" : "Language"}</label>
        <select id="language" value={languageValue} onChange={(event) => setLanguageValue(event.target.value as "ENGLISH" | "HINDI")} className="w-full border rounded-lg px-3 py-2">
          <option value="ENGLISH">English</option>
          <option value="HINDI">हिन्दी</option>
        </select>
        {languageValue !== language && <p className="mt-2 text-xs text-amber-700">{hindi ? "भाषा बदलने के लिए प्रोफ़ाइल सेव करें।" : "Save the profile to apply the new language."}</p>}
      </div>
      <div>
        <h3 className="mb-3 border-t pt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">{hindi ? "व्यक्तिगत जानकारी" : "Personal information"}</h3>
        <label htmlFor="name" className="block text-sm text-gray-500 mb-1">{hindi ? "नाम" : "Name"} <span className="text-red-600">*</span></label>
        <input id="name" required value={nameValue} onChange={(event) => setNameValue(event.target.value)} className="w-full border rounded-lg px-3 py-2" />
      </div>
      <div>
        <h3 className="mb-3 border-t pt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">{hindi ? "सत्यापन" : "Verification"}</h3>
        <label htmlFor="email" className="block text-sm text-gray-500 mb-1">{hindi ? "ईमेल" : "Email address"} <span className="text-red-600">*</span></label>
        <input id="email" type="email" required value={email} readOnly className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600" />
        <p className="mt-1 text-xs text-gray-500">{hindi ? "ईमेल पहले ही तय है और इसे बदला नहीं जा सकता।" : "Your email is set once at registration and cannot be changed."}</p>
        <p className="mt-1 text-xs text-gray-500">{hindi ? "स्थिति:" : "Status:"} {emailIsVerified ? (hindi ? "सत्यापित" : "Verified") : (hindi ? "सत्यापित नहीं" : "Not verified")}</p>
        {!emailIsVerified && <button type="button" onClick={sendEmailOtp} className="mt-2 text-sm font-medium text-brand-700">{hindi ? "ईमेल सत्यापन कोड भेजें" : "Send email verification code"}</button>}
        {emailOtpSent && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <label htmlFor="email-otp" className="block text-sm font-medium text-gray-700 mb-2">{hindi ? `ईमेल ${email} पर भेजा गया 6 अंकों का OTP दर्ज करें` : `Enter the 6-digit OTP sent to ${email}`}</label>
            <div className="flex flex-col gap-2 sm:flex-row"><input id="email-otp" inputMode="numeric" maxLength={6} value={emailCode} onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" className="border rounded-lg px-3 py-2" /><button type="button" onClick={verifyEmail} disabled={emailCode.length !== 6} className="bg-brand-600 text-white rounded-lg px-3 py-2 disabled:opacity-50">{hindi ? "ईमेल सत्यापित करें" : "Verify email"}</button></div>
          </div>
        )}
      </div>
      <div>
        <label htmlFor={otpSent ? "phone-otp" : "phone"} className="block text-sm text-gray-500 mb-1">
          {otpSent ? (hindi ? "फोन OTP" : "Phone OTP") : (hindi ? "फोन नंबर" : "Phone number")}
        </label>
        {otpSent ? (
          <>
            <p className="mb-2 text-sm text-gray-600">{hindi ? `${phoneValue} पर भेजा गया OTP दर्ज करें` : `Enter the OTP sent to ${phoneValue}`}</p>
            <input
              id="phone-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              required
              autoFocus
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter 6-digit OTP"
              className="w-full border rounded-lg px-3 py-2 tracking-[0.3em]"
            />
          </>
        ) : (
          <input id="phone" type="tel" value={phoneValue} onChange={(event) => { setPhoneValue(event.target.value); setPhoneIsVerified(event.target.value === phone ? phoneVerified : false); }} className="w-full border rounded-lg px-3 py-2" placeholder="Enter phone with country code" />
        )}
        {!otpSent && <p className="text-xs text-gray-500">{hindi ? "स्थिति:" : "Status:"} {phoneIsVerified && phoneValue === phone ? (hindi ? "सत्यापित" : "Verified") : (hindi ? "सत्यापित नहीं" : "Not verified")}</p>}
        {(!otpSent && (!phoneIsVerified || phoneValue !== phone)) && <button type="button" onClick={sendOtp} className="text-sm font-medium text-brand-700">{hindi ? "फोन सत्यापन कोड भेजें" : "Send phone verification code"}</button>}
        {otpSent && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="mb-2 text-sm font-medium text-gray-700">{hindi ? "OTP दर्ज करने के बाद सत्यापित करें" : "After entering the OTP, verify your phone"}</p>
            <button type="button" onClick={verifyPhone} disabled={code.length !== 6} className="bg-brand-600 text-white rounded-lg px-3 py-2 disabled:opacity-50">{hindi ? "फोन सत्यापित करें" : "Verify phone"}</button>
          </div>
        )}
        <div id="phone-recaptcha" />
      </div>
      <div>
        <label htmlFor="address" className="block text-sm text-gray-500 mb-1">{hindi ? "पता (वैकल्पिक)" : "Address (optional)"}</label>
        <textarea id="address" value={addressValue} onChange={(event) => setAddressValue(event.target.value)} className="w-full border rounded-lg px-3 py-2" rows={3} placeholder="Enter your address" />
      </div>
      <button type="submit" disabled={saving} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg px-4 py-2">
        {saving ? (hindi ? "सेव हो रहा है..." : "Saving...") : (hindi ? "प्रोफ़ाइल सेव करें" : "Save profile")}
      </button>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </form>
  );
}
