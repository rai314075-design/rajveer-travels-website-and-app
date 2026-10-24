"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider as TanStackQueryClientProvider } from "@tanstack/react-query";

/**
 * Creates a fresh QueryClient instance.
 *
 * The client is created lazily via `useState` inside this Client Component so
 * that the `QueryClient` instance never crosses the Server → Client boundary
 * as a module-level class instance (which Next.js cannot serialize and would
 * throw "Only plain objects, and a few built-ins, can be passed to Client
 * Components from Server Components" for).
 */
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });

export default function QueryClientProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return <TanStackQueryClientProvider client={queryClient}>{children}</TanStackQueryClientProvider>;
}
