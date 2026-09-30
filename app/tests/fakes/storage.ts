import type { StorageClient } from "@/lib/storage/neon-storage-client";

export class RecordingObjectStorageFake implements StorageClient {
  readonly commands: unknown[] = [];

  async send(command: Parameters<StorageClient["send"]>[0]): Promise<unknown> {
    this.commands.push(command);

    return {};
  }
}
