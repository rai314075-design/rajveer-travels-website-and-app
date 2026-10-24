"use client";

import { useMemo, useState } from "react";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

type Deck = "LOWER" | "UPPER";
type SeatType = "SEATER" | "SLEEPER";
type Orientation = "VERTICAL" | "HORIZONTAL";
type Gender = "ANY" | "FEMALE" | "MALE";

type Seat = {
  seatNo: string;
  row: number;
  col: number;
  deck: Deck;
  type: SeatType;
  orientation: Orientation;
  price: number;
  genderRestriction: Gender;
  status: "AVAILABLE" | "LOCKED" | "BOOKED";
};
type SavedLayout = { id: string; busNumber: string; operator: string; description: string; layoutId: string | null; rows: number; cols: number; seatCount: number; decks: Deck[] };

const emptySeat = (row: number, col: number, deck: Deck): Seat => ({
  seatNo: `${row + 1}${String.fromCharCode(65 + col)}`,
  row,
  col,
  deck,
  type: "SEATER",
  orientation: "VERTICAL",
  price: 0,
  genderRestriction: "ANY",
  status: "AVAILABLE",
});

export default function CreateBusLayoutPage() {
  const searchParams = useSearchParams();
  const [bus, setBus] = useState({ busNumber: searchParams.get("busNumber") || "", operator: "Rajveer Travels", description: "" });
  const [rows, setRows] = useState(8);
  const [cols, setCols] = useState(5);
  const [activeDeck, setActiveDeck] = useState<Deck>("LOWER");
  const [decks, setDecks] = useState<Deck[]>(["LOWER"]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedBusId, setSavedBusId] = useState<string | null>(null);
  const [deletingLayoutId, setDeletingLayoutId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([]);

  useEffect(() => {
    fetch("/api/admin/bus").then((response) => response.ok ? response.json() : []).then(setSavedLayouts).catch(() => setSavedLayouts([]));
  }, []);

  const selectedSeat = useMemo(
    () => seats.find((seat) => `${seat.deck}-${seat.row}-${seat.col}` === selectedKey),
    [seats, selectedKey]
  );

  function resize(nextRows: number, nextCols: number) {
    setRows(nextRows);
    setCols(nextCols);
    setSeats((current) => current.filter((seat) => seat.row < nextRows && seat.col < nextCols));
    setSelectedKey(null);
  }

  function toggleDeck(deck: Deck) {
    setDecks((current) => {
      if (current.includes(deck) && current.length === 1) return current;
      return current.includes(deck) ? current.filter((item) => item !== deck) : [...current, deck];
    });
    setActiveDeck(deck);
  }

  function loadSleeperExample() {
    const exampleSeats: Seat[] = [];
    for (let row = 0; row < 6; row += 1) {
      exampleSeats.push(
        { ...emptySeat(row, 0, "LOWER"), seatNo: `${row + 1}A`, type: "SLEEPER", price: 1400 },
        { ...emptySeat(row, 1, "LOWER"), seatNo: `${row + 1}B`, type: "SLEEPER", price: 1400 },
        { ...emptySeat(row, 3, "UPPER"), seatNo: `${row + 1}U`, type: "SLEEPER", price: 1400 }
      );
    }
    setBus({ busNumber: "EXAMPLE-2P1", operator: "Rajveer Travels", description: "Example 2+1 AC sleeper layout" });
    setRows(6);
    setCols(5);
    setDecks(["LOWER", "UPPER"]);
    setActiveDeck("LOWER");
    setSeats(exampleSeats);
    setSelectedKey(null);
    setMessage({ type: "success", text: "Example loaded. Review it, change the bus number, then save." });
  }

  function selectCell(row: number, col: number) {
    const key = `${activeDeck}-${row}-${col}`;
    const existing = seats.find((seat) => `${seat.deck}-${seat.row}-${seat.col}` === key);
    if (!existing) setSeats((current) => [...current, emptySeat(row, col, activeDeck)]);
    setSelectedKey(key);
  }

  function updateSelected(field: keyof Seat, value: string | number) {
    if (!selectedKey) return;
    setSeats((current) => current.map((seat) => {
      if (`${seat.deck}-${seat.row}-${seat.col}` !== selectedKey) return seat;
      return { ...seat, [field]: value } as Seat;
    }));
  }

  function removeSelected() {
    if (!selectedKey) return;
    setSeats((current) => current.filter((seat) => `${seat.deck}-${seat.row}-${seat.col}` !== selectedKey));
    setSelectedKey(null);
  }

  async function saveLayout(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/bus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...bus, rows, cols, decks, seats }),
      });
      const data = await response.json().catch(() => null);
      setSavedBusId(response.ok ? data.bus.id : null);
      if (response.ok) {
        setSavedLayouts((current) => [{ ...data.bus, layoutId: data.layout.id, rows: data.layout.rows, cols: data.layout.cols, seatCount: data.layout.seats.length, decks: data.layout.decks }, ...current.filter((item) => item.id !== data.bus.id)]);
      }
      setMessage(response.ok
        ? { type: "success", text: `Layout saved for ${data.bus.busNumber}` }
        : { type: "error", text: data?.error?.formErrors?.join(", ") || data?.error || "Could not save layout" });
    } catch {
      setSavedBusId(null);
      setMessage({ type: "error", text: "Could not connect to the server. Check your admin session and MongoDB configuration." });
    } finally {
      setSaving(false);
    }
  }

  async function deleteLayout(item: SavedLayout) {
    if (!item.layoutId || !window.confirm(`Delete the seat layout for bus ${item.busNumber}?\n\nIt will be permanently removed from the website and trip setup. The bus record will stay, but it will need a new layout before it can be scheduled. This cannot be undone.`)) return;

    setDeletingLayoutId(item.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/bus?busNumber=${encodeURIComponent(item.busNumber)}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Could not delete layout");

      setSavedLayouts((current) => current.map((saved) => saved.id === item.id
        ? { ...saved, layoutId: null, rows: 0, cols: 0, seatCount: 0, decks: [] }
        : saved));
      if (savedBusId === item.id) setSavedBusId(null);
      setMessage({ type: "success", text: `Layout permanently deleted for ${item.busNumber}. The bus still needs a layout before it can be scheduled.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not delete layout" });
    } finally {
      setDeletingLayoutId(null);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Admin management</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-950">Create bus layout</h1>
        <p className="mt-1 text-sm text-gray-500">Click any grid cell to place a seat. Leave cells empty to create aisles and walking space.</p>
                <button type="button" onClick={loadSleeperExample} className="mt-3 rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">Load 2+1 sleeper example</button>
        <div className="mt-4 grid gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-950 md:grid-cols-3">
          <p><strong>1. Choose the bus.</strong><br />Use the same bus number shown in Manage Buses.</p>
          <p><strong>2. Build its seats.</strong><br />Select a deck, then click grid cells to add seats. Leave empty cells for aisles.</p>
          <p><strong>3. Assign a trip.</strong><br />Save the layout, then select that bus and layout in Trips &amp; Dates.</p>
        </div>
      </div>

      {savedLayouts.length > 0 && <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Fleet mapping</p><h2 className="mt-1 text-lg font-semibold">Saved bus layouts</h2></div><span className="text-sm text-gray-500">{savedLayouts.length} bus{savedLayouts.length === 1 ? "" : "es"}</span></div><div className="mt-4 grid gap-3 md:grid-cols-2">{savedLayouts.map((item) => <div key={item.id} className="rounded-xl border border-gray-200 p-4"><div className="flex items-center justify-between gap-2"><p className="font-semibold text-gray-950 truncate min-w-0">{item.busNumber}</p><span className={`rounded-full px-2 py-1 text-xs font-semibold whitespace-nowrap shrink-0 ${item.layoutId ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{item.layoutId ? "Layout ready" : "Needs layout"}</span></div><p className="mt-1 text-xs text-gray-500">{item.operator}{item.layoutId ? ` · ${item.seatCount} seats · ${item.rows} × ${item.cols} grid` : " · No saved layout"}</p><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2"><button type="button" onClick={() => { setBus({ busNumber: item.busNumber, operator: item.operator, description: item.description }); setSavedBusId(item.id); }} className="text-sm font-semibold text-brand-700 hover:text-brand-900">{item.layoutId ? "Edit this bus layout" : "Create layout"}</button>{item.layoutId && <button type="button" disabled={deletingLayoutId === item.id} onClick={() => deleteLayout(item)} className="text-sm font-semibold text-red-600 hover:text-red-800 disabled:cursor-wait disabled:opacity-50">{deletingLayoutId === item.id ? "Deleting..." : "Delete layout"}</button>}</div></div>)}</div></section>}

      <form onSubmit={saveLayout} className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-3 overflow-hidden">
        <div className="md:col-span-3"><h2 className="font-semibold text-gray-950">Step 1: Identify this bus</h2><p className="mt-1 text-xs text-gray-500">The bus number connects this seat layout to the bus you choose when scheduling a trip.</p></div>
        <label className="block text-sm font-medium text-gray-700">Bus number<input required value={bus.busNumber} onChange={(e) => setBus({ ...bus, busNumber: e.target.value })} placeholder="Use the exact number, e.g. RJ-101" className="mt-1 box-border w-full max-w-full min-w-0 rounded-lg border px-3 py-2" /></label>
        <label className="block text-sm font-medium text-gray-700">Operator<input required value={bus.operator} onChange={(e) => setBus({ ...bus, operator: e.target.value })} placeholder="Operator name" className="mt-1 box-border w-full max-w-full min-w-0 rounded-lg border px-3 py-2" /></label>
        <label className="block text-sm font-medium text-gray-700">Description <span className="font-normal text-gray-500">(optional)</span><input value={bus.description} onChange={(e) => setBus({ ...bus, description: e.target.value })} placeholder="Bus description" className="mt-1 box-border w-full max-w-full min-w-0 rounded-lg border px-3 py-2" /></label>
        <div className="flex items-center gap-2 text-sm md:col-span-2 flex-wrap">
          <span className="font-semibold">Grid</span>
          <input type="number" min={1} max={20} value={rows} onChange={(e) => resize(Number(e.target.value), cols)} className="box-border w-16 rounded-lg border px-3 py-2" aria-label="Rows" />
          <span className="font-semibold whitespace-nowrap">rows ×</span>
          <input type="number" min={1} max={12} value={cols} onChange={(e) => resize(rows, Number(e.target.value))} className="box-border w-16 rounded-lg border px-3 py-2" aria-label="Columns" />
          <span className="whitespace-nowrap">columns</span>
        </div>
        <button disabled={saving} className="box-border min-w-0 rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{saving ? "Saving..." : "Save bus layout"}</button>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 sm:flex sm:items-center sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">This layout belongs to</p><p className="mt-1 font-semibold text-gray-950">{bus.busNumber.trim() || "Enter a bus number above"}</p></div>
        <p className="mt-2 text-sm text-gray-600 sm:mt-0 sm:max-w-xl sm:text-right">When scheduling a trip, choose this same bus number and its layout, then select the route and travel date.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Front / driver</p><h2 className="mt-1 text-lg font-semibold">{activeDeck} deck canvas</h2></div>
            <div className="flex gap-2">
              {(["LOWER", "UPPER"] as Deck[]).map((deck) => <button key={deck} type="button" onClick={() => toggleDeck(deck)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeDeck === deck ? "bg-brand-600 text-white" : "border text-gray-600"}`}>{deck}</button>)}
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border-4 border-gray-300 bg-white p-3 shadow-inner sm:overflow-visible">
            <div className="mx-auto grid gap-2 sm:min-w-[540px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {Array.from({ length: rows * cols }, (_, index) => {
                const row = Math.floor(index / cols);
                const col = index % cols;
                const key = `${activeDeck}-${row}-${col}`;
                const seat = seats.find((item) => `${item.deck}-${item.row}-${item.col}` === key);
                const aisle = col === Math.floor(cols / 2);
                return <button key={key} type="button" onClick={() => selectCell(row, col)} className={`min-h-12 sm:min-h-16 rounded-lg border-2 px-1 sm:p-2 text-center text-xs sm:text-[10px] transition ${selectedKey === key ? "border-blue-600 bg-blue-100 shadow-[0_0_0_4px_rgba(37,99,235,0.28)]" : seat ? seat.type === "SLEEPER" ? "border-amber-400 bg-amber-100" : "border-blue-300 bg-blue-50" : aisle ? "border-transparent bg-gray-100 text-gray-400" : "border-dashed border-gray-200 bg-gray-50 text-gray-400"}`}><span className="block sm:truncate font-semibold text-[9px] sm:text-xs">{seat?.seatNo || (aisle ? "AISLE" : "+ Add seat")}</span>{seat && <span className="mt-0.5 sm:mt-1 block text-[9px] sm:text-xs uppercase">{seat.type}</span>}</button>;
              })}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600"><span><i className="mr-1 inline-block h-3 w-3 rounded bg-blue-100" />Seater</span><span><i className="mr-1 inline-block h-3 w-3 rounded bg-amber-100" />Sleeper</span><span><i className="mr-1 inline-block h-3 w-3 rounded bg-gray-100" />Aisle / empty</span></div>
        </section>

        <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Seat settings</p>
          {selectedSeat ? <div className="mt-4 space-y-3">
            <p className="text-sm text-gray-500">Editing {selectedSeat.seatNo} · row {selectedSeat.row + 1}, column {selectedSeat.col + 1}</p>
            <label className="block text-sm font-medium">Seat number<input value={selectedSeat.seatNo} onChange={(e) => updateSelected("seatNo", e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
            <label className="block text-sm font-medium">Type<select value={selectedSeat.type} onChange={(e) => updateSelected("type", e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="SEATER">Seater</option><option value="SLEEPER">Sleeper</option></select></label>
            <label className="block text-sm font-medium">Orientation<select value={selectedSeat.orientation} onChange={(e) => updateSelected("orientation", e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="VERTICAL">Vertical</option><option value="HORIZONTAL">Horizontal</option></select></label>
            <label className="block text-sm font-medium">Price<input type="number" min={0} value={selectedSeat.price} onChange={(e) => updateSelected("price", Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
            <label className="block text-sm font-medium">Gender restriction<select value={selectedSeat.genderRestriction} onChange={(e) => updateSelected("genderRestriction", e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="ANY">Anyone</option><option value="FEMALE">Women only</option><option value="MALE">Men only</option></select></label>
            <button type="button" onClick={removeSelected} className="w-full rounded-lg border border-red-200 px-4 py-2 font-semibold text-red-600 hover:bg-red-50">Mark as empty aisle</button>
          </div> : <p className="mt-4 text-sm text-gray-500">Click an empty grid cell to add a seat, or click an existing seat to edit it.</p>}
          {message && <p className={`mt-4 rounded-lg p-3 text-sm ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>}
          {savedBusId && <a href={`/bus/${savedBusId}/select-seats`} className="mt-3 block rounded-lg border border-brand-200 px-4 py-2 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50">Open user seat preview</a>}
        </aside>
      </div>
    </main>
  );
}
