"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { ChatSidebar } from "@/components/ChatSidebar";

type WorkspaceProps = {
  onLogout: () => void;
};

export const Workspace = ({ onLogout }: WorkspaceProps) => {
  const [boardVersion, setBoardVersion] = useState(0);

  return (
    <div className="min-h-screen">
      <button
        type="button"
        onClick={onLogout}
        className="fixed right-6 top-6 z-40 rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-[var(--shadow)] transition hover:brightness-110 sm:right-[384px]"
      >
        Log out
      </button>
      {/* Padding reserves space for the fixed chat panel (bottom sheet on
          small screens, right sidebar on larger ones). */}
      <div className="min-w-0 pb-[55vh] sm:pb-0 sm:pr-[360px]">
        <KanbanBoard refreshSignal={boardVersion} />
      </div>
      <ChatSidebar onBoardUpdated={() => setBoardVersion((value) => value + 1)} />
    </div>
  );
};
