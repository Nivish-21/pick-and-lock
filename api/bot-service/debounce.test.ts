import { afterEach, describe, expect, it, vi } from "vitest";
import { RoomDebouncer } from "./debounce";

describe("RoomDebouncer", () => {
  afterEach(() => vi.useRealTimers());

  it("batches rapid items per room and resets the quiet timer", async () => {
    vi.useFakeTimers();
    const flush = vi.fn();
    const debouncer = new RoomDebouncer(2_000, flush);

    debouncer.schedule(7, "first");
    vi.advanceTimersByTime(1_000);
    debouncer.schedule(7, "second");
    vi.advanceTimersByTime(500);
    debouncer.schedule(8, "other room");
    vi.advanceTimersByTime(1_499);
    expect(flush).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(flush).toHaveBeenCalledWith([
      { roomId: 7, item: "first" },
      { roomId: 7, item: "second" },
    ]);
    vi.advanceTimersByTime(500);
    expect(flush).toHaveBeenCalledWith([
      { roomId: 8, item: "other room" },
    ]);
    debouncer.dispose();
  });
});
