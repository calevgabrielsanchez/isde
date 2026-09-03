import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faFile, faFolder, faFileImage,
  faFilePdf, faFileWord, faFileExcel, faFilePowerpoint, faFileAudio, faFileVideo,
  faFileCode, faFileZipper, faFileCsv, faFileLines } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { FileBrowserService, isTextFileName, type BrowserEntry } from '../../services/file-browser.service';
import { FileTree } from '../../services/file-tree.plugin';
import type { BookmarkItem } from '../menu/menu';

export type BookmarkEdge = 'top' | 'bottom' | 'left' | 'right';

const PLAYABLE_VIDEO = /\.(mp4|webm|m4v|ogv|mov|mkv|3gp|3g2)$/i;
const PLAYABLE_AUDIO = /\.(mp3|m4a|ogg|oga|wav|flac|aac|opus|wma)$/i;
const PLAYABLE_PDF = /\.pdf$/i;

const FILE_ICON_BY_EXTENSION: Record<string, IconDefinition> = {
  pdf: faFilePdf,
  doc: faFileWord, docx: faFileWord, rtf: faFileWord, odt: faFileWord,
  xls: faFileExcel, xlsx: faFileExcel, ods: faFileExcel, csv: faFileCsv,
  ppt: faFilePowerpoint, pptx: faFilePowerpoint, odp: faFilePowerpoint,
  zip: faFileZipper, rar: faFileZipper, '7z': faFileZipper, tar: faFileZipper, gz: faFileZipper, bz2: faFileZipper,
  mp3: faFileAudio, m4a: faFileAudio, wav: faFileAudio, ogg: faFileAudio, flac: faFileAudio,
  aac: faFileAudio, opus: faFileAudio, wma: faFileAudio, oga: faFileAudio,
  mp4: faFileVideo, webm: faFileVideo, m4v: faFileVideo, ogv: faFileVideo, avi: faFileVideo,
  mov: faFileVideo, mkv: faFileVideo, '3gp': faFileVideo, '3g2': faFileVideo,
  js: faFileCode, jsx: faFileCode, mjs: faFileCode, ts: faFileCode, tsx: faFileCode,
  py: faFileCode, php: faFileCode, rb: faFileCode, java: faFileCode, c: faFileCode,
  cpp: faFileCode, cc: faFileCode, h: faFileCode, hpp: faFileCode, go: faFileCode,
  rs: faFileCode, swift: faFileCode, kt: faFileCode, sh: faFileCode, bash: faFileCode,
  sql: faFileCode, json: faFileCode, html: faFileCode, htm: faFileCode, css: faFileCode,
  scss: faFileCode, xml: faFileCode, yaml: faFileCode, yml: faFileCode, vue: faFileCode,
  md: faFileCode, svelte: faFileCode, gitignore: faFileCode, dockerfile: faFileCode,
  txt: faFileLines, log: faFileLines, text: faFileLines,
};

export interface BookmarkPosition {
  edge: BookmarkEdge;
  offset: number;
  count: number;
}

const EDGE_ORDER: BookmarkEdge[] = ['top', 'bottom', 'left', 'right'];
const EDGE_CAPS: Record<BookmarkEdge, number> = { top: 6, bottom: 6, left: 3, right: 3 };

function bookmarkPositions(total: number): BookmarkPosition[] {
  const counts: Record<BookmarkEdge, number> = { top: 0, bottom: 0, left: 0, right: 0 };
  let remaining = total;
  for (const edge of EDGE_ORDER) {
    counts[edge] = Math.min(EDGE_CAPS[edge], remaining);
    remaining -= counts[edge];
  }
  const positions: BookmarkPosition[] = [];
  for (const edge of EDGE_ORDER) {
    for (let offset = 0; offset < counts[edge]; offset++) {
      positions.push({ edge, offset, count: counts[edge] });
    }
  }
  return positions;
}

@Component({
  imports: [CommonModule, FontAwesomeModule],
  standalone: true,
  selector: 'app-file-browser',
  styleUrl: './file-browser.css',
  templateUrl: './file-browser.html',
})
export class FileBrowser {

