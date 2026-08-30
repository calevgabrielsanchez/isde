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

const TEXT_EXTENSION = /\.(txt|text|md|markdown|json|jsonc|csv|tsv|log|xml|html|htm|css|scss|sass|less|yaml|yml|toml|ini|cfg|conf|js|mjs|cjs|ts|tsx|jsx|py|rb|php|java|c|cc|cpp|h|hpp|go|rs|swift|kt|sh|bash|zsh|bat|cmd|ps1|sql|env|properties|vue|svelte|gitignore|dockerfile|editorconfig|lock|glsl|vert|frag)$/i;
const TEXT_FILENAMES = /^(readme|read_me|license|copying|copyright|changelog|changes|authors|citation|notice|manifest|makefile|dockerfile|gemfile|rakefile|gruntfile|gulpfile|package|composer|pyproject|pom|build|tsconfig)$/i;

export function isTextFileName(name: string): boolean {
  const clean = name.trim();
  if (/^\./.test(clean) || clean.includes('.')) {
    return TEXT_EXTENSION.test(clean);
  }
  return TEXT_FILENAMES.test(clean);
}

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