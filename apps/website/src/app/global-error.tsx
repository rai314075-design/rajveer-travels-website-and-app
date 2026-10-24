"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <main className="flex min-h-screen items-center justify-center px-6 py-16">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Rajveer Travels</p>
            <h1 className="mt-3 text-2xl font-bold text-gray-950">The page needs a refresh</h1>
            <p className="mt-2 text-sm text-gray-500">We hit an unexpected error while loading the application.</p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Refresh page
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
