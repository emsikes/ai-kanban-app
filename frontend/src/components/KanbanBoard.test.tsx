import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { initialData } from "@/lib/kanban";

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn((url: string, options?: RequestInit) => {
    if (url === "/api/projects/1/board" && options?.method !== "PUT") {
      return jsonResponse(initialData);
    }
    return jsonResponse({});
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const waitForBoard = () =>
  waitFor(() => expect(screen.getAllByTestId(/column-/i)).toHaveLength(5));

describe("KanbanBoard", () => {
  it("renders the board loaded from the API", async () => {
    render(<KanbanBoard projectId={1} />);
    await waitForBoard();
  });

  it("renames a column", async () => {
    render(<KanbanBoard projectId={1} />);
    await waitForBoard();
    const column = screen.getAllByTestId(/column-/i)[0];
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
  });

  it("adds and removes a card", async () => {
    render(<KanbanBoard projectId={1} />);
    await waitForBoard();
    const column = screen.getAllByTestId(/column-/i)[0];
    await userEvent.click(
      within(column).getByRole("button", { name: /add a card/i })
    );
    await userEvent.type(
      within(column).getByPlaceholderText(/card title/i),
      "Fresh card"
    );
    await userEvent.click(
      within(column).getByRole("button", { name: /add card/i })
    );
    expect(within(column).getByText("Fresh card")).toBeInTheDocument();

    await userEvent.click(
      within(column).getByRole("button", { name: /delete fresh card/i })
    );
    expect(within(column).queryByText("Fresh card")).not.toBeInTheDocument();
  });

  it("persists a change via PUT /api/board", async () => {
    render(<KanbanBoard projectId={1} />);
    await waitForBoard();
    const column = screen.getAllByTestId(/column-/i)[0];
    await userEvent.click(
      within(column).getByRole("button", { name: /add a card/i })
    );
    await userEvent.type(
      within(column).getByPlaceholderText(/card title/i),
      "Saved card"
    );
    await userEvent.click(
      within(column).getByRole("button", { name: /add card/i })
    );

    await waitFor(() => {
      const put = fetchMock.mock.calls.find(
        ([url, options]) => url === "/api/projects/1/board" && options?.method === "PUT"
      );
      expect(put).toBeTruthy();
      expect(String((put![1] as RequestInit).body)).toContain("Saved card");
    });
  });

  it("shows an error when the board fails to load", async () => {
    fetchMock.mockImplementation(() => jsonResponse({}, false));
    render(<KanbanBoard projectId={1} />);
    expect(await screen.findByText(/couldn't load/i)).toBeInTheDocument();
  });

  it("edits a card's title inline and persists it", async () => {
    render(<KanbanBoard projectId={1} />);
    await waitForBoard();
    const card = screen.getByTestId("card-card-1");
    await userEvent.click(within(card).getByText("Align roadmap themes"));
    const input = within(card).getByLabelText("Card title");
    await userEvent.clear(input);
    await userEvent.type(input, "Renamed card{Enter}");
    expect(within(card).getByText("Renamed card")).toBeInTheDocument();

    await waitFor(() => {
      const put = fetchMock.mock.calls.find(
        ([url, options]) => url === "/api/projects/1/board" && options?.method === "PUT"
      );
      expect(put).toBeTruthy();
      expect(String((put![1] as RequestInit).body)).toContain("Renamed card");
    });
  });

  it("cancels a card edit on Escape", async () => {
    render(<KanbanBoard projectId={1} />);
    await waitForBoard();
    const card = screen.getByTestId("card-card-1");
    await userEvent.click(within(card).getByText("Align roadmap themes"));
    const input = within(card).getByLabelText("Card title");
    await userEvent.clear(input);
    await userEvent.type(input, "Nope{Escape}");
    expect(within(card).getByText("Align roadmap themes")).toBeInTheDocument();
  });

  it("edits a card's details inline", async () => {
    render(<KanbanBoard projectId={1} />);
    await waitForBoard();
    const card = screen.getByTestId("card-card-1");
    await userEvent.click(within(card).getByText(/Draft quarterly themes/i));
    const textarea = within(card).getByLabelText("Card details");
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "Updated details");
    await userEvent.tab();
    expect(within(card).getByText("Updated details")).toBeInTheDocument();
  });

  it("reverts an emptied card title", async () => {
    render(<KanbanBoard projectId={1} />);
    await waitForBoard();
    const card = screen.getByTestId("card-card-1");
    await userEvent.click(within(card).getByText("Align roadmap themes"));
    const input = within(card).getByLabelText("Card title");
    await userEvent.clear(input);
    await userEvent.type(input, "{Enter}");
    expect(within(card).getByText("Align roadmap themes")).toBeInTheDocument();
  });
});
