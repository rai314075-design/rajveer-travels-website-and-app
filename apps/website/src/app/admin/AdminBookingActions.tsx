"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Booking = {
  id: string;
  status: string;
  name: string;
  phone: string | null;
  source: string;
  destination: string;
};

interface AdminBookingActionsProps {
  bookings: Booking[];
}

export default function AdminBookingActions({ bookings }: AdminBookingActionsProps) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState(bookings);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const cancelMutation = useMutation({
    mutationFn: async (booking: Booking) => {
      const response = await fetch(`/api/admin/bookings/${booking.id}/cancel`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not cancel the ticket.");
      return data;
    },
    onSuccess: (_data, booking) => {
      setItems((current) => current.map((item) => (item.id === booking.id ? { ...item, status: "CANCELLED" } : item)));
      setNotice("Ticket cancelled successfully");
    },
    onError: (error) => {
      setNotice(error instanceof Error ? error.message : "Could not cancel the ticket.");
    },
    onSettled: () => setBusyId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await fetch(`/api/admin/bookings/${bookingId}/cancel`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      // Treat 404 (already deleted) as success
      if (!response.ok && response.status !== 404) throw new Error(data.error || "Could not delete booking.");
      return data;
    },
    onMutate: async (bookingId: string) => {
      // Optimistic update: remove the row immediately
      await queryClient.cancelQueries({ queryKey: ["admin-bookings"] });
      const previousItems = [...items];
      setItems((current) => current.filter((item) => item.id !== bookingId));
      return { previousItems };
    },
    onError: (error, _bookingId, context) => {
      // Rollback on error
      if (context?.previousItems) {
        setItems(context.previousItems);
      }
      toast.error(error instanceof Error ? error.message : "Failed to delete booking");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success("Booking deleted");
    },
  });

  function cancelBooking(booking: Booking) {
    if (!window.confirm(`Cancel ${booking.name}'s ticket?`)) return;
    setBusyId(booking.id);
    setNotice("");
    cancelMutation.mutate(booking);
  }

  function deleteBooking(bookingId: string) {
    deleteMutation.mutate(bookingId);
  }

  return (
    <>
      <div className="divide-y">
        {items.map((booking) => (
          <div
            key={booking.id}
            className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">{booking.name}</p>
              <p className="text-xs text-gray-500">
                {booking.source} → {booking.destination}
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-700">
                {booking.phone ? (
                  <a href={`tel:${booking.phone}`} className="text-brand-700 hover:text-brand-900">
                    ☎ {booking.phone}
                  </a>
                ) : (
                  "Phone not provided"
                )}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  booking.status === "CANCELLED"
                    ? "bg-gray-100 text-gray-600"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {booking.status}
              </span>
              {booking.phone && (
                <a
                  href={`tel:${booking.phone}`}
                  className="rounded-lg border border-brand-200 px-3 py-1 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                >
                  Call
                </a>
              )}
              {["CONFIRMED", "PENDING"].includes(booking.status) && (
                <button
                  type="button"
                  onClick={() => cancelBooking(booking)}
                  disabled={busyId === booking.id || cancelMutation.isPending}
                  className="rounded-lg border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {busyId === booking.id || cancelMutation.isPending ? "Cancelling..." : "Cancel ticket"}
                </button>
              )}
              {booking.status === "CANCELLED" && (
                <button
                  type="button"
                  onClick={() => deleteBooking(booking.id)}
                  disabled={deleteMutation.isPending}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="px-5 py-6 text-sm text-gray-500">No bookings yet.</p>}
      </div>
      {notice && <p className="border-t px-5 py-3 text-sm text-gray-700">{notice}</p>}
    </>
  );
}