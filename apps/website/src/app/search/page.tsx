import { prisma } from "@/lib/prisma";
import { getCustomSession } from "@/lib/session";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { source?: string; destination?: string; date?: string };
}) {
  const { source, destination, date } = searchParams;
  const user = await getCustomSession();
  const language = user?.language || "ENGLISH";
  const hindi = language === "HINDI";
  const canBook = Boolean(user?.phoneVerified && user?.emailVerified);

  const now = new Date();

  const trips = await prisma.trip.findMany({
    where: {
      ...(date && {
        travelDate: {
          gte: new Date(`${date}T00:00:00`),
          lte: new Date(`${date}T23:59:59`),
        },
      }),
      route: {
        isActive: true,
        ...(source && { source: { equals: source, mode: "insensitive" } }),
        ...(destination && { destination: { equals: destination, mode: "insensitive" } }),
      },
      bus: { isActive: true },
      isActive: true,
      departureTime: {
        gt: now,
      },
    },
    include: { bus: true, route: true },
    orderBy: { departureTime: "asc" },
  });

  return (
    <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Rajveer Travels</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-950">Book a bus</h1>
        <p className="mt-1 text-sm text-gray-500">Compare buses, choose your seat, and travel comfortably.</p>
      </div>

      {!canBook && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {hindi ? "आप बस का समय, मार्ग, जानकारी और किराया देख सकते हैं। बुकिंग के लिए लॉग इन या रजिस्टर करें, Auth0 में ईमेल सत्यापित करें और प्रोफ़ाइल में फोन OTP सत्यापित करें।" : "You can view bus times, routes, details, and prices. To book a bus, log in or register, verify your Gmail in Auth0, and verify your phone with the OTP in your profile."}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600">
          {source && destination && date ? `${source} → ${destination} · ${date}` : "Available buses"}
        </p>
        <p className="text-sm text-gray-500">{trips.length} result{trips.length === 1 ? "" : "s"}</p>
      </div>

      {trips.length === 0 && <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">{hindi ? "इस मार्ग और तारीख के लिए कोई बस नहीं मिली।" : "No buses found for this route/date."}</div>}

      <div className="space-y-4">
        {trips.map((trip) => (
          <div key={trip.id} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-gray-950">{trip.bus.operator} · {trip.bus.busNumber}</p>
                <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">{trip.bus.type.replace(/_/g, " ")}</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Starting from</p>
                <p className="text-2xl font-bold text-brand-700">₹{trip.fare.toString()}</p>
              </div>
            </div>
            {trip.bus.description && <p className="mt-2 max-w-xl text-sm text-gray-700">{trip.bus.description}</p>}
            <p className="mt-3 text-sm text-gray-600">
              {hindi ? "प्रस्थान" : "Departure"} {new Date(trip.departureTime).toLocaleTimeString()} → {hindi ? "आगमन" : "Arrival"} {new Date(trip.arrivalTime).toLocaleTimeString()}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {trip.route.pickupPoint || trip.route.source} → {trip.route.dropPoint || trip.route.destination}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a href={canBook ? `/trip/${trip.id}` : user ? "/profile" : "/login"} className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                {canBook
                  ? (hindi ? "सीट चुनें" : "Select seats")
                  : user
                    ? (hindi ? "फोन सत्यापित करें" : "Verify to book")
                    : (hindi ? "लॉग इन करें" : "Log in to book")}
              </a>
              {trip.bus.upiId && (
                <p className="text-xs text-gray-700">UPI: {trip.bus.upiId}</p>
              )}
              {trip.bus.paymentQrUrl && (
                <img
                  src={trip.bus.paymentQrUrl}
                  alt={`${trip.bus.busNumber} payment QR`}
                  className="h-16 w-16 rounded border object-cover"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
