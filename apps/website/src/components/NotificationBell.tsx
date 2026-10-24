"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/formatDate";

type Notice = { _id: string; type: string; message: string; read: boolean; createdAt: string };

export default function NotificationBell({ hindi }: { hindi: boolean }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notice[]>([]);
  const unread = notifications.filter((notice) => !notice.read).length;

  async function load() {
    const response = await fetch("/api/notifications");
    if (response.ok) setNotifications((await response.json()).notifications);
  }

  useEffect(() => { load(); }, []);

  async function markRead(id?: string) {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id } : { all: true }) });
    setNotifications((current) => current.map((notice) => id && notice._id !== id ? notice : { ...notice, read: true }));
  }

  return <div className="relative">
    <button type="button" onClick={() => setOpen(!open)} aria-label={hindi ? "सूचनाएं खोलें" : "Open notifications"} title={hindi ? "सूचनाएं" : "Notifications"} className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17H9m9-2V10a6 6 0 0 0-12 0v5l-2 2h16l-2-2Zm-5 5a2.2 2.2 0 0 1-4 0" /></svg>
      {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-brand-700 bg-red-500 px-1 text-[10px] font-bold leading-none text-white">{unread > 9 ? "9+" : unread}</span>}
    </button>
    {open && <div className="absolute right-0 z-20 mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3"><div><h2 className="font-semibold">{hindi ? "सूचनाएं" : "Notifications"}</h2><p className="text-xs text-gray-500">{unread ? `${unread} ${hindi ? "नई सूचना" : "unread"}` : (hindi ? "सब पढ़ा हुआ" : "All caught up")}</p></div><button type="button" onClick={() => markRead()} disabled={!unread} className="text-xs font-semibold text-brand-700 disabled:text-gray-300">{hindi ? "सब पढ़ा हुआ" : "Mark all read"}</button></div>
      {notifications.length === 0 ? <p className="px-4 py-8 text-center text-sm text-gray-500">{hindi ? "कोई नई सूचना नहीं।" : "No notifications yet."}</p> : <div className="max-h-80 overflow-y-auto">{notifications.map((notice) => <button type="button" key={notice._id} onClick={() => markRead(notice._id)} className={`block w-full border-b border-gray-100 px-4 py-3 text-left transition last:border-0 hover:bg-gray-50 ${notice.read ? "text-gray-500" : "border-l-2 border-l-brand-600 bg-brand-50/40 font-semibold text-gray-900"}`}><span className="block text-sm leading-5">{notice.message}</span><span className="mt-1 block text-xs font-normal text-gray-400">{formatDate(notice.createdAt)}</span></button>)}</div>}
    </div>}
  </div>;
}