import { useState, type PointerEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card } from "@/lib/kanban";

type KanbanCardProps = {
  card: Card;
  onDelete: (cardId: string) => void;
  onEdit: (cardId: string, fields: { title: string; details: string }) => void;
};

export const KanbanCard = ({ card, onDelete, onEdit }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });
  const [editing, setEditing] = useState<"title" | "details" | null>(null);
  const [draft, setDraft] = useState("");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const startEdit = (field: "title" | "details") => {
    setEditing(field);
    setDraft(field === "title" ? card.title : card.details);
  };

  const commit = () => {
    if (!editing) {
      return;
    }
    if (editing === "title") {
      const title = draft.trim();
      if (title) {
        onEdit(card.id, { title, details: card.details });
      }
    } else {
      onEdit(card.id, { title: card.title, details: draft });
    }
    setEditing(null);
  };

  // Keep pointer interactions on the edit fields from starting a card drag.
  const stopDrag = {
    onPointerDown: (event: PointerEvent) => event.stopPropagation(),
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "rounded-2xl border border-transparent bg-white px-4 py-4 shadow-[0_12px_24px_rgba(3,33,71,0.08)]",
        "transition-all duration-150",
        isDragging && "opacity-60 shadow-[0_18px_32px_rgba(3,33,71,0.16)]"
      )}
      {...attributes}
      {...listeners}
      data-testid={`card-${card.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing === "title" ? (
            <input
              autoFocus
              aria-label="Card title"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commit();
                } else if (event.key === "Escape") {
                  setEditing(null);
                }
              }}
              {...stopDrag}
              className="w-full rounded-md border border-[var(--stroke)] px-2 py-1 font-display text-base font-semibold text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
            />
          ) : (
            <h4
              onClick={() => startEdit("title")}
              className="cursor-text font-display text-base font-semibold text-[var(--navy-dark)]"
            >
              {card.title}
            </h4>
          )}

          {editing === "details" ? (
            <textarea
              autoFocus
              aria-label="Card details"
              rows={3}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setEditing(null);
                }
              }}
              {...stopDrag}
              className="mt-2 w-full resize-none rounded-md border border-[var(--stroke)] px-2 py-1 text-sm leading-6 text-[var(--gray-text)] outline-none focus:border-[var(--primary-blue)]"
            />
          ) : (
            <p
              onClick={() => startEdit("details")}
              className="mt-2 cursor-text text-sm leading-6 text-[var(--gray-text)]"
            >
              {card.details}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDelete(card.id)}
          {...stopDrag}
          className="rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:text-[var(--navy-dark)]"
          aria-label={`Delete ${card.title}`}
        >
          Remove
        </button>
      </div>
    </article>
  );
};
