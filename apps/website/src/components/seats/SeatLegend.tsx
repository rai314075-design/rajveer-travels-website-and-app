/**
 * SeatLegend — Color-coded legend explaining the seat states.
 */
export function SeatLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-sm mb-4">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-blue-50 border border-blue-200 rounded"></div>
        <span>Available Seat</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-amber-50 border border-amber-200 rounded"></div>
        <span>Available Sleeper</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-brand-100 border border-brand-400 rounded"></div>
        <span>Selected</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-yellow-100 border border-yellow-300 rounded"></div>
        <span>Locked (10 min)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded border border-red-700 bg-red-600"></div>
        <span>Booked</span>
      </div>
    </div>
  );
}