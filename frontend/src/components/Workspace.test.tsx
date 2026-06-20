import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Workspace } from "@/components/Workspace";
import { initialData } from "@/lib/kanban";

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Workspace", () => {
  it("refreshes the board after the AI updates it via chat", async () => {
    // The board the backend returns; chat mutates it so the refetch sees the card.
    let current = JSON.parse(JSON.stringify(initialData));

    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/board" && options?.method !== "PUT") {
        return jsonResponse(current);
      }
      if (url === "/api/chat") {
        current = JSON.parse(JSON.stringify(initialData));
        current.cards["card-new"] = {
          id: "card-new",
          title: "AI Added Card",
          details: "From the assistant",
        };
        current.columns[0].cardIds.push("card-new");
        return jsonResponse({ reply: "Added it", board: current });
      }
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace onLogout={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5)
    );
    expect(screen.queryByText("AI Added Card")).not.toBeInTheDocument();

    await userEvent.type(
      screen.getByPlaceholderText(/ask the assistant/i),
      "add a card"
    );
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    // Board auto-refreshed (refetched GET /api/board) and shows the new card.
    expect(await screen.findByText("AI Added Card")).toBeInTheDocument();
  });
});
