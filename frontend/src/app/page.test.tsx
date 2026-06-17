import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("Home", () => {
  it("renders the kanban board with five columns", () => {
    render(<Home />);
    expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
  });
});
