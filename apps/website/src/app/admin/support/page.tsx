"use client";

import { useEffect, useState } from "react";

type Complaint = { id: string; category: string; message: string; status: string; user: { name: string; email: string; phone: string | null } };
type Refund = { id: string; amount: string; upiId: string; cancellationOtp: string; status: string; user: { name: string; email: string; phone: string | null }; booking: { id: string; trip: { bus: { busNumber: string }; route: { source: string; destination: string } } } };

export default function AdminSupportPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [notice, setNotice] = useState("");
  const [otpValues, setOtpValues] = useState<Record<string, string>>({});

  async function load() {
    const response = await fetch("/api/admin/support");
    if (!response.ok) return;
    const data = await response.json();
    setComplaints(data.complaints);
    setRefunds(data.refunds);
  }
  useEffect(() => { load(); }, []);

  async function action(type: "COMPLAINT" | "REFUND", id: string, actionName: "RESOLVE" | "PAY" | "CANCEL", otp?: string) {
    const response = await fetch("/api/admin/support", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id, action: actionName, otp }) });
    const data = await response.json();
    setNotice(response.ok ? "Action completed." : data.error);
    if (response.ok) load();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Complaints & Refunds</h1>
      <section><h2 className="text-xl font-semibold mb-3">Complaints</h2><div className="space-y-3">{complaints.map((item) => <div key={item.id} className="bg-white rounded-xl shadow p-4"><p className="font-semibold">{item.category} — {item.user.name}</p><p className="text-sm text-gray-500">{item.user.email} · {item.user.phone || "No phone"}</p><p className="my-2">{item.message}</p>{item.status !== "RESOLVED" && <button onClick={() => action("COMPLAINT", item.id, "RESOLVE")} className="bg-brand-600 text-white rounded-lg px-3 py-2 text-sm">Mark resolved</button>}</div>)}</div></section>
      <section><h2 className="text-xl font-semibold mb-3">Refund requests</h2><div className="space-y-3">{refunds.map((item) => <div key={item.id} className="bg-white rounded-xl shadow p-4"><p className="font-semibold">{item.user.name} — INR {item.amount}</p><p className="text-sm text-gray-500">{item.user.email} · {item.user.phone || "No phone"} · UPI: {item.upiId}</p><p className="text-sm text-gray-600">{item.booking.trip.bus.busNumber} · {item.booking.trip.route.source} to {item.booking.trip.route.destination}</p>{item.status === "REQUESTED" && <div className="mt-3 flex flex-wrap gap-2"><input value={otpValues[item.id] || ""} onChange={(event) => setOtpValues((values) => ({ ...values, [item.id]: event.target.value.replace(/\D/g, "").slice(0, 6) }))} placeholder="Cancellation OTP" inputMode="numeric" maxLength={6} className="rounded-lg border px-3 py-2 text-sm" /><button onClick={() => action("REFUND", item.id, "CANCEL", otpValues[item.id])} className="bg-amber-500 text-white rounded-lg px-3 py-2 text-sm">Complete cancellation</button><button onClick={() => action("REFUND", item.id, "PAY")} className="bg-brand-600 text-white rounded-lg px-3 py-2 text-sm">Approve refund & email user</button></div>}</div>)}</div></section>
      {notice && <p className="text-sm text-gray-700">{notice}</p>}
    </div>
  );
}
