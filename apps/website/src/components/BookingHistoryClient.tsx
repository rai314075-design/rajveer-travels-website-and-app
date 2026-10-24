"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { formatDateTime } from "@/lib/formatDate";

type Booking = {
  id: string;
  status: string;
  totalAmount: number | string;
  passengerInfo: unknown;
  payment?: { status: string } | null;
  createdAt: string;
  trip: {
    departureTime: string;
    arrivalTime: string;
    bus: { busNumber: string; ownerPhone?: string | null };
    route: { source: string; destination: string };
  };
};

function formatBookingDate(value: string) {
  return formatDateTime(value);
}

export default function BookingHistoryClient({ initialBookings }: { hindi?: boolean; initialBookings?: Booking[] }) {
  // Read the active language from context so a language change on the profile
  // page re-renders this section immediately, with no refresh.
  const { hindi } = useLanguage();
  const [bookings, setBookings] = useState(initialBookings || []);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [upiId, setUpiId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (initialBookings) return;
    fetch("/api/bookings").then((response) => response.ok ? response.json() : []).then(setBookings);
  }, [initialBookings]);

  async function requestCancellation(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedBooking) return;
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/bookings/${selectedBooking}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upiId }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? (hindi ? "रद्दीकरण अनुरोध भेज दिया गया है।" : "Cancellation request sent for admin review.") : data.error || "Could not request cancellation.");
    if (response.ok) {
      setSelectedBooking(null);
      setUpiId("");
    }
    setBusy(false);
  }

  async function deleteBooking(id: string) {
    const selected = bookings.find((booking) => booking.id === id);
    const unpaidActive = Boolean(selected && ["PENDING", "CONFIRMED"].includes(selected.status) && selected.payment?.status !== "PAID");
    const warning = unpaidActive
      ? (hindi ? "बस मालिक से संपर्क किए बिना टिकट रद्द करने पर आपका खाता 30 दिनों के लिए निलंबित हो सकता है। क्या आप जारी रखना चाहते हैं?" : "Cancelling without contacting the bus owner may suspend your account for 30 days. Do you want to continue?")
      : (hindi ? "क्या आप इस बुकिंग को इतिहास से हटाना चाहते हैं?" : "Remove this booking from your history?");
    if (!window.confirm(warning)) return;
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) setBookings((current) => current.filter((booking) => booking.id !== id));
    else setMessage(data.error || "Could not delete booking.");
    setBusy(false);
  }

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex items-end justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{hindi ? "बुकिंग इतिहास" : "Booking history"}</h2>
          <p className="mt-1 text-sm text-gray-500">{hindi ? "अपनी यात्राएं देखें और बुकिंग प्रबंधित करें।" : "View your trips and manage your bookings."}</p>
        </div>
        <span className="text-sm text-gray-400">{bookings.length}</span>
      </div>
      {bookings.length === 0 ? <p className="text-sm text-gray-500">{hindi ? "अभी कोई बुकिंग नहीं है।" : "No bookings yet."}</p> : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const canCancel = ["CONFIRMED", "PENDING"].includes(booking.status);
            const canDelete = ["CANCELLED", "REFUNDED"].includes(booking.status) || (booking.status === "PENDING" && booking.payment?.status !== "PAID");
            const seats = booking.passengerInfo && typeof booking.passengerInfo === "object" && "seatNumbers" in booking.passengerInfo
              ? String((booking.passengerInfo as { seatNumbers?: string[] }).seatNumbers?.join(", ") || "-")
              : "-";
            return (
              <article key={booking.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{booking.trip.route.source} <span className="text-gray-400">to</span> {booking.trip.route.destination}</h3>
                    <p className="mt-1 text-sm text-gray-500">{booking.trip.bus.busNumber} · {formatBookingDate(booking.trip.departureTime)}</p>
                    <p className="mt-1 text-sm text-gray-500">{hindi ? "सीटें" : "Seats"}: {seats} · INR {Number(booking.totalAmount).toFixed(2)}</p>
                    <p className="mt-2 text-sm text-gray-600">{hindi ? "बस मालिक" : "Bus owner"}: {booking.trip.bus.ownerPhone ? <a href={`tel:${booking.trip.bus.ownerPhone}`} className="font-semibold text-brand-700 hover:text-brand-900">{booking.trip.bus.ownerPhone}</a> : (hindi ? "नंबर उपलब्ध नहीं" : "Phone not available")}</p>
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${booking.status === "CONFIRMED" ? "bg-emerald-50 text-emerald-700" : booking.status === "REFUNDED" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{booking.status}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {canCancel && <button type="button" onClick={() => { setSelectedBooking(booking.id); setMessage(""); }} className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60" disabled={busy}>{hindi ? "रद्द करने का अनुरोध" : "Request cancellation"}</button>}
                  {canDelete && <button type="button" onClick={() => deleteBooking(booking.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60" disabled={busy}>{booking.status === "PENDING" ? (hindi ? "रद्द करें और हटाएं" : "Cancel & delete") : (hindi ? "इतिहास से हटाएं" : "Delete from history")}</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="mt-5 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">{hindi ? "रद्दीकरण के लिए टिकट चुनें और UPI ID दर्ज करें। अनुरोध एडमिन की समीक्षा के बाद पूरा होगा।" : "To cancel, choose a ticket and enter your UPI ID. Your request will be completed after admin review."}</p>
      {selectedBooking && <form onSubmit={requestCancellation} className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div><h3 className="font-semibold text-amber-900">{hindi ? "रिफंड के लिए UPI ID" : "UPI ID for refund"}</h3><p className="mt-1 text-sm text-amber-800">{hindi ? "एडमिन अनुरोध की समीक्षा करेगा।" : "An admin will review the cancellation request."}</p></div>
          <button type="button" onClick={() => setSelectedBooking(null)} className="text-sm font-semibold text-amber-900">{hindi ? "बंद करें" : "Close"}</button>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input required value={upiId} onChange={(event) => setUpiId(event.target.value)} placeholder="name@upi" className="min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2" /><button type="submit" disabled={busy} className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{hindi ? "भेजें" : "Submit"}</button></div>
      </form>}
      {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
    </section>
  );
}