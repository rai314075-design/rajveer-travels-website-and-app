"use client";

import { useEffect, useState } from "react";

type User = { id: string; name: string; email: string; role: "USER" | "ADMIN"; isSuperAdmin: boolean };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const [canManageAdmins, setCanManageAdmins] = useState(false);
  const [message, setMessage] = useState("");

  async function loadUsers() {
    const response = await fetch("/api/admin/users");
    if (!response.ok) return;
    const data = await response.json();
    setUsers(data.users);
    setCanManageAdmins(data.canManageAdmins);
  }

  useEffect(() => { loadUsers(); }, []);

  async function promoteUser(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    setMessage(data.error || "User promoted to admin.");
    if (response.ok) { setEmail(""); loadUsers(); }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Manage Admins</h1>
      {canManageAdmins && (
        <form onSubmit={promoteUser} className="bg-white rounded-xl shadow p-4 flex gap-3 mb-6">
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Registered user email" className="border rounded-lg px-3 py-2 flex-1" />
          <button className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2">Make Admin</button>
        </form>
      )}
      {message && <p className="mb-4 text-sm text-gray-600">{message}</p>}
      <div className="bg-white rounded-xl shadow divide-y">
        {users.map((user) => (
          <div key={user.id} className="p-4 flex justify-between">
            <div><p className="font-medium">{user.name}</p><p className="text-sm text-gray-500">{user.email}</p></div>
            <span className="text-sm text-gray-600">{user.isSuperAdmin ? "First admin" : user.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}