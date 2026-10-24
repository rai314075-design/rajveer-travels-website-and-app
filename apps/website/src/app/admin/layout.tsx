import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCustomSession } from "@/lib/session";

async function ensureAdmin() {
  const sessionUser = await getCustomSession();
  if (!sessionUser) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { role: true, isSuperAdmin: true },
  });

  if (user?.role !== "ADMIN") redirect("/");
  return user;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await ensureAdmin();

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col bg-gray-100 lg:flex-row">
      <aside className="w-full bg-gray-950 p-4 text-gray-200 lg:sticky lg:top-0 lg:min-h-[calc(100vh-80px)] lg:w-64">
        <div className="mb-5 flex items-center justify-between">
          <div><p className="text-xs uppercase tracking-[0.2em] text-orange-300">Rajveer</p><p className="mt-1 text-lg font-bold text-white">Admin console</p></div>
          <a href="/" className="text-xs font-semibold text-gray-400 hover:text-white">View site</a>
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Operations</p>
        <nav className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
          <a href="/admin" className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-800">Dashboard</a>
          <a href="/admin/buses" className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-800">Buses</a>
          <a href="/admin/bus/create" className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700">Create Bus Layout</a>
          <a href="/admin/routes" className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-800">Routes</a>
          <a href="/admin/trips" className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-800">Trips & Dates</a>
          <a href="/admin/bookings" className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-800">All Bookings</a>
        </nav>
        <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Support</p>
        <nav className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
          <a href="/admin/notifications" className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-800">Notifications</a>
          <a href="/admin/support" className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-800">Complaints & Refunds</a>
          {user?.isSuperAdmin && <a href="/admin/users" className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-800">Manage Admins</a>}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
    </div>
  );
}
