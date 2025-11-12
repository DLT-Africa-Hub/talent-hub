type AsyncTask = () => Promise<void>;

export class AsyncTaskQueue {
  private readonly queue: AsyncTask[] = [];
  private processing = false;

  constructor(private readonly name: string) {}

  enqueue(task: AsyncTask): void {
    this.queue.push(task);
    void this.process();
  }

  private async process(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;
    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift();
        if (!task) {
          continue;
        }

        try {
          await task();
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`[AsyncTaskQueue:${this.name}] Task execution failed`, error);
        }
      }
    } finally {
      this.processing = false;
    }
  }
}


