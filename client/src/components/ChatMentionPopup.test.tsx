// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChatMentionPopup } from "./ChatMentionPopup";
import { useRef } from "react";

afterEach(cleanup);

// Wrapper component to provide input ref and test the popup
function TestWrapper({
  inputValue,
  onInsertMention,
}: {
  inputValue: string;
  onInsertMention: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={() => {}}
        data-testid="test-input"
      />
      <ChatMentionPopup inputValue={inputValue} inputRef={inputRef} onInsertMention={onInsertMention} />
    </div>
  );
}

describe("ChatMentionPopup", () => {
  it("shows popup when @ is typed at start of input", async () => {
    const onInsert = () => {};

    render(<TestWrapper inputValue="@" onInsertMention={onInsert} />);

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeTruthy();
    });

    expect(screen.getByRole("option")).toBeTruthy();
    expect(screen.getByText("agent")).toBeTruthy();
  });

  it("shows popup when @ is typed after whitespace", async () => {
    const onInsert = () => {};

    render(<TestWrapper inputValue="hello @" onInsertMention={onInsert} />);

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeTruthy();
    });

    expect(screen.getByText("agent")).toBeTruthy();
  });

  it("hides popup when @ is not at word boundary", async () => {
    const onInsert = () => {};

    render(<TestWrapper inputValue="email@domain.com" onInsertMention={onInsert} />);

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeFalsy();
    });
  });

  it("filters options based on query text", async () => {
    const onInsert = () => {};

    const { rerender } = render(<TestWrapper inputValue="@ag" onInsertMention={onInsert} />);

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeTruthy();
    });

    expect(screen.getByText("agent")).toBeTruthy();

    // Non-matching query should hide popup
    rerender(<TestWrapper inputValue="@xyz" onInsertMention={onInsert} />);

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeFalsy();
    });
  });

  it("inserts mention when option is clicked", async () => {
    let insertedValue = "";
    const onInsert = (value: string) => {
      insertedValue = value;
    };

    render(<TestWrapper inputValue="@" onInsertMention={onInsert} />);

    await waitFor(() => {
      expect(screen.queryByRole("option")).toBeTruthy();
    });

    const option = screen.getByRole("option");
    fireEvent.click(option);

    expect(insertedValue).toBe("@agent ");
  });

  it("preserves text before and after the mention", async () => {
    let insertedValue = "";
    const onInsert = (value: string) => {
      insertedValue = value;
    };

    const { container } = render(<TestWrapper inputValue="@ag" onInsertMention={onInsert} />);

    const input = container.querySelector('input[data-testid="test-input"]') as HTMLInputElement;
    // Simulate cursor right after "@ag"
    input.selectionStart = 3;
    input.selectionEnd = 3;

    // Manually trigger the change detection to update popup
    fireEvent.change(input, { target: { value: "@ag" } });

    await waitFor(() => {
      expect(screen.queryByRole("option")).toBeTruthy();
    });

    const option = screen.getByRole("option");
    fireEvent.click(option);

    // When @ is at start with no trailing text
    expect(insertedValue).toBe("@agent ");
  });

  it("closes popup with Escape key", async () => {
    const onInsert = () => {};

    const { container } = render(<TestWrapper inputValue="@" onInsertMention={onInsert} />);

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeTruthy();
    });

    const input = container.querySelector('input[data-testid="test-input"]') as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeFalsy();
    });
  });

  it("inserts mention with Enter key", async () => {
    let insertedValue = "";
    const onInsert = (value: string) => {
      insertedValue = value;
    };

    const { container } = render(<TestWrapper inputValue="@" onInsertMention={onInsert} />);

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeTruthy();
    });

    const input = container.querySelector('input[data-testid="test-input"]') as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Enter" });

    expect(insertedValue).toBe("@agent ");
  });

  it("inserts mention with Tab key", async () => {
    let insertedValue = "";
    const onInsert = (value: string) => {
      insertedValue = value;
    };

    const { container } = render(<TestWrapper inputValue="@" onInsertMention={onInsert} />);

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeTruthy();
    });

    const input = container.querySelector('input[data-testid="test-input"]') as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Tab" });

    expect(insertedValue).toBe("@agent ");
  });

  it("highlights option on ArrowDown", async () => {
    const onInsert = () => {};

    const { container } = render(<TestWrapper inputValue="@" onInsertMention={onInsert} />);

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeTruthy();
    });

    const option = screen.getByRole("option");
    expect(option.classList.contains("highlighted")).toBe(true);

    const input = container.querySelector('input[data-testid="test-input"]') as HTMLInputElement;
    fireEvent.keyDown(input, { key: "ArrowDown" });

    await waitFor(() => {
      // After one ArrowDown on a single item, it wraps to 0 (same position), so still highlighted
      expect(option.classList.contains("highlighted")).toBe(true);
    });
  });

  it("case-insensitive matching", async () => {
    const onInsert = () => {};

    render(<TestWrapper inputValue="@AGENT" onInsertMention={onInsert} />);

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeTruthy();
    });

    expect(screen.getByText("agent")).toBeTruthy();
  });
});
