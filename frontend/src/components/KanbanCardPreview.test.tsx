import { render, screen } from "@testing-library/react";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";

describe("KanbanCardPreview", () => {
  it("renders the card title and details", () => {
    render(
      <KanbanCardPreview
        card={{ id: "card-1", title: "Drag me", details: "Preview details" }}
      />
    );
    expect(screen.getByText("Drag me")).toBeInTheDocument();
    expect(screen.getByText("Preview details")).toBeInTheDocument();
  });
});
