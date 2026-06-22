import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectBar } from "@/components/ProjectBar";
import type { Project } from "@/lib/projects";

const projects: Project[] = [
  { id: 1, name: "Alpha", position: 0 },
  { id: 2, name: "Beta", position: 1 },
];

function renderBar(overrides: Partial<Parameters<typeof ProjectBar>[0]> = {}) {
  const props = {
    projects,
    activeProjectId: 1,
    onSwitch: vi.fn(),
    onCreate: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    onReorder: vi.fn(),
    onLogout: vi.fn(),
    ...overrides,
  };
  render(<ProjectBar {...props} />);
  return props;
}

const openMenu = async () => {
  await userEvent.click(screen.getByRole("button", { name: /switch project/i }));
};

describe("ProjectBar", () => {
  it("shows the active project name", () => {
    renderBar();
    expect(
      screen.getByRole("button", { name: /switch project/i })
    ).toHaveTextContent("Alpha");
  });

  it("switches to another project", async () => {
    const props = renderBar();
    await openMenu();
    await userEvent.click(screen.getByRole("button", { name: "Beta" }));
    expect(props.onSwitch).toHaveBeenCalledWith(2);
  });

  it("creates a project", async () => {
    const props = renderBar();
    await openMenu();
    await userEvent.type(
      screen.getByPlaceholderText(/new project name/i),
      "Gamma"
    );
    await userEvent.click(screen.getByRole("button", { name: /^add$/i }));
    expect(props.onCreate).toHaveBeenCalledWith("Gamma");
  });

  it("renames a project", async () => {
    const props = renderBar();
    await openMenu();
    await userEvent.click(screen.getByRole("button", { name: /rename alpha/i }));
    const input = screen.getByLabelText("Project name");
    await userEvent.clear(input);
    await userEvent.type(input, "Alpha 2{Enter}");
    expect(props.onRename).toHaveBeenCalledWith(1, "Alpha 2");
  });

  it("deletes a project after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const props = renderBar();
    await openMenu();
    await userEvent.click(screen.getByRole("button", { name: /delete beta/i }));
    expect(props.onDelete).toHaveBeenCalledWith(2);
  });

  it("reorders a project down", async () => {
    const props = renderBar();
    await openMenu();
    await userEvent.click(screen.getByRole("button", { name: /move alpha down/i }));
    expect(props.onReorder).toHaveBeenCalledWith([2, 1]);
  });

  it("logs out", async () => {
    const props = renderBar();
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    expect(props.onLogout).toHaveBeenCalled();
  });
});
