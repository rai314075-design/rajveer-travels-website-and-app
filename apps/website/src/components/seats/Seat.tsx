"use client";

import type {
  SeatState,
  ReservationStatus
} from "@/types/seat";

interface SeatProps {
  seat: SeatState;
  state: "available" | "locked" | "booked" | "selected";
  onClick: (seatId: string) => void;
}

/**
 * Individual seat component showing visual state.
 */
export function Seat({ seat, state, onClick }: SeatProps) {
  const getSeatColor = () => {
    switch (state) {
      case "selected": return "bg-brand-100 border-brand-400";
      case "available": return seat.type === "SLEEPER" ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200";
      case "locked": return "bg-yellow-100 border-yellow-300";
      case "booked": return "bg-red-600 border-red-700 text-white";
      default: return "bg-gray-50 border-gray-200";
    }
  };

  const getSeatIcon = () => {
    if (seat.type === "SLEEPER") return "🛏";
    return "💺";
  };

  return (
    <button
      onClick={() => onClick(seat.seatTemplateId)}
      className={`
        relative flex items-center justify-center cursor-pointer
        rounded border-2 transition-all
        ${getSeatColor()}
        ${state === "selected" ? "shadow-[0_0_0_3px_rgba(37,99,235,0.45)]" : ""}
        hover:scale-105
        disabled:cursor-not-allowed disabled:opacity-50
      `}
      style={{
        gridColumn: `${seat.xPosition + 1} / span ${seat.colSpan}`,
        gridRow: `${seat.yPosition + 1} / span ${seat.rowSpan}`,
        minHeight: seat.type === "SLEEPER" ? "56px" : "48px",
      }}
      disabled={state === "booked" || state === "locked"}
      title={`${seat.seatNumber} - ${state}`}
    >
      <span className="text-xs font-medium">
        {seat.seatNumber}
        {seat.type === "SLEEPER" && " " + getSeatIcon()}
      </span>

      {/* Lock indicator */}
      {state === "locked" && (
        <div className="absolute top-1 right-1 text-xs font-bold text-yellow-800">
          🔒
        </div>
      )}

      {/* Booked indicator */}
      {state === "booked" && (
        <div className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-red-950"></div>
      )}
    </button>
  );
}