"use client";

import { useEffect, useState } from "react";

type RouteRow = {
  id: string;
  source: string;
  destination: string;
  pickupPoint?: string | null;
  dropPoint?: string | null;
  distanceKm: number;
  durationMins: number;
  scheduledTripCount: number;
};

export default function AdminRoutesPage() {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [form, setForm] = useState({ source: "", destination: "", pickupPoint: "", dropPoint: "", distanceKm: 0, durationMins: 0 });
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadRoutes() {
    const res = await fetch("/api/admin/routes");
    setRoutes(await res.json());
  }

  useEffect(() => {
    loadRoutes();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        distanceKm: Number(form.distanceKm),
        durationMins: Number(form.durationMins),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.formErrors?.join(", ") || "Failed to add route");
      return;
    }
    setForm({ source: "", destination: "", pickupPoint: "", dropPoint: "", distanceKm: 0, durationMins: 0 });
    loadRoutes();
  }

  async function handleRemove(route: RouteRow) {
    if (!window.confirm(`Remove ${route.source} to ${route.destination} from active routes?`)) return;
    setRemovingId(route.id);
    setError("");
    const res = await fetch(`/api/admin/routes?id=${encodeURIComponent(route.id)}`, { method: "DELETE" });
    setRemovingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Failed to remove route");
      return;
    }
    setRoutes((current) => current.filter((item) => item.id !== route.id));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Manage Routes</h1>
      <p className="mb-6 max-w-2xl rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Routes are shared route definitions. To assign a route to your bus, open <a href="/admin/trips" className="font-semibold underline">Schedule Trips</a> and choose both the bus and this route.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 grid sm:grid-cols-6 gap-3 mb-8">
        <input placeholder="Source city" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} required className="border rounded-lg px-3 py-2" />
        <input placeholder="Destination city" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} required className="border rounded-lg px-3 py-2" />
        <input placeholder="Pickup point" value={form.pickupPoint} onChange={(e) => setForm({ ...form, pickupPoint: e.target.value })} className="border rounded-lg px-3 py-2" />
        <input placeholder="Drop point" value={form.dropPoint} onChange={(e) => setForm({ ...form, dropPoint: e.target.value })} className="border rounded-lg px-3 py-2" />
        <input type="number" placeholder="Distance (km)" value={form.distanceKm || ""} onChange={(e) => setForm({ ...form, distanceKm: Number(e.target.value) })} required className="border rounded-lg px-3 py-2" />
        <input type="number" placeholder="Duration (mins)" value={form.durationMins || ""} onChange={(e) => setForm({ ...form, durationMins: Number(e.target.value) })} required className="border rounded-lg px-3 py-2" />
        <button disabled={loading} className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 sm:col-span-6">
          {loading ? "Adding..." : "Add Route"}
        </button>
      </form>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="bg-white rounded-xl shadow divide-y">
        {routes.map((r) => (
          <div key={r.id} className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-medium">{r.source} → {r.destination}</span>
              <div className="text-xs text-gray-500">
                {r.pickupPoint ? `Pickup: ${r.pickupPoint}` : "Pickup: default route start"}
                {" · "}
                {r.dropPoint ? `Drop: ${r.dropPoint}` : "Drop: default route end"}
              </div>
              <a href={`/admin/trips?routeId=${encodeURIComponent(r.id)}`} className="mt-1 inline-block text-xs font-semibold text-brand-700 hover:text-brand-900">
                {r.scheduledTripCount} scheduled trip{r.scheduledTripCount === 1 ? "" : "s"} · View trips →
              </a>
            </div>
            <div className="flex items-center gap-4 text-gray-500">
              <span>{r.distanceKm} km</span>
              <span>{r.durationMins} mins</span>
              <button type="button" onClick={() => handleRemove(r)} disabled={removingId === r.id} className="rounded-lg border border-red-200 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                {removingId === r.id ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        ))}
        {routes.length === 0 && <p className="p-4 text-gray-400">No routes added yet.</p>}
      </div>
    </div>
  );
}