  faFile = faFile;
  faFolder = faFolder;
  faFileImage = faFileImage;

  fileIcon(entry: BrowserEntry): IconDefinition {
    if (entry.kind === 'directory') {
      return faFolder;
    }
    if (entry.isImage) {
      return faFileImage;
    }
    const segments = entry.name.split('.');
    const extension = segments.length > 1 ? (segments.pop() ?? '').toLowerCase() : '';
    return FILE_ICON_BY_EXTENSION[extension] ?? faFile;
  }

  readonly fileBrowser = inject(FileBrowserService);
  readonly visibleEntries = computed(() =>
    this.fileBrowser.entries().filter((entry) => entry.kind !== 'directory'),
  );
  readonly bookmarks = input<BookmarkItem[]>([]);
  readonly bookmarksByProfile = input<Record<string, BookmarkItem[]>>({});
  readonly activeProfileId = input<string>('');
  readonly permissionMap = input<Record<string, boolean>>({});
  readonly openMedia = output<BrowserEntry>();

  // Marcadores del perfil actualmente visible en la UI
  readonly activeProfileBookmarks = computed(
    () => this.bookmarksByProfile()[this.activeProfileId()] ?? this.bookmarks(),
  );

  onItemClick(entry: BrowserEntry): void {
    if (entry.kind === 'directory') {
      return;
    }
    if (entry.isImage
      || PLAYABLE_VIDEO.test(entry.name)
      || PLAYABLE_AUDIO.test(entry.name)
      || PLAYABLE_PDF.test(entry.name)
      || isTextFileName(entry.name)) {
      this.openMedia.emit(entry);
    }
  }

  bookmarkDenied(bookmark: BookmarkItem): boolean {
    return !!bookmark.treeUri && this.permissionMap()[bookmark.treeUri] === false;
  }

  readonly bookmarkSlots = computed(() => {
    const items = this.activeProfileBookmarks();
    return bookmarkPositions(items.length).map((position, index) => ({
      position,
      bookmark: items[index],
    }));
  });

  bookmarkStyle(position: BookmarkPosition): Record<string, string> {
    switch (position.edge) {
      case 'top':
        return { left: `${(position.offset + 1) * (100 / (position.count + 1))}%`, top: '0' };
      case 'bottom':
        return { left: `${(position.offset + 1) * (100 / (position.count + 1))}%`, bottom: '0' };
      case 'left':
        return { top: `${(position.offset + 1) * (100 / (position.count + 1))}%`, left: '0' };
      case 'right':
        return { top: `${(position.offset + 1) * (100 / (position.count + 1))}%`, right: '0' };
    }
  }

  // Selección por archivo: cada archivo recuerda el marcador de destino con su PERFIL
  // (profileId + index), de modo que las marcas de distintos perfiles se mantienen.
  readonly selectedBookmark = signal<Record<string, { profileId: string; index: number }>>({});

  readonly moveProgress = signal<{ current: number; total: number } | null>(null);

  readonly statusSummary = computed(() => {
    const selections = this.selectedBookmark();
    const byProfile = this.bookmarksByProfile();
    const entriesByPath = new Map(this.fileBrowser.entries().map((entry) => [entry.path, entry]));
    const targets = new Map<string, { bookmark: BookmarkItem; count: number }>();
    let total = 0;
    for (const [entryPath, sel] of Object.entries(selections)) {
      const entry = entriesByPath.get(entryPath);
      if (!entry) {
        continue;
      }
      const bookmark = byProfile[sel.profileId]?.[sel.index];
      if (!bookmark) {
        continue;
      }
      total++;
      const key = `${sel.profileId}:${sel.index}`;
      const current = targets.get(key);
      targets.set(key, {
        bookmark,
        count: (current?.count ?? 0) + 1,
      });
    }
    return { total, targets: [...targets.values()] };
  });

  selectBookmarkForEntry(entryPath: string, slotIndex: number): void {
    const profileId = this.activeProfileId();
    this.selectedBookmark.update((current) => ({
      ...current,
      [entryPath]: { profileId, index: slotIndex },
    }));
  }

