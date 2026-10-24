import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCustomSession } from "@/lib/session";
import ProfileView from "./ProfileView";

export default async function ProfilePage() {
  const sessionUser = await getCustomSession();
  if (!sessionUser) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      name: true,
      email: true,
      phone: true,
      phoneVerified: true,
      emailVerified: true,
      address: true,
      language: true,
      role: true,
      createdAt: true,
      _count: { select: { bookings: true } },
    },
  });

  if (!user) redirect("/");

  return (
    <ProfileView
      user={{
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        language: user.language,
        phoneVerified: user.phoneVerified,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
        bookingCount: user._count.bookings,
      }}
    />
  );
}
