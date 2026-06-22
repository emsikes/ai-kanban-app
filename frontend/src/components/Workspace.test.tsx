import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Workspace } from "@/components/Workspace";
import { initialData } from "@/lib/kanban";

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("Workspace", () => {
  it("refreshes the board after the AI updates it via chat", async () => {
    let current = JSON.parse(JSON.stringify(initialData));

    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/projects") {
        return jsonResponse([{ id: 1, name: "My Board", position: 0 }]);
      }
      if (url === "/api/projects/1/board" && options?.method !== "PUT") {
        return jsonResponse(current);
      }
      if (url === "/api/projects/1/chat") {
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

    expect(await screen.findByText("AI Added Card")).toBeInTheDocument();
  });

  const switcher = () =>
    screen.getByRole("button", { name: /switch project/i });

  it("creates a project, switches to it, and shows its empty board", async () => {
    let list = [{ id: 1, name: "My Board", position: 0 }];
    const emptyBoard = {
      columns: initialData.columns.map((c) => ({ ...c, cardIds: [] })),
      cards: {},
    };
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/projects" && options?.method === "POST") {
        const created = { id: 2, name: "Roadmap", position: 1 };
        list = [...list, created];
        return jsonResponse(created);
      }
      if (url === "/api/projects") return jsonResponse(list);
      if (url === "/api/projects/1/board") return jsonResponse(initialData);
      if (url === "/api/projects/2/board") return jsonResponse(emptyBoard);
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace onLogout={vi.fn()} />);
    await waitFor(() => expect(switcher()).toHaveTextContent("My Board"));

    await userEvent.click(switcher());
    await userEvent.type(
      screen.getByPlaceholderText(/new project name/i),
      "Roadmap"
    );
    await userEvent.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() => expect(switcher()).toHaveTextContent("Roadmap"));
    await waitFor(() =>
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5)
    );
    expect(screen.queryByTestId(/card-/i)).not.toBeInTheDocument();
  });

  it("deletes the active project and switches to the remaining one", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    let list = [
      { id: 1, name: "My Board", position: 0 },
      { id: 2, name: "Roadmap", position: 1 },
    ];
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (/\/api\/projects\/\d+$/.test(url) && options?.method === "DELETE") {
        const id = Number(url.split("/").pop());
        list = list.filter((project) => project.id !== id);
        return jsonResponse({}, true);
      }
      if (url === "/api/projects") return jsonResponse(list);
      if (url.endsWith("/board")) return jsonResponse(initialData);
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace onLogout={vi.fn()} />);
    await waitFor(() => expect(switcher()).toHaveTextContent("My Board"));

    await userEvent.click(switcher());
    await userEvent.click(
      screen.getByRole("button", { name: /delete my board/i })
    );

    await waitFor(() => expect(switcher()).toHaveTextContent("Roadmap"));
  });

  it("renames and reorders projects via the API", async () => {
    const list = [
      { id: 1, name: "My Board", position: 0 },
      { id: 2, name: "Roadmap", position: 1 },
    ];
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (/\/api\/projects\/\d+$/.test(url) && options?.method === "PATCH") {
        return jsonResponse({});
      }
      if (url === "/api/projects/reorder") return jsonResponse({});
      if (url === "/api/projects") return jsonResponse(list);
      if (url.endsWith("/board")) return jsonResponse(initialData);
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Workspace onLogout={vi.fn()} />);
    await waitFor(() => expect(switcher()).toHaveTextContent("My Board"));
    await userEvent.click(switcher());

    await userEvent.click(screen.getByRole("button", { name: /rename my board/i }));
    const input = screen.getByLabelText("Project name");
    await userEvent.clear(input);
    await userEvent.type(input, "Renamed{Enter}");
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([u, o]) => /\/api\/projects\/1$/.test(u as string) && o?.method === "PATCH"
        )
      ).toBe(true)
    );

    await userEvent.click(
      screen.getByRole("button", { name: /move my board down/i })
    );
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([u]) => u === "/api/projects/reorder")
      ).toBe(true)
    );
  });
});