  onFileBrowserClick(entryPath: string, slotIndex: number): void {
    const bookmark = this.activeProfileBookmarks()[slotIndex];
    if (bookmark && this.bookmarkDenied(bookmark)) {
      window.alert(
        `El marcador '${bookmark.name}' no tiene permiso para mover archivos. Bórralo y créalo de nuevo desde el dispositivo.`,
      );
      return;
    }
    const profileId = this.activeProfileId();
    this.selectedBookmark.update((current) => {
      const existing = current[entryPath];
      if (existing && existing.profileId === profileId && existing.index === slotIndex) {
        const next = { ...current };
        delete next[entryPath];
        return next;
      }
      return { ...current, [entryPath]: { profileId, index: slotIndex } };
    });
  }

  isBookmarkSelected(entryPath: string, slotIndex: number): boolean {
    const sel = this.selectedBookmark()[entryPath];
    return !!sel && sel.profileId === this.activeProfileId() && sel.index === slotIndex;
  }

  private bookmarkForSelection(sel: { profileId: string; index: number }): BookmarkItem | undefined {
    return this.bookmarksByProfile()[sel.profileId]?.[sel.index];
  }

  async moveSelectedToBookmarks(): Promise<void> {
    const selections = this.selectedBookmark();
    const pairs = this.fileBrowser.entries()
      .map((entry) => {
        const sel = selections[entry.path];
        const bookmark = sel ? this.bookmarkForSelection(sel) : undefined;
        return { entry, bookmark };
      })
      .filter(
        (p): p is { entry: BrowserEntry; bookmark: BookmarkItem } => p.bookmark !== undefined,
      );

    if (pairs.length === 0) {
      console.warn('Selecciona al menos un marcador en un archivo para moverlo.');
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      this.downloadMoveScript(pairs);
    }

    const failures: string[] = [];
    const total = pairs.length;
    this.moveProgress.set({ current: 0, total });

    for (const { entry, bookmark } of pairs) {
      try {
        if (Capacitor.isNativePlatform()) {
          await this.moveEntry(entry, bookmark);
        }
        this.fileBrowser.removeEntry(entry.path);
        this.deselectEntry(entry.path);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`'${entry.name}' → '${bookmark.name}': ${message}`);
        console.warn(failures[failures.length - 1]);
      }
      this.moveProgress.update((progress) =>
        progress ? { ...progress, current: progress.current + 1 } : progress,
      );
    }

    this.moveProgress.set(null);
    this.selectedBookmark.set({});

