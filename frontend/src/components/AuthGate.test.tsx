import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthGate } from "@/components/AuthGate";

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const signIn = async () => {
  await userEvent.type(screen.getByLabelText(/username/i), "user");
  await userEvent.type(screen.getByLabelText(/password/i), "password");
  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
};

describe("AuthGate", () => {
  it("shows the login form when unauthenticated", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => jsonResponse({ authenticated: false }))
    );
    render(<AuthGate />);
    expect(
      await screen.findByRole("heading", { name: /sign in/i })
    ).toBeInTheDocument();
  });

  it("shows the board when already authenticated", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => jsonResponse({ authenticated: true }))
    );
    render(<AuthGate />);
    await waitFor(() =>
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5)
    );
  });

  it("logs in with valid credentials and reveals the board", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url === "/api/session") return jsonResponse({ authenticated: false });
        if (url === "/api/login") return jsonResponse({ authenticated: true });
        return jsonResponse({});
      })
    );
    render(<AuthGate />);
    await screen.findByRole("heading", { name: /sign in/i });
    await signIn();
    await waitFor(() =>
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5)
    );
  });

  it("shows an error on invalid credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url === "/api/session") return jsonResponse({ authenticated: false });
        if (url === "/api/login") return jsonResponse({ detail: "no" }, false);
        return jsonResponse({});
      })
    );
    render(<AuthGate />);
    await screen.findByRole("heading", { name: /sign in/i });
    await signIn();
    expect(
      await screen.findByText(/invalid username or password/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId(/column-/i)).not.toBeInTheDocument();
  });

  it("logs out and returns to the login form", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url === "/api/session") return jsonResponse({ authenticated: true });
        if (url === "/api/logout") return jsonResponse({ authenticated: false });
        return jsonResponse({});
      })
    );
    render(<AuthGate />);
    await waitFor(() =>
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5)
    );
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    expect(
      await screen.findByRole("heading", { name: /sign in/i })
    ).toBeInTheDocument();
  });
});
