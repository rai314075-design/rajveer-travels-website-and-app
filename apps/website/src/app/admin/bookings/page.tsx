"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ConfirmDialog from "@/components/ConfirmDialog";
import AdminBookingActions from "../AdminBookingActions";

type Booking = {
  id: string;
  status: string;
  name: string;
  phone: string | null;
  source: string;
  destination: string;
};

export default function AdminBookingsPage() {
  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const response = await fetch("/api/admin/bookings");
      if (!response.ok) throw new Error("Failed to load bookings");
      return response.json();
    },
    staleTime: 60 * 1000,
  });

  const cancelledCount = bookings.filter((b) => b.status === "CANCELLED").length;
  const queryClient = useQueryClient();

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; count: number }>({
    open: false,
    count: 0,
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/bookings/cancelled", { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to clear cancelled bookings");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      setConfirmDialog((prev) => ({ ...prev, open: false }));
    },
    onError: () => {},
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Recent bookings</h1>
          <p className="mt-1 text-sm text-gray-500">Review every ticket and manage booking cancellations.</p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmDialog({ open: true, count: cancelledCount })}
          disabled={cancelledCount === 0}
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          Clear all cancelled ({cancelledCount})
        </button>
      </div>
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <AdminBookingActions bookings={bookings} />
      </section>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title="Delete cancelled bookings?"
        description={`${confirmDialog.count} cancelled booking${confirmDialog.count === 1 ? "" : "s"} will be permanently removed from the admin panel. This action cannot be undone.`}
        onConfirm={clearAllMutation.mutateAsync}
        loading={clearAllMutation.isPending}
        toastSuccess="All cancelled bookings have been cleared"
        toastError="Failed to clear cancelled bookings"
      />
    </div>
  );
}