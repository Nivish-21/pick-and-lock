import { useCallback, useEffect, useState, type RefObject } from "react";

interface ChatMentionPopupProps {
  inputValue: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onInsertMention: (newValue: string) => void;
}

const MENTION_OPTIONS = ["agent"];

export function ChatMentionPopup({ inputValue, inputRef, onInsertMention }: ChatMentionPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const insertMention = useCallback(
    (mention: string) => {
      const input = inputRef.current;
      if (!input) return;

      const cursorPos = input.selectionStart ?? 0;
      const textBeforeCursor = inputValue.slice(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex === -1) return;

      const beforeMention = inputValue.slice(0, lastAtIndex);
      const afterMention = inputValue.slice(cursorPos);
      const newValue = `${beforeMention}@${mention} ${afterMention}`;

      onInsertMention(newValue);
      setIsOpen(false);

      // Restore focus and move cursor after inserted text
      setTimeout(() => {
        input.focus();
        const newCursorPos = lastAtIndex + mention.length + 2; // @ + mention + space
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [inputRef, inputValue, onInsertMention]
  );

  // Detect "@" trigger and filter options
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const cursorPos = input.selectionStart ?? 0;
    const textBeforeCursor = inputValue.slice(0, cursorPos);

    // Find the last "@" before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtIndex === -1) {
      setIsOpen(false);
      return;
    }

    // Check if "@" is at word boundary (start or after whitespace)
    const beforeAt = lastAtIndex === 0 ? null : textBeforeCursor[lastAtIndex - 1];
    if (beforeAt !== null && beforeAt !== " " && beforeAt !== "\n") {
      setIsOpen(false);
      return;
    }

    // Get query text after "@"
    const queryText = textBeforeCursor.slice(lastAtIndex + 1).toLowerCase();
    setQuery(queryText);

    // Check if any options match
    const hasMatch = MENTION_OPTIONS.some((opt) => opt.startsWith(queryText));
    setIsOpen(hasMatch);
    setHighlightedIndex(0);
  }, [inputValue, inputRef]);

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        event.preventDefault();
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        insertMention(MENTION_OPTIONS[highlightedIndex]);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedIndex((idx) => (idx + 1) % MENTION_OPTIONS.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIndex((idx) => (idx - 1 + MENTION_OPTIONS.length) % MENTION_OPTIONS.length);
      }
    };

    const input = inputRef.current;
    input?.addEventListener("keydown", handleKeyDown);
    return () => input?.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, highlightedIndex, inputRef, insertMention]);

  if (!isOpen) return null;

  const matchingOptions = MENTION_OPTIONS.filter((opt) => opt.startsWith(query));

  return (
    <div className="chat-mention-popup" role="listbox">
      {matchingOptions.map((option, index) => (
        <div
          key={option}
          className={`chat-mention-option ${index === highlightedIndex ? "highlighted" : ""}`}
          role="option"
          aria-selected={index === highlightedIndex}
          onClick={() => insertMention(option)}
        >
          <span className="chat-mention-icon">🤖</span>
          <span className="chat-mention-label">{option}</span>
          <span className="chat-mention-desc">mention the assistant</span>
        </div>
      ))}
    </div>
  );
}
