import { useEffect, useRef } from "react";
import { RecaptchaVerifier, getAuth, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { getApps, initializeApp } from "firebase/app";

const firebaseApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });

/**
 * Phone auth helper for Firebase.
 *
 * The invisible reCAPTCHA verifier is created ONCE on mount (inside
 * useEffect) so the grecaptcha script has time to load before the user
 * ever requests an OTP. Creating it lazily inside the send-Otp handler is
 * the classic cause of "Firebase Web Phone Auth requires a reCAPTCHA
 * container" — the script isn't ready yet.
 */
export function useFirebasePhoneAuth() {
  const confirmationResult = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const auth = getAuth(firebaseApp);
    if (!recaptchaVerifier.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, "phone-recaptcha", {
        size: "invisible",
        callback: () => {
          // reCAPTCHA solved — signInWithPhoneNumber will use the verifier.
        },
      });
    }
  }, [firebaseApp]);

  const sendOtp = async (phoneNumber: string) => {
    const auth = getAuth(firebaseApp);
    confirmationResult.current = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      recaptchaVerifier.current!
    );
    return confirmationResult.current;
  };

  const verifyPhone = async (code: string) => {
    if (!confirmationResult.current) throw new Error("No confirmation result");
    return confirmationResult.current.confirm(code);
  };

  const reset = () => {
    recaptchaVerifier.current?.clear();
    recaptchaVerifier.current = null;
    confirmationResult.current = null;
  };

  return { sendOtp, verifyPhone, reset, confirmationResult, recaptchaVerifier };
}