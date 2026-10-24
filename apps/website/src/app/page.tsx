import { getCustomSession } from "@/lib/session";

export default async function HomePage() {
  const user = await getCustomSession();
  const language = user?.language || "ENGLISH";
  const hindi = language === "HINDI";
  const today = new Date().toISOString().slice(0, 10);

  

  return (
    <main className="min-h-[calc(100vh-80px)] bg-gray-50">
      <section className="overflow-hidden bg-gray-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-300">Rajveer Travels</p>
            <h1 className="mt-4 max-w-xl text-4xl font-bold leading-tight sm:text-6xl">
              {hindi ? "हर सफर, आराम से शुरू करें" : "Your next journey starts here."}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-gray-300 sm:text-lg">
              {hindi ? "भारत भर में बसें खोजें, अपनी पसंदीदा सीट चुनें और भरोसे के साथ सफर करें।" : "Find buses across India, choose the seat you want, and travel with confidence."}
            </p>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-gray-300">
              <span><strong className="text-white">1,000+</strong> routes</span>
              <span><strong className="text-white">24/7</strong> trip support</span>
              <span><strong className="text-white">6</strong> seats per booking</span>
            </div>
          </div>

          <form action="/search" method="GET" className="rounded-2xl bg-white p-5 text-gray-900 shadow-2xl sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Plan your trip</p>
              <h2 className="mt-2 text-2xl font-bold">Where are you going?</h2>
              <p className="mt-1 text-sm text-gray-500">Search schedules and select your seat.</p>
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-semibold">From<input name="source" placeholder={hindi ? "कहाँ से" : "Departure city"} required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 font-normal outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
              <label className="block text-sm font-semibold">To<input name="destination" placeholder={hindi ? "कहाँ तक" : "Arrival city"} required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 font-normal outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
              <label className="block text-sm font-semibold">Travel date<input name="date" type="date" min={today} defaultValue={today} required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 font-normal outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
              <button type="submit" className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700">{hindi ? "बस खोजें" : "Search buses"}</button>
            </div>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Popular journeys</p><h2 className="mt-2 text-2xl font-bold text-gray-950">Start with a familiar route</h2></div>
          <a href="/search" className="text-sm font-semibold text-brand-700 hover:text-brand-900">Browse all buses →</a>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {["Noida → Patna", "Delhi → Jaipur", "Lucknow → Patna"].map((route) => {
            const [source, destination] = route.split(" → ");
            return <a key={route} href={`/search?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}&date=${today}`} className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"><p className="font-semibold text-gray-950">{route}</p><p className="mt-2 text-sm text-gray-500">View available buses</p><span className="mt-4 block text-sm font-semibold text-brand-700 group-hover:text-brand-900">Search route →</span></a>;
          })}
        </div>
      </section>

      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:px-10 md:grid-cols-3">
          <div><p className="text-2xl">◈</p><h3 className="mt-3 font-semibold">Choose your seat</h3><p className="mt-1 text-sm leading-6 text-gray-500">See the complete bus layout, including seater and sleeper berths.</p></div>
          <div><p className="text-2xl">✓</p><h3 className="mt-3 font-semibold">Book with clarity</h3><p className="mt-1 text-sm leading-6 text-gray-500">Review the route, fare, bus details, and owner contact before confirming.</p></div>
          <div><p className="text-2xl">⌁</p><h3 className="mt-3 font-semibold">Travel supported</h3><p className="mt-1 text-sm leading-6 text-gray-500">Get practical trip support from booking through departure.</p></div>
        </div>
      </section>
    </main>
  );
}