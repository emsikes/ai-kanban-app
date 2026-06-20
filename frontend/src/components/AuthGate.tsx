"use client";

import { useEffect, useState } from "react";
import { LoginForm } from "@/components/LoginForm";
import { Workspace } from "@/components/Workspace";

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
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        setStatus("authed");
      } else if (response.status === 401) {
        setError("Invalid username or password.");
      } else {
        setError("Could not reach the server. Is the backend running?");
      }
    } catch {
      setError("Could not reach the server. Is the backend running?");
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

  return <Workspace onLogout={handleLogout} />;
};
