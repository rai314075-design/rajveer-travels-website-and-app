"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";

type Bus = {
  id: string;
  busNumber: string;
  type: string;
  totalSeats: number;
  operator: string;
  description?: string | null;
  upiId?: string | null;
  paymentQrUrl?: string | null;
  ownerPhone?: string | null;
  pickupLocation?: string | null;
  dropLocation?: string | null;
};

export default function AdminBusesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    busNumber: "",
    type: "AC_SEATER",
    totalSeats: 40,
    description: "",
    upiId: "",
    paymentQrUrl: "",
    ownerPhone: "",
    pickupLocation: "",
    dropLocation: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: busesList = [] } = useQuery<Bus[]>({
    queryKey: ["admin-buses"],
    queryFn: async () => {
      const res = await fetch("/api/admin/buses");
      if (!res.ok) throw new Error("Failed to load buses");
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const buses = busesList;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/buses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, totalSeats: Number(form.totalSeats) }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.formErrors?.join(", ") || "Failed to add bus");
      return;
    }
    setForm({ busNumber: "", type: "AC_SEATER", totalSeats: 40, description: "", upiId: "", paymentQrUrl: "", ownerPhone: "", pickupLocation: "", dropLocation: "" });
    queryClient.invalidateQueries({ queryKey: ["admin-buses"] });
  }

  const deleteMutation = useMutation({
    mutationFn: async (busId: string) => {
      const res = await fetch(`/api/buses/${busId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete bus");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-buses"] });
    },
    onError: (error) => {
      setError(error instanceof Error ? error.message : "Failed to delete bus");
    },
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; bus: Bus | null }>({
    open: false,
    bus: null,
  });

  return (
    <div>
      <div className="flex flex-col gap-1 mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Fleet operations</p>
          <h1 className="text-3xl font-bold text-gray-950">Manage buses</h1>
        </div>
        <p className="text-sm text-gray-500">Add buses here, configure their seats in Layout Builder, then <Link href="/admin/trips" className="font-semibold text-brand-700 underline">schedule a trip</Link> with an active route to make them available on the website and mobile app.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        <input
          placeholder="Bus number (e.g. RJ-101)"
          value={form.busNumber}
          onChange={(e) => setForm({ ...form, busNumber: e.target.value })}
          required
          className="border rounded-lg px-3 py-2"
        />
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="border rounded-lg px-3 py-2"
        >
          <option value="AC_SEATER">AC Seater</option>
          <option value="AC_SLEEPER">AC Sleeper</option>
          <option value="NON_AC_SEATER">Non-AC Seater</option>
          <option value="NON_AC_SLEEPER">Non-AC Sleeper</option>
        </select>
        <input
          type="number"
          min={1}
          placeholder="Total seats"
          value={form.totalSeats}
          onChange={(e) => setForm({ ...form, totalSeats: Number(e.target.value) })}
          required
          className="border rounded-lg px-3 py-2"
        />
        <textarea
          placeholder="Bus description (amenities, comfort, onboard services)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          maxLength={1000}
          rows={2}
          className="border rounded-lg px-3 py-2 sm:col-span-2 lg:col-span-3"
        />
        <input
          placeholder="UPI ID (name@upi)"
          value={form.upiId}
          onChange={(e) => setForm({ ...form, upiId: e.target.value })}
          className="border rounded-lg px-3 py-2"
        />
        <input
          placeholder="QR image URL"
          value={form.paymentQrUrl}
          onChange={(e) => setForm({ ...form, paymentQrUrl: e.target.value })}
          className="border rounded-lg px-3 py-2"
        />
        <input
          placeholder="Owner phone number"
          value={form.ownerPhone}
          onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })}
          className="border rounded-lg px-3 py-2"
        />
        <input
          placeholder="Pickup location"
          value={form.pickupLocation}
          onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })}
          className="border rounded-lg px-3 py-2"
        />
        <input
          placeholder="Drop location"
          value={form.dropLocation}
          onChange={(e) => setForm({ ...form, dropLocation: e.target.value })}
          className="border rounded-lg px-3 py-2"
        />
        <button disabled={loading} className="lg:col-span-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2">
          {loading ? "Adding..." : "Add Bus"}
        </button>
      </form>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="bg-white rounded-xl shadow divide-y">
        {buses.map((b) => (
          <div key={b.id} className="p-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-950">{b.busNumber}</span>
                <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">{b.type.replace(/_/g, " ")}</span>
                <span className="text-sm text-gray-500">{b.totalSeats} seats</span>
              </div>
              <div className="mt-2 text-sm text-gray-600 space-y-1">
                {b.description && <p className="max-w-2xl text-gray-700">{b.description}</p>}
                {b.ownerPhone && <div>Owner: {b.ownerPhone}</div>}
                {(b.pickupLocation || b.dropLocation) && <div>{b.pickupLocation || "Any pickup"} → {b.dropLocation || "Any drop"}</div>}
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-right">
              {b.upiId && <div className="text-sm text-brand-700">UPI: {b.upiId}</div>}
              {b.paymentQrUrl && (
                <img src={b.paymentQrUrl} alt={`${b.busNumber} payment QR`} className="h-16 w-16 object-cover rounded border mt-1 ml-auto" />
              )}
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirm({ open: true, bus: b })}
                disabled={deleteMutation.isPending}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Removing..." : "Delete"}
              </button>
            </div>
          </div>
        ))}
        {buses.length === 0 && <p className="p-4 text-gray-400">No buses added yet.</p>}
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm((prev) => ({ ...prev, open }))}
        title="Delete this bus?"
        description={`Bus ${deleteConfirm.bus?.busNumber} will be permanently removed from the admin listing. If it has upcoming trips with active bookings, those must be cancelled or moved first.`}
        onConfirm={async () => {
          if (deleteConfirm.bus) {
            await deleteMutation.mutateAsync(deleteConfirm.bus.id);
          }
          setDeleteConfirm({ open: false, bus: null });
        }}
        loading={deleteMutation.isPending}
        toastSuccess="Bus deleted"
        toastError="Failed to delete bus"
      />
    </div>
  );
}
