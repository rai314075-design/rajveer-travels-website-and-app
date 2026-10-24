"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Something went wrong</p>
        <h1 className="mt-3 text-2xl font-bold text-gray-950">We could not load this page</h1>
        <p className="mt-2 text-sm text-gray-500">Please try again. Your booking data has not been changed.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