    if (failures.length > 0) {
      window.alert(`No se pudieron mover ${failures.length} archivo(s):\n\n${failures.join('\n')}`);
    }
  }

  private async moveEntry(entry: BrowserEntry, bookmark: BookmarkItem): Promise<void> {
    if (Capacitor.isNativePlatform() && entry.path.startsWith('content://')) {
      if (!bookmark.treeUri) {
        throw new Error(`El marcador '${bookmark.name}' no tiene referencia de árbol nativa. Crea el marcador de nuevo desde el dispositivo.`);
      }
      const destRelativePath = entry.name;
      try {
        await FileTree.move({
          sourceUri: entry.path,
          destTreeUri: bookmark.treeUri,
          destRelativePath,
        });
      } catch (error) {
        const message = error instanceof Error ? (error.message || '') : String(error);
        if (message.includes('Permission Denial')) {
          throw new Error(
            `Permiso vencido para el marcador '${bookmark.name}'. Bórralo y créalo otra vez desde el dispositivo con "Elegir carpeta" para restaurar el acceso`,
          );
        }
        throw error;
      }
      return;
    }
    const destination = `${bookmark.path.replace(/\/+$/, '')}/${entry.name}`;
    try {
      await Filesystem.rename({ from: entry.path, to: destination });
      return;
    } catch (renameError) {
      if (entry.kind === 'directory') {
        throw renameError;
      }
      const data = (await Filesystem.readFile({ path: entry.path })).data;
      await Filesystem.writeFile({ path: destination, data });
      await Filesystem.deleteFile({ path: entry.path });
    }
  }

  private downloadMoveScript(pairs: Array<{ entry: BrowserEntry; bookmark: BookmarkItem }>): void {
    const isWindows = /win/i.test(navigator.userAgent);
    const destVars = new Map<string, string>();
    const usedVars = new Set<string>();
    for (const { bookmark } of pairs) {
      if (destVars.has(bookmark.path)) {
        continue;
      }
      const base = this.sanitizeVariableName(bookmark.name);
      let candidate = base;
      let index = 2;
      while (usedVars.has(candidate)) {
        candidate = `${base}_${index++}`;
      }
      usedVars.add(candidate);
      destVars.set(bookmark.path, candidate);
    }

    const lines: string[] = isWindows
      ? [
          '@echo off',
          'REM Generado por isDe. Rellena las rutas reales entre comillas antes de ejecutar.',
          'REM SOURCE_ROOT debe apuntar a la carpeta que contiene los archivos de origen.',
          'SET "SOURCE_ROOT=ESCRIBE_AQUI_LA_RUTA_DE_LA_CARPETA_ORIGEN"',
        ]
      : [
          '#!/usr/bin/env bash',
          '# Generado por isDe. Rellena las rutas reales antes de ejecutar.',
          '# SOURCE_ROOT debe apuntar a la carpeta que contiene los archivos de origen.',
          'SOURCE_ROOT="ESCRIBE_AQUI_LA_RUTA_DE_LA_CARPETA_ORIGEN"',
        ];

    for (const [bookmarkPath, varName] of destVars) {
      const bookmark = pairs.find((pair) => pair.bookmark.path === bookmarkPath)?.bookmark;
      if (!bookmark) {
        continue;
      }
      if (isWindows) {
        lines.push(`SET "${varName}=ESCRIBE_AQUI_LA_RUTA_DE_${bookmark.name}"`);
      } else {
        lines.push(`${varName}="ESCRIBE_AQUI_LA_RUTA_DE_${bookmark.name}"`);
      }
    }
    lines.push('');

    let lastVar = '';
    for (const { entry, bookmark } of pairs) {
      const varName = destVars.get(bookmark.path) ?? 'DESTINO';
      const source = isWindows
        ? `%SOURCE_ROOT%\\${entry.path.replace(/\//g, '\\')}`
        : `"$SOURCE_ROOT/${entry.path}"`;
      const target = isWindows
        ? `%${varName}%\\${entry.name}`
        : `"$${varName}/${entry.name}"`;
      if (varName !== lastVar) {
        if (isWindows) {
          lines.push(`IF NOT EXIST "%${varName}%\\" MKDIR "%${varName}%"`);
        } else {
          lines.push(`mkdir -p "$${varName}"`);
        }
        lastVar = varName;
      }
      if (isWindows) {
        lines.push(`MOVE "${source}" "${target}"`);
      } else {
        lines.push(`mv ${source} ${target}`);
      }
    }
    if (isWindows) {
      lines.push('PAUSE');
    } else {
      lines.push('read -p "Pulsa Enter para cerrar..."');
    }

    const content = lines.join('\n');
    const blob = new Blob([content], { type: isWindows ? 'text/plain' : 'application/x-sh' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = isWindows ? 'mover-archivos.bat' : 'mover-archivos.sh';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    console.info(
      `Generado mover-archivos.${isWindows ? 'bat' : 'sh'}: rellena las rutas marcadas como ESCRIBE_AQUI y ejecútalo en ${isWindows ? 'Windows' : 'tu sistema'}.`,
    );
  }

  private sanitizeVariableName(name: string): string {
    const cleaned = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return cleaned || 'DESTINO';
  }

  private deselectEntry(entryPath: string): void {
    this.selectedBookmark.update((current) => {
      if (!(entryPath in current)) {
        return current;
      }
      const next = { ...current };
      delete next[entryPath];
      return next;
    });
  }
}