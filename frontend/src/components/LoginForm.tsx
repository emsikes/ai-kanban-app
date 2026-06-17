import { useState, type FormEvent } from "react";

type LoginFormProps = {
  onSubmit: (username: string, password: string) => void;
  error?: string;
};

export const LoginForm = ({ onSubmit, error }: LoginFormProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      return;
    }
    onSubmit(username.trim(), password);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow)]"
      >
        <h1 className="font-display text-2xl font-semibold text-[var(--navy-dark)]">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-[var(--gray-text)]">
          Sign in to view your board.
        </p>

        <label
          htmlFor="username"
          className="mt-6 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
        >
          Username
        </label>
        <input
          id="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="mt-2 w-full rounded-xl border border-[var(--stroke)] px-3 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
          autoComplete="username"
        />

        <label
          htmlFor="password"
          className="mt-4 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-xl border border-[var(--stroke)] px-3 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
          autoComplete="current-password"
        />

        {error && (
          <p className="mt-4 text-sm font-medium text-[var(--secondary-purple)]">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="mt-6 w-full rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
        >
          Sign in
        </button>
      </form>
    </main>
  );
};
