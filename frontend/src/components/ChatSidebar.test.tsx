import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatSidebar } from "@/components/ChatSidebar";

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
}

let fetchMock: ReturnType<typeof vi.fn>;

afterEach(() => {
  vi.unstubAllGlobals();
});

const send = async (text: string) => {
  await userEvent.type(screen.getByPlaceholderText(/ask the assistant/i), text);
  await userEvent.click(screen.getByRole("button", { name: /send/i }));
};

describe("ChatSidebar", () => {
  it("sends a message and renders the reply", async () => {
    fetchMock = vi.fn(() => jsonResponse({ reply: "Hello back", board: null }));
    vi.stubGlobal("fetch", fetchMock);
    const onBoardUpdated = vi.fn();
    render(<ChatSidebar projectId={1} onBoardUpdated={onBoardUpdated} />);

    await send("hi there");

    expect(await screen.findByText("Hello back")).toBeInTheDocument();
    expect(screen.getByText("hi there")).toBeInTheDocument();
    expect(onBoardUpdated).not.toHaveBeenCalled();
  });

  it("refreshes the board when the AI returns a board update", async () => {
    fetchMock = vi.fn(() =>
      jsonResponse({ reply: "Done", board: { columns: [], cards: {} } })
    );
    vi.stubGlobal("fetch", fetchMock);
    const onBoardUpdated = vi.fn();
    render(<ChatSidebar projectId={1} onBoardUpdated={onBoardUpdated} />);

    await send("add a card");

    await waitFor(() => expect(onBoardUpdated).toHaveBeenCalledTimes(1));
  });

  it("sends the prior conversation as history on the next turn", async () => {
    fetchMock = vi.fn(() => jsonResponse({ reply: "ok", board: null }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatSidebar projectId={1} onBoardUpdated={vi.fn()} />);

    await send("first");
    await screen.findByText("ok");
    await send("second");

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const secondBody = JSON.parse(
      (fetchMock.mock.calls[1][1] as RequestInit).body as string
    );
    expect(secondBody.message).toBe("second");
    expect(secondBody.history).toEqual([
      { role: "user", content: "first" },
      { role: "assistant", content: "ok" },
    ]);
  });

  it("shows an error when the request fails", async () => {
    fetchMock = vi.fn(() => jsonResponse({}, false));
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatSidebar projectId={1} onBoardUpdated={vi.fn()} />);

    await send("hi");

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("clears the conversation when the project changes", async () => {
    fetchMock = vi.fn(() => jsonResponse({ reply: "Hello back", board: null }));
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = render(
      <ChatSidebar projectId={1} onBoardUpdated={vi.fn()} />
    );
    await send("hi there");
    expect(await screen.findByText("Hello back")).toBeInTheDocument();

    rerender(<ChatSidebar projectId={2} onBoardUpdated={vi.fn()} />);
    expect(screen.queryByText("Hello back")).not.toBeInTheDocument();
    expect(screen.queryByText("hi there")).not.toBeInTheDocument();
  });
});
