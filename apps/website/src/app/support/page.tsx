"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

export default function SupportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState("SERVICE");
  const [message, setMessage] = useState("");
  const [bookingId, setBookingId] = useState(searchParams.get("bookingId") || "");
  const [notice, setNotice] = useState("");
  // Language comes from the app-wide context so it stays in sync with the
  // profile page without a refresh.
  const { hindi } = useLanguage();

  useEffect(() => {
    fetch("/api/profile")
      .then((response) => response.json())
      .then((data) => {
        if (data.error) router.replace("/login");
      });
  }, [router]);

  async function submitComplaint(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/support/complaints", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, message, bookingId: bookingId || undefined }) });
    const data = await response.json();
    setNotice(response.ok ? "Complaint sent to the admin." : data.error);
    if (response.ok) setMessage("");
  }

  return (
    <section className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="border-b border-gray-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Rajveer Travels</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{hindi ? "सहायता" : "Help"}</h1>
        <p className="mt-2 max-w-2xl text-gray-500">{hindi ? "हमारी सहायता टीम से संपर्क करें।" : "Contact our support team."}</p>
      </header>
      <form onSubmit={submitComplaint} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5 border-b border-gray-100 pb-4">
          <h2 className="text-xl font-semibold text-gray-900">{hindi ? "सहायता टीम से संपर्क करें" : "Contact support"}</h2>
          <p className="mt-1 text-sm text-gray-500">{hindi ? "बुकिंग से जुड़ी समस्या हो तो बुकिंग ID जोड़ें।" : "Add your booking ID if your issue is related to a trip."}</p>
        </div>
        <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700" htmlFor="support-category">{hindi ? "समस्या का प्रकार" : "Issue type"}</label>
        <select id="support-category" value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
          <option value="BUS">Bus</option><option value="SERVICE">Service</option><option value="DRIVER">Driver</option><option value="PAYMENT">Payment</option><option value="OTHER">Other</option>
        </select>
        <label className="block text-sm font-medium text-gray-700" htmlFor="support-booking">{hindi ? "बुकिंग ID (वैकल्पिक)" : "Booking ID (optional)"}</label>
        <input id="support-booking" value={bookingId} onChange={(event) => setBookingId(event.target.value)} placeholder={hindi ? "बुकिंग ID दर्ज करें" : "Enter booking ID"} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        <label className="block text-sm font-medium text-gray-700" htmlFor="support-message">{hindi ? "समस्या का विवरण" : "Describe the issue"}</label>
        <textarea id="support-message" required minLength={10} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={hindi ? "अपनी समस्या लिखें" : "Tell us what happened"} className="w-full rounded-lg border border-gray-300 px-3 py-2" rows={5} />
        <button className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">{hindi ? "संदेश भेजें" : "Send message"}</button>
        </div>
      </form>
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    </section>
  );
}
