import { Injectable, signal } from '@angular/core';

export type BrowserEntryKind = 'file' | 'directory';

export interface BrowserEntry {
  name: string;
  path: string;
  kind: BrowserEntryKind;
  size: number | undefined;
  isImage: boolean;
  thumb: string | undefined;
  handle?: FileSystemHandle;
  file?: File;
}

export const MAX_FILES = 150;

@Injectable({ providedIn: 'root' })
export class FileBrowserService {

  readonly folderName = signal<string | null>(null);
  readonly entries = signal<BrowserEntry[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly sourceDirectory = signal<FileSystemDirectoryHandle | null>(null);

  beginLoad(folderName: string | null): void {
    this.revokeThumbnails();
    this.folderName.set(folderName);
    this.entries.set([]);
    this.error.set(null);
    this.loading.set(true);
  }

  setSourceDirectory(handle: FileSystemDirectoryHandle | null): void {
    this.sourceDirectory.set(handle);
  }

  addEntries(newEntries: BrowserEntry[]): void {
    if (newEntries.length === 0) {
      return;
    }
    this.entries.update((current) => {
      const combined = [...current];
      for (const entry of newEntries) {
        if (combined.length >= MAX_FILES) {
          break;
        }
        combined.push(entry);
      }
      return combined;
    });
  }

  setEntryThumb(path: string, thumb: string): void {
    this.entries.update((current) =>
      current.map((entry) => (entry.path === path ? { ...entry, thumb } : entry)),
    );
  }

  finishLoad(): void {
    this.loading.set(false);
  }

  removeEntry(path: string): void {
    const revokeEntry = this.entries().find((entry) => entry.path === path);
    if (revokeEntry?.thumb?.startsWith('blob:')) {
      URL.revokeObjectURL(revokeEntry.thumb);
    }
    this.entries.update((current) => current.filter((entry) => entry.path !== path));
  }

  fail(message: string): void {
    this.loading.set(false);
    this.error.set(message);
  }

  clear(): void {
    this.revokeThumbnails();
    this.folderName.set(null);
    this.entries.set([]);
    this.loading.set(false);
    this.error.set(null);
  }

  private revokeThumbnails(): void {
    for (const entry of this.entries()) {
      if (entry.thumb?.startsWith('blob:')) {
        URL.revokeObjectURL(entry.thumb);
      }
    }
  }
}