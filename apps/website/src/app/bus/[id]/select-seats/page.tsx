"use client";

import { useEffect, useMemo, useState } from "react";

type Deck = "LOWER" | "UPPER";
type Seat = { _id?: string; seatNo: string; row: number; col: number; deck: Deck; type: "SEATER" | "SLEEPER"; orientation: "VERTICAL" | "HORIZONTAL"; price: number; genderRestriction: "ANY" | "FEMALE" | "MALE"; status: "AVAILABLE" | "LOCKED" | "BOOKED" };
type LayoutResponse = { bus: { id: string; busNumber: string; operator: string; description: string }; layout: { rows: number; cols: number; decks: Deck[]; seats: Seat[] } };

export default function SelectBusSeatsPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<LayoutResponse | null>(null);
  const [activeDeck, setActiveDeck] = useState<Deck>("LOWER");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/bus/${params.id}/layout`).then((response) => response.json()).then((result) => {
      if (result.layout) {
        setData(result);
        setActiveDeck(result.layout.decks[0] || "LOWER");
      } else setMessage(result.error || "Layout not available");
      setLoading(false);
    }).catch(() => { setMessage("Could not load this bus layout"); setLoading(false); });
  }, [params.id]);

  const activeSeats = useMemo(() => data?.layout.seats.filter((seat) => seat.deck === activeDeck) || [], [data, activeDeck]);
  const seatAt = (row: number, col: number) => activeSeats.find((seat) => seat.row === row && seat.col === col);
  const total = selected.reduce((sum, seatId) => sum + (data?.layout.seats.find((seat) => seat.seatNo === seatId && seat.deck === activeDeck)?.price || 0), 0);
  const selectedSeats = data?.layout.seats.filter((seat) => selected.includes(`${seat.deck}-${seat.seatNo}`)) || [];

  function toggleSeat(seat: Seat) {
    if (seat.status !== "AVAILABLE") return;
    const id = `${seat.deck}-${seat.seatNo}`;
    if (selected.includes(id)) {
      setSelected((current) => current.filter((item) => item !== id));
    } else if (selected.length < 6) {
      setSelected((current) => [...current, id]);
      setMessage("");
    } else {
      setMessage("You can select a maximum of 6 seats.");
    }
  }

  if (loading) return <main className="mx-auto max-w-5xl px-6 py-12 text-gray-500">Loading seat layout...</main>;
  if (!data) return <main className="mx-auto max-w-5xl px-6 py-12"><div className="rounded-xl bg-red-50 p-6 text-red-700">{message || "Bus layout not found"}</div></main>;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <a href="/search" className="text-sm font-semibold text-brand-700">← Back to buses</a>
        <div className="mt-4 rounded-2xl bg-gray-950 p-6 text-white shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Select seats</p>
          <h1 className="mt-2 text-3xl font-bold">{data.bus.operator} · {data.bus.busNumber}</h1>
          {data.bus.description && <p className="mt-3 max-w-2xl text-sm text-gray-300">{data.bus.description}</p>}
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Front / driver</p><h2 className="mt-1 text-xl font-bold">Choose your seat</h2></div>
              <div className="flex gap-2">{data.layout.decks.map((deck) => <button key={deck} type="button" onClick={() => setActiveDeck(deck)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeDeck === deck ? "bg-brand-600 text-white" : "border text-gray-600"}`}>{deck} deck</button>)}</div>
            </div>
            <div className="mt-5 overflow-x-auto rounded-2xl border-4 border-gray-300 bg-white p-4 shadow-inner">
              <div className="mx-auto grid min-w-[540px] gap-2" style={{ gridTemplateColumns: `repeat(${data.layout.cols}, minmax(70px, 1fr))` }}>
                {Array.from({ length: data.layout.rows * data.layout.cols }, (_, index) => {
                  const row = Math.floor(index / data.layout.cols);
                  const col = index % data.layout.cols;
                  const seat = seatAt(row, col);
                  const id = seat ? `${seat.deck}-${seat.seatNo}` : "";
                  const isSelected = selected.includes(id);
                  const disabled = !seat || seat.status !== "AVAILABLE";
                  return <button key={`${row}-${col}`} type="button" disabled={disabled} onClick={() => seat && toggleSeat(seat)} className={`relative min-h-16 rounded-lg border-2 p-2 text-center transition ${isSelected ? "border-blue-600 bg-blue-100 shadow-[0_0_0_4px_rgba(37,99,235,0.3)]" : seat?.status === "BOOKED" ? "border-red-700 bg-red-600 text-white" : seat?.type === "SLEEPER" ? "border-amber-400 bg-amber-100" : seat ? "border-blue-300 bg-blue-50" : col === Math.floor(data.layout.cols / 2) ? "border-transparent bg-gray-100" : "border-dashed border-gray-200 bg-gray-50"} ${disabled && seat ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5"}`}>{seat ? <><span className="block text-xs font-bold">{seat.seatNo}</span><span className="mt-1 block text-[10px] uppercase">{seat.status === "BOOKED" ? "Booked" : seat.type}</span></> : col === Math.floor(data.layout.cols / 2) ? <span className="text-[10px] text-gray-400">AISLE</span> : null}</button>;
                })}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600"><span><i className="mr-1 inline-block h-3 w-3 rounded bg-blue-100" />Available seater</span><span><i className="mr-1 inline-block h-3 w-3 rounded bg-amber-100" />Available sleeper</span><span><i className="mr-1 inline-block h-3 w-3 rounded bg-blue-600" />Selected</span><span><i className="mr-1 inline-block h-3 w-3 rounded bg-red-600" />Booked</span></div>
          </section>

          <aside className="sticky top-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Booking summary</p>
            <h2 className="mt-2 text-xl font-bold">{selected.length} / 6 seats</h2>
            <div className="mt-4 space-y-2">{selectedSeats.length ? selectedSeats.map((seat) => <div key={`${seat.deck}-${seat.seatNo}`} className="flex justify-between rounded-lg bg-blue-50 px-3 py-2 text-sm"><span className="font-semibold text-blue-900">{seat.seatNo} · {seat.type.toLowerCase()}</span><span>₹{seat.price}</span></div>) : <p className="text-sm text-gray-500">Select an available seat to add it here.</p>}</div>
            <div className="mt-5 border-t pt-4"><div className="flex justify-between text-sm text-gray-500"><span>Total fare</span><span className="text-xl font-bold text-brand-700">₹{total}</span></div><button type="button" disabled={!selected.length} onClick={() => setMessage("Seats selected. Continue to booking to confirm your reservation.")} className="mt-5 w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-300">Proceed to Book</button></div>
            {message && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
          </aside>
        </div>
      </div>
    </main>
  );
}
