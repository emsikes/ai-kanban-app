import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Home", () => {
  it("renders the login gate when unauthenticated", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ authenticated: false }),
        } as Response)
      )
    );
    render(<Home />);
    expect(
      await screen.findByRole("heading", { name: /sign in/i })
    ).toBeInTheDocument();
  });
});
