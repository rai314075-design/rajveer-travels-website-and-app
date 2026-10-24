"use client";

import { useState } from "react";
import { SeatMap } from "@/components/seats/SeatMap";

interface TripData {
  id: string;
  bus: {
    operator: string;
    busNumber: string;
    description: string | null;
    ownerPhone: string | null;
  };
  route: {
    source: string;
    destination: string;
  };
  travelDate: string; // DD/MM/YYYY
  departureTime: string; // HH:mm
  arrivalTime: string; // HH:mm
  fare: number;
  seats: Array<{
    id: string;
    seatNumber: string;
    status: string;
    seatTemplateId: string;
  }>;
}

interface TripClientProps {
  trip: TripData;
  userId: string | null;
  tripId: string;
}

export function TripClient({ trip, userId, tripId }: TripClientProps) {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [booking, setBooking] = useState<{ bookingId: string; ownerName: string; ownerPhone: string | null; total: number; message: string } | null>(null);
  const [bookingError, setBookingError] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  const handleSeatSelect = (seatIds: string[]) => {
    setSelectedSeats((prev) => {
      const next = new Set([...prev, ...seatIds]);
      return Array.from(next);
    });
  };

  const handleSeatDeselect = (seatIds: string[]) => {
    setSelectedSeats((prev) => prev.filter((id) => !seatIds.includes(id)));
  };

  const calculateTotal = () => {
    if (selectedSeats.length === 0) return 0;
    return Number(trip.fare ?? 0) * selectedSeats.length;
  };

  async function bookTicket() {
    setBookingLoading(true);
    setBookingError("");
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId, seatTemplateIds: selectedSeats }),
    });
    const data = await response.json().catch(() => null);
    setBookingLoading(false);
    if (!response.ok) {
      setBookingError(data?.error || "Could not book these seats. Please try again.");
      return;
    }
    setBooking(data);
    setSelectedSeats([]);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <a href="/search" className="text-sm font-medium text-brand-700 hover:text-brand-900">← Back to available buses</a>
        <div className="mt-4 mb-8 rounded-2xl bg-gray-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Choose your seat</p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
                {trip.bus.operator} <span className="text-gray-400">·</span> {trip.bus.busNumber}
              </h1>
              <p className="mt-2 text-lg text-gray-200">{trip.route.source} <span className="text-orange-300">→</span> {trip.route.destination}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-300">
              <span>{trip.travelDate}</span>
              <span>{trip.departureTime} - {trip.arrivalTime}</span>
              <span>₹{trip.fare} per seat</span>
              <span>{trip.seats.length} seats</span>
            </div>
          </div>
          {trip.bus.description && (
            <p className="mt-5 max-w-3xl rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm text-gray-300">
              {trip.bus.description}
            </p>
          )}
        </div>

        {/* Seat Selection */}
        {!userId ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">
              Please log in to select seats
            </h2>
            <p className="mb-4">
              You need to be logged in to book seats. Please{" "}
              <a
                href={"/api/auth/login?returnTo=/trip/" + tripId}
                className="text-brand-600 hover:text-purple-600 underline"
              >
                log in
              </a>{" "}
              to continue.
            </p>
          </div>
        ) : booking ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">Booking confirmed</p>
            <h2 className="mt-2 text-2xl font-bold text-green-950">Your ticket is booked</h2>
            <p className="mt-2 text-sm text-green-900">The bus owner will call you soon with the final travel details.</p>
            <div className="mt-5 grid gap-3 rounded-xl border border-green-200 bg-white p-4 text-sm sm:grid-cols-2">
              <div><span className="text-gray-500">Booking ID</span><p className="font-semibold text-gray-950">{booking.bookingId}</p></div>
              <div><span className="text-gray-500">Bus owner</span><p className="font-semibold text-gray-950">{booking.ownerName}</p></div>
              <div><span className="text-gray-500">Owner phone</span><p className="font-semibold text-brand-700">{booking.ownerPhone || "The owner will contact you"}</p></div>
              <div><span className="text-gray-500">Total fare</span><p className="font-semibold text-gray-950">₹{booking.total}</p></div>
            </div>
            <p className="mt-4 text-sm font-medium text-green-800">{booking.message}</p>
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <SeatMap
              tripId={tripId}
              onSeatSelect={handleSeatSelect}
              onSeatDeselect={handleSeatDeselect}
              initialSelection={selectedSeats}
            />

            {selectedSeats.length > 0 && (
              <aside className="sticky top-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Your selection</p>
                <h2 className="mt-2 text-xl font-bold text-gray-950">{selectedSeats.length} seat{selectedSeats.length > 1 ? "s" : ""}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                      {selectedSeats.map((seatId) => {
                        const seat = trip.seats.find(
                          (s) => s.seatTemplateId === seatId
                        );
                        if (!seat) return null;
                        return (
                          <span
                            key={seatId}
                            className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800"
                          >
                            {seat.seatNumber}
                          </span>
                        );
                      })}
                </div>
                <div className="mt-5 border-t pt-4">
                  <div className="flex items-center justify-between text-sm text-gray-500"><span>Fare</span><span>₹{trip.fare} × {selectedSeats.length}</span></div>
                  <div className="mt-2 flex items-center justify-between"><span className="font-semibold text-gray-900">Total</span><span className="text-2xl font-bold text-brand-700">₹{calculateTotal()}</span></div>
                  <button onClick={bookTicket} disabled={bookingLoading} className="mt-5 w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{bookingLoading ? "Booking ticket..." : "Book ticket"}</button>
                  {bookingError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{bookingError}</p>}
                </div>
              </aside>
            )}
          </div>
        )}
      </div>
    </div>
  );
}