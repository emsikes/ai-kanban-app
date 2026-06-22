"use client";

import { useEffect, useState, type FormEvent } from "react";

type Message = { role: "user" | "assistant"; content: string };

type ChatSidebarProps = {
  projectId: number;
  onBoardUpdated: () => void;
};

export const ChatSidebar = ({ projectId, onBoardUpdated }: ChatSidebarProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");

  // The conversation is per-project; reset it when the active project changes.
  useEffect(() => {
    setMessages([]);
    setStatus("idle");
  }, [projectId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || status === "sending") {
      return;
    }

    const history = messages;
    const withUser: Message[] = [...messages, { role: "user", content: text }];
    setMessages(withUser);
    setInput("");
    setStatus("sending");

    try {
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      if (!response.ok) {
        throw new Error("Chat request failed");
      }
      const data = await response.json();
      setMessages([...withUser, { role: "assistant", content: data.reply }]);
      setStatus("idle");
      if (data.board) {
        onBoardUpdated();
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <aside className="fixed inset-x-0 bottom-0 z-30 flex h-[55vh] flex-col border-t border-[var(--stroke)] bg-white shadow-[var(--shadow)] sm:inset-y-0 sm:left-auto sm:right-0 sm:h-auto sm:w-[360px] sm:border-l sm:border-t-0 sm:shadow-none">
      <div className="border-b border-[var(--stroke)] px-6 py-5">
        <div className="h-1 w-10 rounded-full bg-[var(--accent-yellow)]" />
        <h2 className="mt-3 font-display text-xl font-semibold text-[var(--navy-dark)]">
          Assistant
        </h2>
        <p className="mt-1 text-xs text-[var(--gray-text)]">
          Ask me to create, edit, or move cards.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-5">
        {messages.length === 0 && (
          <p className="text-sm text-[var(--gray-text)]">
            Try: &quot;Add a card to Backlog for the launch checklist.&quot;
          </p>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl bg-[var(--primary-blue)] px-4 py-2 text-sm text-white"
                : "mr-auto max-w-[85%] rounded-2xl bg-[var(--surface)] px-4 py-2 text-sm text-[var(--navy-dark)]"
            }
          >
            {message.content}
          </div>
        ))}
        {status === "sending" && (
          <p className="text-xs text-[var(--gray-text)]">Thinking...</p>
        )}
        {status === "error" && (
          <p className="text-sm font-medium text-[var(--secondary-purple)]">
            Something went wrong. Please try again.
          </p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-[var(--stroke)] px-4 py-4"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask the assistant..."
          className="flex-1 rounded-full border border-[var(--stroke)] px-4 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
          aria-label="Message"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-full bg-[var(--secondary-purple)] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </aside>
  );
};
