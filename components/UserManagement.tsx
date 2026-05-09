"use client";

import { useEffect, useState } from "react";
import { sha256hex } from "../lib/sha256";

type AppUser = {
  username: string;
  role: "admin" | "user";
  created_at: string;
};

export function UserManagement({ currentUser }: { currentUser: string }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  const [changingPwFor, setChangingPwFor] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const [roleLoading, setRoleLoading] = useState<Record<string, boolean>>({});
  const [deleteLoading, setDeleteLoading] = useState<Record<string, boolean>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setGlobalError(null);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.ok) setUsers(data.users);
      else setGlobalError(data.error ?? "Failed to load users.");
    } catch {
      setGlobalError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) return;
    setAddLoading(true);
    setAddError(null);
    try {
      const passwordHash = sha256hex(newPassword);
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername.trim(), passwordHash, role: newRole }),
      });
      const data = await res.json();
      if (data.ok) {
        setNewUsername("");
        setNewPassword("");
        setNewRole("user");
        await loadUsers();
      } else {
        setAddError(data.error ?? "Failed to add user.");
      }
    } catch {
      setAddError("Failed to add user.");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleChangeRole(username: string, role: "admin" | "user") {
    setRoleLoading((prev) => ({ ...prev, [username]: true }));
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.username === username ? { ...u, role } : u))
        );
      }
    } finally {
      setRoleLoading((prev) => ({ ...prev, [username]: false }));
    }
  }

  async function handleSetPassword(username: string) {
    if (!newPw) return;
    setPwLoading(true);
    setPwError(null);
    try {
      const passwordHash = sha256hex(newPw);
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordHash }),
      });
      const data = await res.json();
      if (data.ok) {
        setChangingPwFor(null);
        setNewPw("");
      } else {
        setPwError(data.error ?? "Failed to update password.");
      }
    } catch {
      setPwError("Failed to update password.");
    } finally {
      setPwLoading(false);
    }
  }

  async function handleDelete(username: string) {
    setDeleteLoading((prev) => ({ ...prev, [username]: true }));
    setDeleteConfirm(null);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        setUsers((prev) => prev.filter((u) => u.username !== username));
      }
    } finally {
      setDeleteLoading((prev) => ({ ...prev, [username]: false }));
    }
  }

  return (
    <section className="panel" style={{ marginTop: 24 }}>
      <div className="header-min">
        <h3>User Management</h3>
        <span className="pill small-pill ghost">{users.length} accounts</span>
      </div>

      {globalError && (
        <div className="pill small-pill" style={{ color: "var(--danger)", marginBottom: 12 }}>
          {globalError}
        </div>
      )}

      {loading ? (
        <div className="small" style={{ color: "var(--muted)" }}>Loading…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 120px 1fr auto",
              gap: 12,
              padding: "6px 12px",
              color: "var(--muted)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span>Username</span>
            <span>Role</span>
            <span>Password</span>
            <span />
          </div>

          {/* User rows */}
          {users.map((user) => (
            <div
              key={user.username}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 120px 1fr auto",
                gap: 12,
                padding: "10px 12px",
                alignItems: "center",
                borderRadius: 8,
                background: "var(--surface-ghost)",
                border: "1px solid var(--border)",
              }}
            >
              {/* Username */}
              <span style={{ fontWeight: 500 }}>
                {user.username}
                {user.username === currentUser && (
                  <span
                    className="pill small-pill ghost"
                    style={{ marginLeft: 8, fontSize: 10 }}
                  >
                    you
                  </span>
                )}
              </span>

              {/* Role selector */}
              <select
                className="pill small-pill ghost"
                value={user.role}
                disabled={roleLoading[user.username] || user.username === currentUser}
                onChange={(e) =>
                  handleChangeRole(user.username, e.target.value as "admin" | "user")
                }
                style={{ width: "100%" }}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>

              {/* Password column */}
              {changingPwFor === user.username ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="password"
                    value={newPw}
                    placeholder="New password"
                    autoFocus
                    onChange={(e) => setNewPw(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSetPassword(user.username)}
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <button
                    className="pill small-pill"
                    onClick={() => handleSetPassword(user.username)}
                    disabled={pwLoading || !newPw}
                  >
                    {pwLoading ? "…" : "Save"}
                  </button>
                  <button
                    className="pill small-pill ghost"
                    onClick={() => {
                      setChangingPwFor(null);
                      setNewPw("");
                      setPwError(null);
                    }}
                  >
                    ✕
                  </button>
                  {pwError && (
                    <span style={{ color: "var(--danger)", fontSize: 12 }}>{pwError}</span>
                  )}
                </div>
              ) : (
                <button
                  className="pill small-pill ghost"
                  style={{ justifySelf: "start" }}
                  onClick={() => {
                    setChangingPwFor(user.username);
                    setNewPw("");
                    setPwError(null);
                  }}
                >
                  Set password
                </button>
              )}

              {/* Delete */}
              {deleteConfirm === user.username ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="pill small-pill"
                    style={{ background: "var(--danger)", color: "#fff", borderColor: "var(--danger)" }}
                    onClick={() => handleDelete(user.username)}
                    disabled={deleteLoading[user.username]}
                  >
                    Confirm
                  </button>
                  <button
                    className="pill small-pill ghost"
                    onClick={() => setDeleteConfirm(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="pill small-pill ghost"
                  style={{ color: "var(--danger)", opacity: user.username === currentUser ? 0.3 : 1 }}
                  disabled={user.username === currentUser || deleteLoading[user.username]}
                  onClick={() => setDeleteConfirm(user.username)}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add user form */}
      <form
        className="connector"
        onSubmit={handleAddUser}
        style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}
      >
        <div className="header-min" style={{ marginBottom: 12 }}>
          <h5>Add user</h5>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="um-username">Username</label>
            <input
              id="um-username"
              type="text"
              autoComplete="off"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="e.g. john"
            />
          </div>
          <div className="form-field">
            <label htmlFor="um-password">Password</label>
            <input
              id="um-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="form-field">
            <label htmlFor="um-role">Role</label>
            <select
              id="um-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as "admin" | "user")}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        {addError && (
          <div className="pill small-pill" style={{ color: "var(--danger)" }}>
            {addError}
          </div>
        )}
        <div className="actions">
          <button
            className="btn-primary"
            type="submit"
            disabled={addLoading || !newUsername.trim() || !newPassword}
          >
            {addLoading ? "Adding…" : "Add user"}
          </button>
        </div>
      </form>
    </section>
  );
}
