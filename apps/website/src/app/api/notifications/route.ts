import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { getCustomSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCustomSession();
  if (!user) return NextResponse.json({ error: "Log in to view notifications" }, { status: 401 });
  await connectMongo();
  const notifications = await Notification.find({ userId: user.id }).sort({ createdAt: -1 }).limit(30).lean();
  return NextResponse.json({ notifications, unread: notifications.filter((item) => !item.read).length });
}

export async function PATCH(req: NextRequest) {
  const user = await getCustomSession();
  if (!user) return NextResponse.json({ error: "Log in to update notifications" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  await connectMongo();
  if (body.all) await Notification.updateMany({ userId: user.id, read: false }, { $set: { read: true } });
  else if (typeof body.id === "string") await Notification.updateOne({ _id: body.id, userId: user.id }, { $set: { read: true } });
  return NextResponse.json({ success: true });
}