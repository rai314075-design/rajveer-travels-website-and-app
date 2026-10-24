"use client";

import { useState } from "react";

export default function AdminNotificationsPage() {
  const [channel, setChannel] = useState("EMAIL");
  const [message, setMessage] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel }) });
    const data = await response.json();
    setMessage(response.ok ? "Booking notification preference saved." : data.error);
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Booking Notifications</h1>
      <form onSubmit={save} className="bg-white rounded-xl shadow p-6 space-y-4">
        <label htmlFor="channel" className="block font-medium">Send new booking alerts by</label>
        <select id="channel" value={channel} onChange={(event) => setChannel(event.target.value)} className="w-full border rounded-lg px-3 py-2">
          <option value="EMAIL">Email</option>
          <option value="SMS">Phone message (SMS)</option>
        </select>
        <button className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2">Save preference</button>
        {message && <p className="text-sm text-gray-600">{message}</p>}
      </form>
    </div>
  );
}
