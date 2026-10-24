"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  SeatTemplate,
  Deck,
  SeatType,
  PresetLayout,
} from "@/types/seat";

interface LayoutBuilderProps {
  vehicleId: string;
  preset?: PresetLayout;
}

/**
 * Admin Layout Builder — Interactive CSS Grid editor for seat templates.
 *
 * Features:
 * - Lower/Upper deck tabs
 * - Add/remove seats with configurable position, spans, and type
 * - Apply preset layouts
 * - Real-time preview of the seat grid
 * - Save to backend via API
 */
export function LayoutBuilder({ vehicleId, preset }: LayoutBuilderProps) {
  const [activeDeck, setActiveDeck] = useState<Deck>("LOWER");
  const [seatTemplates, setSeatTemplates] = useState<SeatTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state for adding/editing a seat
  const [form, setForm] = useState({
    seatNumber: "",
    deck: "LOWER" as Deck,
    type: "SEAT" as SeatType,
    rowSpan: 1,
    colSpan: 1,
    xPosition: 0,
    yPosition: 0,
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  // Load existing templates for this vehicle
  useEffect(() => {
    async function loadTemplates() {
      const res = await fetch(`/api/templates?vehicleId=${vehicleId}`);
      if (res.ok) {
        const data = await res.json();
        setSeatTemplates(data);
      }
      setLoading(false);
    }
    loadTemplates();
  }, [vehicleId]);

  // Apply preset when provided
  useEffect(() => {
    if (preset && seatTemplates.length === 0) {
      const withIds = preset.seats.map((s, i) => ({
        ...s,
        id: `temp-${i}`,
        vehicleId,
      }));
      setSeatTemplates(withIds);
    }
  }, [preset, vehicleId, seatTemplates.length]);

  // --- Grid dimension computation ---------------------------------------
  // Determine the CSS grid size based on the seat positions.
  const activeSeats = seatTemplates.filter((s) => s.deck === activeDeck);
  const maxX = Math.max(
    ...activeSeats.map((s) => s.xPosition + s.colSpan),
    5
  );
  const maxY = Math.max(
    ...activeSeats.map((s) => s.yPosition + s.rowSpan),
    1
  );

  const gridCols = Math.max(maxX, 10);
  const gridRows = Math.max(maxY, 10);

  // --- Actions ----------------------------------------------------------

  const applyPreset = useCallback(async (p: PresetLayout) => {
    // Clear existing templates on server first
    const templates = await (await fetch(`/api/templates?vehicleId=${vehicleId}`)).json();
    for (const template of templates) {
      await fetch(`/api/templates/${template.id}`, {
        method: "DELETE",
      });
    }

    // Then create new ones
    for (const s of p.seats) {
      await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...s, vehicleId }),
      });
    }

    // Fetch updated templates to get actual IDs
    const res = await fetch(`/api/templates?vehicleId=${vehicleId}`);
    const updatedTemplates = await res.json();
    setSeatTemplates(updatedTemplates);
    showMessage("success", `Applied preset: ${p.name}`);
  }, [vehicleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingId) {
        // Update existing
        await fetch(`/api/templates/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        setSeatTemplates((prev) =>
          prev.map((s) => (s.id === editingId ? { ...s, ...form } : s))
        );
        showMessage("success", "Seat updated");
      } else {
        // Create new
        const res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, vehicleId }),
        });

        if (res.ok) {
          const newTemplate = await res.json();
          setSeatTemplates((prev) => [...prev, newTemplate]);
          showMessage("success", "Seat added");
        } else {
          throw new Error("Failed to create seat");
        }
      }

      // Reset form
      setForm({
        seatNumber: "",
        deck: activeDeck,
        type: "SEAT",
        rowSpan: 1,
        colSpan: 1,
        xPosition: 0,
        yPosition: 0,
      });
      setEditingId(null);
    } catch (err) {
      showMessage("error", "Failed to save seat");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (seat: SeatTemplate) => {
    setForm({
      seatNumber: seat.seatNumber,
      deck: seat.deck,
      type: seat.type,
      rowSpan: seat.rowSpan,
      colSpan: seat.colSpan,
      xPosition: seat.xPosition,
      yPosition: seat.yPosition,
    });
    setEditingId(seat.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this seat?")) return;

    try {
      await fetch(`/api/templates/${id}`, { method: "DELETE" });
      setSeatTemplates((prev) => prev.filter((s) => s.id !== id));
      showMessage("success", "Seat deleted");
    } catch {
      showMessage("error", "Failed to delete seat");
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // --- Render -----------------------------------------------------------

  if (loading) {
    return <div className="p-4 text-gray-500">Loading templates...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-6">
      {/* Deck Tabs */}
      <div className="flex gap-2 border-b">
        {(["LOWER", "UPPER"] as Deck[]).map((deck) => (
          <button
            key={deck}
            onClick={() => setActiveDeck(deck)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeDeck === deck
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {deck} Deck
          </button>
        ))}
      </div>

      {/* Form + Presets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-semibold text-lg">
            {editingId ? "Edit Seat" : "Add Seat"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              placeholder="Seat number (e.g., 1A)"
              value={form.seatNumber}
              onChange={(e) =>
                setForm({ ...form, seatNumber: e.target.value })
              }
              required
              className="border border-gray-300 rounded-lg px-3 py-2.5 w-full text-sm"
            />
            <p className="-mt-2 text-xs text-gray-500">Use a unique label such as 1A, 1B, or 1U.</p>

            <select
              value={form.deck}
              onChange={(e) =>
                setForm({ ...form, deck: e.target.value as Deck })
              }
              className="border border-gray-300 rounded-lg px-3 py-2.5 w-full text-sm"
            >
              <option value="LOWER">Lower Deck</option>
              <option value="UPPER">Upper Deck</option>
            </select>

            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as SeatType })
              }
              className="border border-gray-300 rounded-lg px-3 py-2.5 w-full text-sm"
            >
              <option value="SEAT">Seat</option>
              <option value="SLEEPER">Sleeper</option>
            </select>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Row span</label>
                <input
                  type="number"
                  min={1}
                  max={3}
                  placeholder="Row span"
                  value={form.rowSpan}
                  onChange={(e) =>
                    setForm({ ...form, rowSpan: parseInt(e.target.value) })
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2.5 w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Col span</label>
                <input
                  type="number"
                  min={1}
                  max={3}
                  placeholder="Col span"
                  value={form.colSpan}
                  onChange={(e) =>
                    setForm({ ...form, colSpan: parseInt(e.target.value) })
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2.5 w-full text-sm"
                />
              </div>
            </div>
            <p className="-mt-2 text-xs text-gray-500">Position 0 starts at the front-left grid cell.</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">X position (col)</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  placeholder="X position (col)"
                  value={form.xPosition}
                  onChange={(e) =>
                    setForm({ ...form, xPosition: parseInt(e.target.value) })
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2.5 w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Y position (row)</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  placeholder="Y position (row)"
                  value={form.yPosition}
                  onChange={(e) =>
                    setForm({ ...form, yPosition: parseInt(e.target.value) })
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2.5 w-full text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 min-w-[120px] bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Add"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      seatNumber: "",
                      deck: activeDeck,
                      type: "SEAT",
                      rowSpan: 1,
                      colSpan: 1,
                      xPosition: 0,
                      yPosition: 0,
                    });
                    setEditingId(null);
                  }}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* Preset Buttons */}
          <div className="border-t pt-4 space-y-2">
            <h4 className="font-medium text-sm">Apply Preset</h4>
            <button
              onClick={() => applyPreset(preset!)}
              disabled={!preset}
              className="w-full text-left px-3 py-2.5 border rounded-lg hover:bg-gray-50 text-sm"
            >
              {preset?.name || "Select a preset first"}
            </button>
          </div>
        </div>

        {/* Right: Grid Preview */}
        <div className="lg:col-span-2">
          <h3 className="font-semibold mb-3 text-lg">
            {activeDeck} Deck Preview
          </h3>
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Front / driver</p>

          {/* Grid Container */}
          <div
            className="border rounded-lg bg-gray-50 p-3 sm:p-4 relative overflow-x-auto"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${gridCols}, minmax(32px, 1fr))`,
              gridTemplateRows: `repeat(${gridRows}, minmax(32px, 1fr))`,
              minHeight: "240px",
              gap: "4px sm:gap-2",
            }}
          >
            {/* Grid background lines */}
            {[...Array(gridRows)].map((_, rowIdx) =>
              [...Array(gridCols)].map((_, colIdx) => (
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

            {/* Seat items */}
            {seatTemplates
              .filter((s) => s.deck === activeDeck)
              .map((seat) => (
                <div
                  key={seat.id}
                  onClick={() => handleEdit(seat)}
                  style={{
                    gridColumn: `${seat.xPosition + 1} / span ${seat.colSpan}`,
                    gridRow: `${seat.yPosition + 1} / span ${seat.rowSpan}`,
                    minHeight: "40px",
                  }}
                  className={`
                    relative flex items-center justify-center cursor-pointer
                    rounded border-2 transition-all
                    ${
                      editingId === seat.id
                        ? "bg-blue-100 border-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.35)]"
                        : seat.type === "SLEEPER"
                        ? "bg-amber-100 border-amber-400"
                        : "bg-blue-100 border-blue-400"
                    }
                  `}
                  title={seat.seatNumber}
                >
                  <span className="text-xs font-medium">
                    {seat.seatNumber}
                    {seat.type === "SLEEPER" && " 🛏"}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(seat.id);
                    }}
                    className="absolute top-0 right-0 m-1 p-1 text-red-500 hover:bg-red-100 rounded text-xs"
                    aria-label="Delete seat"
                  >
                    ×
                  </button>
                </div>
              ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-400 rounded"></div>
              <span>Seat</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-100 border border-amber-400 rounded"></div>
              <span>Sleeper</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
              <span>Empty</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast message */}
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