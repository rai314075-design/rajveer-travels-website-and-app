"use client";

import { useEffect, useState } from "react";
import { LayoutBuilder } from "@/components/admin/LayoutBuilder";
import { PresetLayout } from "@/types/seat";

interface Vehicle {
  id: string;
  name: string;
  totalDecks: number;
}

export default function AdminLayoutBuilderPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [presets, setPresets] = useState<PresetLayout[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [vehicleForm, setVehicleForm] = useState({ name: "", totalDecks: 1 });
  const [creatingVehicle, setCreatingVehicle] = useState(false);
  const [removingVehicle, setRemovingVehicle] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [vehiclesRes, presetsRes] = await Promise.all([
        fetch("/api/vehicles"),
        fetch("/api/templates/preset"),
      ]);

      const vehiclesData = await vehiclesRes.json();
      const presetsData = await presetsRes.json();

      setVehicles(vehiclesData);
      setPresets(presetsData);
      setSelectedPreset(presetsData[0]?.id || "");

      // Auto-select first vehicle if available
      if (vehiclesData.length > 0) {
        setSelectedVehicle(vehiclesData[0].id);
      }

      setIsLoading(false);
    }

    loadData();
  }, []);

  async function handleCreateVehicle(e: React.FormEvent) {
    e.preventDefault();
    setCreatingVehicle(true);
    setError("");
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vehicleForm),
    });
    const data = await res.json().catch(() => null);
    setCreatingVehicle(false);
    if (!res.ok) {
      setError(data?.error?.formErrors?.join(", ") || "Failed to create vehicle");
      return;
    }
    setVehicles((current) => [data, ...current]);
    setSelectedVehicle(data.id);
    setVehicleForm({ name: "", totalDecks: 1 });
  }

  async function handleRemoveVehicle() {
    if (!selectedVehicle || !window.confirm("Remove this vehicle and its seat layout?")) return;
    setRemovingVehicle(true);
    setError("");
    const res = await fetch(`/api/vehicles/${selectedVehicle}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    setRemovingVehicle(false);
    if (!res.ok) {
      setError(data?.error || "This vehicle cannot be removed while it is in use.");
      return;
    }
    const remaining = vehicles.filter((vehicle) => vehicle.id !== selectedVehicle);
    setVehicles(remaining);
    setSelectedVehicle(remaining[0]?.id || null);
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Layout Builder</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Seat configuration</p>
        <h1 className="text-3xl font-bold text-gray-950">Layout Builder</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">Build a RedBus-style cabin map with lower and upper decks, individual seats, and sleeper berths.</p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-950">How to create a bus layout</h2>
        <div className="mt-4 grid gap-4 text-sm text-gray-600 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="font-semibold text-gray-900">1. Create the vehicle</p>
            <p className="mt-1">Enter a name such as “Volvo Sleeper 36” and choose one or two decks.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">2. Start with a preset</p>
            <p className="mt-1">Choose 2+2 Seater, 2+1 Sleeper, or 3+1 Sleeper, then press Apply Preset.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">3. Add or edit seats</p>
            <p className="mt-1">Select Seat or Sleeper, choose the deck, enter a label like 1A, and set its grid position.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">4. Check both decks</p>
            <p className="mt-1">Use the Lower Deck and Upper Deck tabs. Click any tile to edit it or use × to remove it.</p>
          </div>
        </div>
        <p className="mt-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-900">
          Tip: X position moves a seat across the row, Y position moves it down the bus, and row/column span controls the size of a sleeper berth.
        </p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Example layout</p>
            <h2 className="text-lg font-semibold text-gray-950">2+2 seater cabin</h2>
          </div>
          <p className="text-xs text-gray-500">Front / driver is at the top</p>
        </div>
        <div className="mx-auto mt-4 max-w-lg rounded-2xl border-4 border-gray-300 bg-white p-4 shadow-inner">
          <div className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Front / driver</div>
          <div className="grid grid-cols-5 gap-2">
            {[
              "1A", "1B", "", "1C", "1D",
              "2A", "2B", "", "2C", "2D",
              "3A", "3B", "", "3C", "3D",
              "4A", "4B", "", "4C", "4D",
            ].map((label, index) => (
              <div
                key={`${label}-${index}`}
                className={`flex min-h-12 items-center justify-center rounded-lg text-xs font-semibold ${label ? "border-2 border-blue-300 bg-blue-50 text-blue-900" : "bg-gray-100"}`}
              >
                {label || "AISLE"}
              </div>
            ))}
          </div>
        </div>
      </section>

      <form onSubmit={handleCreateVehicle} className="grid gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 md:grid-cols-[1fr_180px_auto] md:items-end">
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-800">Create a bus layout</label>
          <input
            value={vehicleForm.name}
            onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
            placeholder="Layout name, e.g. Volvo Sleeper 36"
            required
            className="w-full rounded-lg border bg-white px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-800">Decks</label>
          <select value={vehicleForm.totalDecks} onChange={(e) => setVehicleForm({ ...vehicleForm, totalDecks: Number(e.target.value) })} className="w-full rounded-lg border bg-white px-3 py-2">
            <option value={1}>Single deck</option>
            <option value={2}>Double deck</option>
          </select>
        </div>
        <button disabled={creatingVehicle} className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {creatingVehicle ? "Creating..." : "Create layout"}
        </button>
      </form>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {vehicles.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <p className="text-gray-500">Create a layout above to start adding seats and sleeper berths.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Vehicle Selector */}
          <div className="grid gap-4 bg-white rounded-xl shadow p-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold mb-2">1. Select bus layout</label>
              <div className="flex gap-2">
                <select value={selectedVehicle || ""} onChange={(e) => setSelectedVehicle(e.target.value)} className="min-w-0 flex-1 rounded-lg border px-3 py-2">
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.totalDecks} deck{v.totalDecks > 1 ? "s" : ""})</option>)}
                </select>
                <button type="button" onClick={handleRemoveVehicle} disabled={removingVehicle} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                  {removingVehicle ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">2. Choose a starting pattern</label>
              <select
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
              >
                {presets.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.description}</option>)}
              </select>
            </div>
          </div>

          {/* Layout Builder */}
          {selectedVehicle && (
            <LayoutBuilder
              vehicleId={selectedVehicle}
              preset={presets.find((p) => p.id === selectedPreset)}
            />
          )}
        </div>
      )}
    </div>
  );
}