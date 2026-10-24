import { useState, useEffect, useCallback } from "react";
import type { SeatState } from "@/types/seat";

/**
 * Hook to manage seat locking with automatic expiration and cleanup.
 * Provides real-time seat state updates and lock management.
 */
export function useSeatLock(tripId: string) {
  const [seats, setSeats] = useState<SeatState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current seat status
  const fetchSeatStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/seats/status?tripId=${tripId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch seat status");
      }
      const data = await res.json();
      setSeats(data.seats);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  // Initial load
  useEffect(() => {
    fetchSeatStatus();
  }, [tripId, fetchSeatStatus]);

  // Poll for updates every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchSeatStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchSeatStatus]);

  // Lock seats
  const lockSeats = useCallback(
    async (seatTemplateIds: string[]) => {
      try {
        const res = await fetch("/api/seats/lock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripId,
            seatTemplateIds,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to lock seats");
        }

        // Update local state optimistically
        const data = await res.json();
        setSeats((prev) =>
          prev.map((seat) =>
            seatTemplateIds.includes(seat.seatTemplateId)
              ? {
                  ...seat,
                  status: "LOCKED",
                  lockedAt: new Date().toISOString(),
                  lockedUntil: data.lockedUntil,
                }
              : seat
          )
        );
        return { success: true, lockedUntil: data.lockedUntil };
      } catch (err: any) {
        throw new Error(err.message || "Failed to lock seats");
      }
    },
    [tripId]
  );

  // Unlock seats
  const unlockSeats = useCallback(
    async (seatTemplateIds: string[]) => {
      try {
        const res = await fetch("/api/seats/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripId,
            seatTemplateIds,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to unlock seats");
        }

        // Update local state
        setSeats((prev) =>
          prev.map((seat) =>
            seatTemplateIds.includes(seat.seatTemplateId)
              ? {
                  ...seat,
                  status: "AVAILABLE",
                  lockedAt: null,
                  lockedUntil: null,
                }
              : seat
          )
        );
        return { success: true };
      } catch (err: any) {
        throw new Error(err.message || "Failed to unlock seats");
      }
    },
    [tripId]
  );

  // Get available seats
  const getAvailableSeats = useCallback(() => {
    return seats.filter(
      (seat) => seat.status === "AVAILABLE"
    );
  }, [seats]);

  // Get locked seats
  const getLockedSeats = useCallback(() => {
    return seats.filter(
      (seat) => seat.status === "LOCKED"
    );
  }, [seats]);

  return {
    seats,
    loading,
    error,
    lockSeats,
    unlockSeats,
    getAvailableSeats,
    getLockedSeats,
    refresh: fetchSeatStatus,
  };
}