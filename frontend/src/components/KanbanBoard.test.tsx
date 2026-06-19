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
    if (url === "/api/board" && options?.method !== "PUT") {
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
    render(<KanbanBoard />);
    await waitForBoard();
  });

  it("renames a column", async () => {
    render(<KanbanBoard />);
    await waitForBoard();
    const column = screen.getAllByTestId(/column-/i)[0];
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
  });

  it("adds and removes a card", async () => {
    render(<KanbanBoard />);
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
    render(<KanbanBoard />);
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
        ([url, options]) => url === "/api/board" && options?.method === "PUT"
      );
      expect(put).toBeTruthy();
      expect(String((put![1] as RequestInit).body)).toContain("Saved card");
    });
  });

  it("shows an error when the board fails to load", async () => {
    fetchMock.mockImplementation(() => jsonResponse({}, false));
    render(<KanbanBoard />);
    expect(await screen.findByText(/couldn't load/i)).toBeInTheDocument();
  });
});
