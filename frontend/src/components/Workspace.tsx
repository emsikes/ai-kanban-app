"use client";

import { useEffect, useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ProjectBar } from "@/components/ProjectBar";
import type { Project } from "@/lib/projects";

const ACTIVE_KEY = "activeProjectId";

const jsonHeaders = { "Content-Type": "application/json" };

type WorkspaceProps = {
  onLogout: () => void;
};

export const Workspace = ({ onLogout }: WorkspaceProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [boardVersion, setBoardVersion] = useState(0);

  const fetchProjects = async (): Promise<Project[]> => {
    const list: Project[] = await (await fetch("/api/projects")).json();
    setProjects(list);
    return list;
  };

  useEffect(() => {
    fetchProjects().then((list) => {
      const stored = Number(localStorage.getItem(ACTIVE_KEY));
      const chosen = list.find((project) => project.id === stored) ?? list[0];
      setActiveId(chosen ? chosen.id : null);
    });
  }, []);

  useEffect(() => {
    if (activeId !== null) {
      localStorage.setItem(ACTIVE_KEY, String(activeId));
    }
  }, [activeId]);

  const createProject = async (name: string) => {
    const created: Project = await (
      await fetch("/api/projects", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ name }),
      })
    ).json();
    await fetchProjects();
    setActiveId(created.id);
  };

  const renameProject = async (id: number, name: string) => {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify({ name }),
    });
    await fetchProjects();
  };

  const deleteProject = async (id: number) => {
    const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!response.ok) {
      return;
    }
    const list = await fetchProjects();
    if (id === activeId) {
      setActiveId(list[0]?.id ?? null);
    }
  };

  const reorderProjects = async (ids: number[]) => {
    await fetch("/api/projects/reorder", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ ids }),
    });
    await fetchProjects();
  };

  return (
    <div className="min-h-screen">
      <ProjectBar
        projects={projects}
        activeProjectId={activeId}
        onSwitch={setActiveId}
        onCreate={createProject}
        onRename={renameProject}
        onDelete={deleteProject}
        onReorder={reorderProjects}
        onLogout={onLogout}
      />
      {activeId !== null && (
        <>
          <div className="min-w-0 pb-[55vh] sm:pb-0 sm:pr-[360px]">
            <KanbanBoard projectId={activeId} refreshSignal={boardVersion} />
          </div>
          <ChatSidebar
            projectId={activeId}
            onBoardUpdated={() => setBoardVersion((value) => value + 1)}
          />
        </>
      )}
    </div>
  );
};
