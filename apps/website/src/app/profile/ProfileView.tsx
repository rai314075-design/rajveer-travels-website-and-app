"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { formatDate } from "@/lib/formatDate";
import ProfileForm, { type ProfileValues } from "./ProfileForm";

export type ProfileData = {
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  language: "ENGLISH" | "HINDI";
  phoneVerified: boolean;
  emailVerified: boolean;
  createdAt: string;
  bookingCount: number;
};

export default function ProfileView({ user }: { user: ProfileData }) {
  const { hindi, language } = useLanguage();
  // Live copy of the profile so the account summary reflects edits right away.
  const [profile, setProfile] = useState(user);

  function handleChange(values: ProfileValues) {
    setProfile((current) => ({ ...current, ...values }));
  }

  const memberSince = formatDate(profile.createdAt);

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 flex flex-col gap-3 border-b border-gray-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Rajveer Travels</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{hindi ? "मेरी प्रोफ़ाइल" : "My Profile"}</h1>
          <p className="mt-2 text-gray-500">{hindi ? "अपनी जानकारी और सत्यापन सेटिंग प्रबंधित करें।" : "Manage your personal details and verification settings."}</p>
        </div>
        <div className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800">
          {hindi ? `${profile.bookingCount} बुकिंग` : `${profile.bookingCount} bookings`}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">{hindi ? "खाता सारांश" : "Account summary"}</h2>
          <div className="mt-5 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{hindi ? "नाम" : "Name"}</p>
              <p className="mt-1 font-medium text-gray-900">{profile.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{hindi ? "ईमेल" : "Email"}</p>
              <p className="mt-1 break-all font-medium text-gray-900">{profile.email}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{hindi ? "बुकिंग" : "Bookings"}</p>
                <p className="mt-1 text-2xl font-bold text-brand-700">{profile.bookingCount}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{hindi ? "सदस्यता" : "Member since"}</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{memberSince}</p>
              </div>
            </div>
          </div>
        </aside>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 border-b border-gray-100 pb-4">
            <h2 className="text-xl font-semibold text-gray-900">{hindi ? "प्रोफ़ाइल विवरण" : "Profile details"}</h2>
            <p className="mt-1 text-sm text-gray-500">{hindi ? "नीचे दी गई जानकारी अपडेट करें।" : "Update your information below."}</p>
          </div>
          <ProfileForm
            name={profile.name}
            phone={profile.phone}
            address={profile.address}
            language={language}
            phoneVerified={profile.phoneVerified}
            email={profile.email}
            emailVerified={profile.emailVerified}
            onSaved={handleChange}
            onVerified={handleChange}
          />
          <p className="mt-6 border-t pt-4 text-xs text-gray-500">{hindi ? "* आवश्यक जानकारी। फोन नंबर बुकिंग अपडेट के लिए जरूरी है; पता वैकल्पिक है।" : "* Required details. Your phone number is needed for booking updates; address is optional."}</p>
        </div>
      </div>
    </section>
  );
}