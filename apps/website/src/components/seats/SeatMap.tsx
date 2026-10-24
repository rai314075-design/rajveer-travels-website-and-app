"use client";

import { useState, useEffect } from "react";
import type {
  SeatState,
  Deck,
  SeatType,
  ReservationStatus,
} from "@/types/seat";
import { Seat } from "./Seat";
import { SeatLegend } from "./SeatLegend";

interface SeatMapProps {
  tripId: string;
  onSeatSelect: (seatIds: string[]) => void;
  onSeatDeselect: (seatIds: string[]) => void;
  initialSelection?: string[];
}

export function SeatMap({
  tripId,
  onSeatSelect,
  onSeatDeselect,
  initialSelection = [],
}: SeatMapProps) {
  const [seats, setSeats] = useState<SeatState[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState<string[]>(initialSelection);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeDeck, setActiveDeck] = useState<Deck>("LOWER");

  // Fetch seat status
  useEffect(() => {
    async function loadSeats() {
      const res = await fetch(`/api/seats/status?tripId=${tripId}`);
      if (res.ok) {
        const data = await res.json();
        setSeats(data.seats);
      }
      setLoading(false);
    }
    loadSeats();
  }, [tripId]);

  // Poll for lock expiration / seat status updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/seats/status?tripId=${tripId}`)
        .then((res) => res.json())
        .then((data) => setSeats(data.seats))
        .catch(console.error);
    }, 15000); // Every 15 seconds

    return () => clearInterval(interval);
  }, [tripId]);

  // --- Seat selection actions ------------------------------------------

  const toggleSeat = (seatId: string) => {
    if (selectedSeats.includes(seatId)) {
      const newSelection = selectedSeats.filter((id) => id !== seatId);
      setSelectedSeats(newSelection);
      onSeatDeselect([seatId]);
    } else {
      setSelectedSeats([...selectedSeats, seatId]);
      onSeatSelect([seatId]);
    }
  };

  const lockSelectedSeats = async () => {
    if (selectedSeats.length === 0) {
      showMessage("error", "Please select at least one seat");
      return;
    }

    try {
      const res = await fetch("/api/seats/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          seatTemplateIds: selectedSeats,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to lock seats");
      }

      const data = await res.json();
      showMessage("success", `Seats locked for 10 minutes`);
      // Clear selection after successful lock
      const prev = [...selectedSeats];
      setSelectedSeats([]);
      onSeatDeselect(prev);
    } catch (err: any) {
      showMessage("error", err.message || "Failed to lock seats");
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // --- Helper functions ------------------------------------------------

  const getSeatState = (seat: SeatState): "available" | "locked" | "booked" | "selected" => {
    if (selectedSeats.includes(seat.seatTemplateId)) return "selected";
    switch (seat.status) {
      case "AVAILABLE": return "available";
      case "LOCKED": return "locked";
      case "BOOKED": return "booked";
      default: return "available";
    }
  };

  // --- Render ----------------------------------------------------------

  if (loading) {
    return <div className="p-4 text-gray-500">Loading seat map...</div>;
  }

  // Group seats by deck
  const lowerDeck = seats.filter((s) => s.deck === "LOWER");
  const upperDeck = seats.filter((s) => s.deck === "UPPER");

  const activeSeats = activeDeck === "LOWER" ? lowerDeck : upperDeck;
  const maxX = Math.max(...activeSeats.map((s) => s.xPosition + s.colSpan), 5);
  const maxY = Math.max(...activeSeats.map((s) => s.yPosition + s.rowSpan), 1);

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Select Your Seats</h2>
        <span className="text-sm text-gray-500">{selectedSeats.length ? `${selectedSeats.length} selected` : "Click a seat to select it"}</span>
      </div>

      <SeatLegend />

      {/* Deck Tabs */}
      <div className="flex gap-2 border-b mb-4">
        <button
          onClick={() => setActiveDeck("LOWER")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeDeck === "LOWER"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Lower Deck
        </button>
        {upperDeck.length > 0 && (
          <button
            onClick={() => setActiveDeck("UPPER")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeDeck === "UPPER"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            Upper Deck
          </button>
        )}
      </div>

      {/* Seat Grid */}
      <div
        className="mx-auto max-w-2xl rounded-2xl border-4 border-gray-300 bg-white p-4 shadow-inner"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${maxX}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${maxY}, 1fr)`,
          minHeight: "420px",
          gap: "8px",
        }}
      >
        {/* Grid background */}
        {[...Array(maxY)].map((_, rowIdx) =>
          [...Array(maxX)].map((_, colIdx) => (
            <div
              key={`${rowIdx}-${colIdx}`}
              className={colIdx === 2 ? "rounded bg-gray-100" : "rounded border border-dashed border-gray-200 bg-gray-50"}
              style={{
                gridColumn: colIdx + 1,
                gridRow: rowIdx + 1,
                minHeight: "48px",
              }}
            />
          ))
        )}

        {/* Seats */}
        {activeSeats.map((seat) => (
          <Seat
            key={seat.seatTemplateId}
            seat={seat}
            state={getSeatState(seat)}
            onClick={toggleSeat}
          />
        ))}
      </div>

      {/* Message toast */}
      {message && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white ${
            message.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}