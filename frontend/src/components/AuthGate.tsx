"use client";

import { useEffect, useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginForm } from "@/components/LoginForm";

type Status = "loading" | "anon" | "authed";

export const AuthGate = () => {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/session")
      .then((response) => response.json())
      .then((data) => setStatus(data.authenticated ? "authed" : "anon"))
      .catch(() => setStatus("anon"));
  }, []);

  const handleLogin = async (username: string, password: string) => {
    setError("");
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (response.ok) {
      setStatus("authed");
    } else {
      setError("Invalid username or password.");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    setStatus("anon");
  };

  if (status === "loading") {
    return null;
  }

  if (status === "anon") {
    return <LoginForm onSubmit={handleLogin} error={error} />;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleLogout}
        className="fixed right-6 top-6 z-10 rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-[var(--shadow)] transition hover:brightness-110"
      >
        Log out
      </button>
      <KanbanBoard />
    </div>
  );
};
