import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/formatDate";

export default async function AdminBusDetailsPage({ params }: { params: { id: string } }) {
  const bus = await prisma.bus.findUnique({
    where: { id: params.id },
    include: {
      trips: {
        where: { isActive: true },
        include: {
          route: true,
          vehicle: {
            select: {
              name: true,
              totalDecks: true,
              _count: { select: { seatTemplates: true } },
            },
          },
          _count: { select: { seats: true } },
        },
        orderBy: { travelDate: "desc" },
      },
    },
  });

  if (!bus || !bus.isActive) notFound();

  const layout = await prisma.vehicle.findFirst({
    where: { name: { equals: bus.busNumber, mode: "insensitive" }, isActive: true },
    select: {
      name: true,
      totalDecks: true,
      _count: { select: { seatTemplates: true } },
    },
  });

  const routes = Array.from(new Map(
    bus.trips.map((trip) => [`${trip.route.source.toLowerCase()}::${trip.route.destination.toLowerCase()}`, trip.route]),
  ).values());

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/admin" className="text-sm font-semibold text-brand-700 hover:text-brand-900">← Back to dashboard</Link>

      <section className="rounded-2xl bg-gray-950 p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Fleet · Bus details</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{bus.busNumber}</h1>
            <p className="mt-1 text-sm text-gray-300">{bus.operator} · {bus.type.replace(/_/g, " ")} · {bus.totalSeats} seats</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/bus/create?busNumber=${encodeURIComponent(bus.busNumber)}`} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold hover:bg-brand-700">{layout ? "Edit seat layout" : "Create seat layout"}</Link>
            <Link href="/admin/trips" className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold hover:bg-gray-800">Schedule a trip</Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Seat layout</p>
          {layout ? (
            <>
              <p className="mt-2 text-lg font-semibold text-gray-950">{layout._count.seatTemplates > 0 ? "Layout ready" : "Layout has no seats"}</p>
              <p className="mt-1 text-sm text-gray-600">{layout._count.seatTemplates} seats · {layout.totalDecks} deck{layout.totalDecks === 1 ? "" : "s"}</p>
            </>
          ) : (
            <>
              <p className="mt-2 text-lg font-semibold text-amber-700">No layout saved for this bus</p>
              <p className="mt-1 text-sm text-gray-600">Create a layout with bus number {bus.busNumber} to attach it to this bus.</p>
            </>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Routes connected through trips</p>
          {routes.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {routes.map((route) => (
                <li key={route.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <span className="font-medium text-gray-900">{route.source} → {route.destination}</span>
                  <span className="text-xs text-gray-500">{bus.trips.filter((trip) => trip.routeId === route.id).length} scheduled</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-gray-600">No routes are connected yet. Schedule a trip with this bus and a route to connect them.</p>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold text-gray-950">Scheduled trips for {bus.busNumber}</h2>
          <p className="mt-1 text-sm text-gray-500">Each trip below shows the exact route and seat layout assigned to this bus.</p>
        </div>
        <div className="divide-y">
          {bus.trips.map((trip) => (
            <div key={trip.id} className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center">
              <div>
                <p className="font-semibold text-gray-950">{trip.route.source} → {trip.route.destination}</p>
                <p className="text-xs text-gray-500">{trip.vehicle?.name.trim().toLowerCase() === bus.busNumber.trim().toLowerCase() ? "This bus's layout" : trip.vehicle?.name ? `Layout mismatch: ${trip.vehicle.name}` : "No layout assigned"}</p>
              </div>
              <p className="text-gray-600">{formatDate(trip.travelDate)}</p>
              <p className="text-gray-600">{formatDateTime(trip.departureTime)} – {formatDateTime(trip.arrivalTime)}</p>
              <p className="font-semibold text-brand-700">₹{trip.fare.toString()} · {trip._count.seats} seats</p>
            </div>
          ))}
          {bus.trips.length === 0 && <p className="px-5 py-8 text-center text-sm text-gray-500">No trips scheduled for this bus yet.</p>}
        </div>
      </section>
    </div>
  );
}
