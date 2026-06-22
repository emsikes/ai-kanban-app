"use client";

import { useState } from "react";
import type { Project } from "@/lib/projects";

type ProjectBarProps = {
  projects: Project[];
  activeProjectId: number | null;
  onSwitch: (id: number) => void;
  onCreate: (name: string) => void;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  onReorder: (ids: number[]) => void;
  onLogout: () => void;
};

export const ProjectBar = ({
  projects,
  activeProjectId,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
  onReorder,
  onLogout,
}: ProjectBarProps) => {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const active = projects.find((project) => project.id === activeProjectId);

  const move = (index: number, delta: number) => {
    const next = [...projects];
    const target = index + delta;
    if (target < 0 || target >= next.length) {
      return;
    }
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next.map((project) => project.id));
  };

  const submitNew = () => {
    const name = newName.trim();
    if (!name) {
      return;
    }
    onCreate(name);
    setNewName("");
  };

  const commitRename = () => {
    const name = renameDraft.trim();
    if (renamingId !== null && name) {
      onRename(renamingId, name);
    }
    setRenamingId(null);
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--stroke)] bg-white px-6 py-3 sm:pr-[380px]">
      <div className="relative">
        <button
          type="button"
          aria-label="Switch project"
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--navy-dark)] transition hover:border-[var(--primary-blue)]"
        >
          {active ? active.name : "Projects"}
          <span aria-hidden className="text-[var(--gray-text)]">
            {open ? "▴" : "▾"}
          </span>
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-2 w-80 rounded-2xl border border-[var(--stroke)] bg-white p-2 shadow-[var(--shadow)]">
            <ul className="space-y-1">
              {projects.map((project, index) => (
                <li
                  key={project.id}
                  className="flex items-center gap-1 rounded-xl px-2 py-1 hover:bg-[var(--surface)]"
                >
                  {renamingId === project.id ? (
                    <input
                      autoFocus
                      aria-label="Project name"
                      value={renameDraft}
                      onChange={(event) => setRenameDraft(event.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          commitRename();
                        } else if (event.key === "Escape") {
                          setRenamingId(null);
                        }
                      }}
                      className="flex-1 rounded-md border border-[var(--stroke)] px-2 py-1 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onSwitch(project.id);
                        setOpen(false);
                      }}
                      className={
                        "flex-1 truncate rounded-md px-2 py-1 text-left text-sm " +
                        (project.id === activeProjectId
                          ? "font-semibold text-[var(--primary-blue)]"
                          : "text-[var(--navy-dark)]")
                      }
                    >
                      {project.name}
                    </button>
                  )}

                  <button
                    type="button"
                    aria-label={`Move ${project.name} up`}
                    onClick={() => move(index, -1)}
                    className="rounded px-1 text-xs text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
                  >
                    {"↑"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${project.name} down`}
                    onClick={() => move(index, 1)}
                    className="rounded px-1 text-xs text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
                  >
                    {"↓"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Rename ${project.name}`}
                    onClick={() => {
                      setRenamingId(project.id);
                      setRenameDraft(project.name);
                    }}
                    className="rounded px-1 text-xs font-semibold text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${project.name}`}
                    onClick={() => {
                      if (window.confirm(`Delete project "${project.name}"?`)) {
                        onDelete(project.id);
                      }
                    }}
                    className="rounded px-1 text-xs font-semibold text-[var(--secondary-purple)] hover:brightness-110"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-2 flex items-center gap-2 border-t border-[var(--stroke)] pt-2">
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    submitNew();
                  }
                }}
                placeholder="New project name"
                className="flex-1 rounded-md border border-[var(--stroke)] px-2 py-1 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
              />
              <button
                type="button"
                onClick={submitNew}
                className="rounded-full bg-[var(--secondary-purple)] px-3 py-1 text-xs font-semibold text-white transition hover:brightness-110"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
      >
        Log out
      </button>
    </header>
  );
};
