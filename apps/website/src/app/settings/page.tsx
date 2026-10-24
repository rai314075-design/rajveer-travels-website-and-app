import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCustomSession } from "@/lib/session";
import BookingHistoryClient from "@/components/BookingHistoryClient";

export default async function SettingsPage() {
  const sessionUser = await getCustomSession();
  if (!sessionUser) redirect("/login");

  const bookings = await prisma.booking.findMany({
    where: { userId: sessionUser.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      totalAmount: true,
      status: true,
      createdAt: true,
      passengerInfo: true,
      trip: {
        select: {
          departureTime: true,
          arrivalTime: true,
          bus: { select: { busNumber: true, ownerPhone: true, pickupLocation: true, dropLocation: true } },
          route: { select: { source: true, destination: true, pickupPoint: true, dropPoint: true } },
        },
      },
      payment: { select: { status: true } },
    },
  });

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Rajveer Travels</p>
      <h1 className="mt-2 text-3xl font-bold text-gray-900">Settings</h1>
      <p className="mt-2 text-gray-500">Manage your account, bookings and sign-in options.</p>

      <div className="mt-8 divide-y rounded-2xl border border-gray-200 bg-white shadow-sm">
        <a href="/profile" className="flex items-center justify-between p-5 hover:bg-gray-50">
          <span>
            <strong className="block text-gray-900">Profile</strong>
            <span className="text-sm text-gray-500">Update your personal information and verification.</span>
          </span>
          <span className="text-brand-700">Open</span>
        </a>
        <a href="/api/logout" className="flex items-center justify-between p-5 text-red-700 hover:bg-red-50">
          <span>
            <strong className="block">Log out</strong>
            <span className="text-sm text-red-600">End your current session.</span>
          </span>
          <span>Sign out</span>
        </a>
      </div>

      <BookingHistoryClient initialBookings={bookings as any} />
    </section>
  );
}