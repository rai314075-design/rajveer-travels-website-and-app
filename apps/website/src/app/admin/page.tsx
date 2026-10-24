import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AdminBookingActions from "./AdminBookingActions";

export default async function AdminDashboard() {
  const [busCount, routeCount, tripCount, bookingCount, upcomingTrips, recentBookings, fleetBuses, fleetLayouts] = await Promise.all([
    prisma.bus.count({ where: { isActive: true } }),
    prisma.route.count({ where: { isActive: true } }),
    prisma.trip.count({ where: { isActive: true } }),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.trip.findMany({
      where: { isActive: true, departureTime: { gte: new Date() } },
      include: { bus: true, route: true },
      orderBy: { departureTime: "asc" },
      take: 4,
    }),
    prisma.booking.findMany({
      include: { user: true, trip: { include: { route: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.bus.findMany({
      where: { isActive: true },
      select: {
        id: true,
        busNumber: true,
        type: true,
        totalSeats: true,
        trips: {
          where: { isActive: true },
          select: { id: true, route: { select: { source: true, destination: true } } },
        },
      },
      orderBy: { busNumber: "asc" },
    }),
    prisma.vehicle.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        totalDecks: true,
        _count: { select: { seatTemplates: true } },
      },
    }),
  ]);

  const layoutByBusNumber = new Map(fleetLayouts.map((layout) => [layout.name.trim().toLowerCase(), layout]));

  const stats = [
    { label: "Buses", value: busCount, href: "/admin/buses" },
    { label: "Routes", value: routeCount, href: "/admin/routes" },
    { label: "Scheduled Trips", value: tripCount, href: "/admin/trips" },
    { label: "Confirmed Bookings", value: bookingCount, href: "/admin/bookings" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-gray-950 px-6 py-7 text-white md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">Operations centre</p>
          <h1 className="mt-2 text-3xl font-bold">Good day, admin.</h1>
          <p className="mt-1 text-sm text-gray-300">Keep the fleet, routes, and bookings moving from one place.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/buses" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold hover:bg-brand-700">Add bus</Link>
          <Link href="/admin/trips" className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold hover:bg-gray-800">Schedule trip</Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s, index) => (
          <Link key={s.label} href={s.href} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
            <p className={`text-3xl font-bold ${index === 0 ? "text-brand-700" : "text-gray-950"}`}>{s.value}</p>
            <p className="mt-1 flex items-center justify-between text-sm text-gray-500"><span>{s.label}</span><span aria-hidden="true">→</span></p>
          </Link>
        ))}
      </div>
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Fleet overview</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-950">Bus setup & route assignments</h2>
            <p className="mt-1 max-w-3xl text-sm text-gray-500">A layout is matched by bus number. A route is connected to a bus when you schedule a trip using that bus and route. Select any bus card for its details.</p>
          </div>
          <Link href="/admin/buses" className="text-sm font-semibold text-brand-700 hover:text-brand-900">Manage all buses →</Link>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {fleetBuses.map((bus) => {
            const layout = layoutByBusNumber.get(bus.busNumber.trim().toLowerCase());
            const routes = bus.trips.reduce((summary, trip) => {
              const key = `${trip.route.source.toLowerCase()}::${trip.route.destination.toLowerCase()}`;
              const current = summary.get(key);
              summary.set(key, current
                ? { ...current, trips: current.trips + 1 }
                : { source: trip.route.source, destination: trip.route.destination, trips: 1 });
              return summary;
            }, new Map<string, { source: string; destination: string; trips: number }>());

            return (
              <Link key={bus.id} href={`/admin/buses/${bus.id}`} className="group rounded-xl border border-gray-200 p-4 transition hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-950">{bus.busNumber}</p>
                    <p className="mt-1 text-xs text-gray-500">{bus.type.replace(/_/g, " ")} · {bus.totalSeats} bus seats</p>
                  </div>
                  <span className="text-sm font-semibold text-brand-700 group-hover:text-brand-900">View bus →</span>
                </div>
                <div className="mt-3">
                  {layout ? (
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${layout._count.seatTemplates > 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                      {layout._count.seatTemplates > 0 ? `Layout ready · ${layout._count.seatTemplates} seats · ${layout.totalDecks} deck${layout.totalDecks === 1 ? "" : "s"}` : "Layout saved · no seats configured"}
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Layout needed</span>
                  )}
                  <p className="mt-1 text-sm text-gray-600">
                    {routes.size > 0
                      ? Array.from(routes.values()).map((route) => `${route.source} → ${route.destination} · ${route.trips} trip${route.trips === 1 ? "" : "s"}`).join(" · ")
                      : "No route assigned yet. Schedule a trip to connect this bus to a route."}
                  </p>
                </div>
              </Link>
            );
          })}
          {fleetBuses.length === 0 && <p className="rounded-xl border border-dashed border-gray-300 px-5 py-8 text-center text-sm text-gray-500 lg:col-span-2">No buses yet. Add a bus to start setting up the fleet.</p>}
        </div>
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4"><h2 className="font-semibold">Upcoming departures</h2><Link href="/admin/trips" className="text-sm font-medium text-brand-700">View all</Link></div>
          <div className="divide-y">
            {upcomingTrips.map((trip) => <div key={trip.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="font-medium">{trip.route.source} → {trip.route.destination}</p><p className="text-xs text-gray-500">{trip.bus.busNumber} · {trip.departureTime.toLocaleString()}</p></div><span className="text-sm font-semibold text-gray-700">₹{trip.fare.toString()}</span></div>)}
            {upcomingTrips.length === 0 && <p className="px-5 py-6 text-sm text-gray-500">No upcoming trips scheduled.</p>}
          </div>
        </section>
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4"><h2 className="font-semibold">Recent bookings</h2><Link href="/admin/bookings" className="text-sm font-medium text-brand-700">View all bookings</Link></div>
          <AdminBookingActions bookings={recentBookings.map((booking) => ({ id: booking.id, status: booking.status, name: booking.user.name, phone: booking.user.phone, source: booking.trip.route.source, destination: booking.trip.route.destination }))} />
        </section>
      </div>
    </div>
  );
}
