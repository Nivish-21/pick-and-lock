export type DebouncedItem<T> = {
  roomId: number;
  item: T;
};

export class RoomDebouncer<T> {
  private readonly queues = new Map<number, T[]>();
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly delayMs: number,
    private readonly onFlush: (batch: DebouncedItem<T>[]) => void | Promise<void>,
  ) {}

  schedule(roomId: number, item: T): void {
    const queue = this.queues.get(roomId) ?? [];
    queue.push(item);
    this.queues.set(roomId, queue);

    const pending = this.timers.get(roomId);
    if (pending) clearTimeout(pending);
    this.timers.set(
      roomId,
      setTimeout(() => {
        this.timers.delete(roomId);
        const items = this.queues.get(roomId) ?? [];
        this.queues.delete(roomId);
        void this.onFlush(items.map((queuedItem) => ({ roomId, item: queuedItem })));
      }, this.delayMs),
    );
  }

  cancel(roomId: number): void {
    const pending = this.timers.get(roomId);
    if (pending) clearTimeout(pending);
    this.timers.delete(roomId);
    this.queues.delete(roomId);
  }

  dispose(): void {
    for (const roomId of this.timers.keys()) this.cancel(roomId);
  }
}
