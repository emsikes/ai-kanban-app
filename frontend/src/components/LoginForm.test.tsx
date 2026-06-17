import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/LoginForm";

describe("LoginForm", () => {
  it("submits the entered credentials", async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/username/i), "user");
    await userEvent.type(screen.getByLabelText(/password/i), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(onSubmit).toHaveBeenCalledWith("user", "password");
  });

  it("does not submit when fields are empty", async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows an error message when provided", () => {
    render(
      <LoginForm onSubmit={vi.fn()} error="Invalid username or password." />
    );
    expect(
      screen.getByText(/invalid username or password/i)
    ).toBeInTheDocument();
  });
});
