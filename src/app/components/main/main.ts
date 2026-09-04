import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBars, faSmile } from '@fortawesome/free-solid-svg-icons';
import { Capacitor } from '@capacitor/core';
import { Menu } from "../menu/menu";
import { FileBrowser } from "../file-browser/file-browser";
import { FileBrowserService, type BrowserEntry } from "../../services/file-browser.service";
import { FileTree } from "../../services/file-tree.plugin";
import { Reproductor } from "../reproductor/reproductor";
import type { BookmarkItem } from "../menu/menu";

@Component({
  imports: [CommonModule, FontAwesomeModule, Menu, FileBrowser, Reproductor],
  selector: 'app-main',
  styleUrl: './main.css',
  templateUrl: './main.html',
})
export class Main implements OnInit {

  // Iconos de FontAwesome
  faBars = faBars;
  faSmile = faSmile;

  readonly fileBrowser = inject(FileBrowserService);
  @ViewChild('fileBrowserRef') fileBrowserRef?: FileBrowser;

  // Ruta de la carpeta seleccionada en el menú
  selectedPath: string = '';

  // Marcadores agregados/guardados desde el menú
  bookmarks: BookmarkItem[] = [];

  // Estado para controlar si el menú está visible o no
  isMenuOpen: boolean = false;

  // Método para alternar la visibilidad del menú
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  onFolderSelected(path: string): void {
    this.selectedPath = path;
    this.refreshStatus();
  }

  onBookmarksChange(items: BookmarkItem[]): void {
    this.bookmarks = items;
    void this.checkPermissions(items);
  }

  readonly permissionMap = signal<Record<string, boolean>>({});

  readonly rootTreeUri = signal<string | undefined>(this.loadRootTreeUri());

  ngOnInit(): void {
    // Validación de permisos de marcadores al iniciar la app (desactivada temporalmente).
    // Para reactivarla, descomenta la siguiente línea:
    // void this.checkPermissions(this.bookmarks);
  }

  private loadRootTreeUri(): string | undefined {
    if (typeof document === 'undefined') {
      return undefined;
    }
    const matches = document.cookie.match(/(?:^|;\s*)isdeRootTree=([^;]*)/);
    if (!matches) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(decodeURIComponent(matches[1])) as { treeUri?: string };
      return typeof parsed.treeUri === 'string' ? parsed.treeUri : undefined;
    } catch (error) {
      console.warn('No se pudo cargar el acceso total desde la cookie:', error);
      return undefined;
    }
  }

  private saveRootTreeUri(treeUri: string | undefined): void {
    if (typeof document === 'undefined') {
      return;
    }
    const value = treeUri !== undefined ? encodeURIComponent(JSON.stringify({ treeUri })) : '';
    document.cookie = `isdeRootTree=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }

  onGrantAllAccess(): void {
    if (!Capacitor.isNativePlatform()) {
      window.alert('El acceso total solo está disponible desde el dispositivo.');
      return;
    }
    void FileTree.pickTree({ startDocumentUri: undefined })
      .then((result) => {
        this.setRootTreeUri(result.treeUri);
      })
      .catch((error) => {
        if (!(error instanceof Error) || error.message !== 'pickDirectory canceled.') {
          console.error('Error al pedir acceso total:', error);
        }
      });
  }

  setRootTreeUri(treeUri: string): void {
    this.rootTreeUri.set(treeUri);
    this.saveRootTreeUri(treeUri);
    void this.checkPermissions(this.bookmarks);
  }

  private treeUnderRoot(uri: string): boolean {
    const root = this.rootTreeUri();
    if (!root) {
      return false;
    }
    const rootId = this.treeIdSegments(root);
    const uriId = this.treeIdSegments(uri);
    if (rootId.length === 0 || uriId.length < rootId.length) {
      return false;
    }
    for (let i = 0; i < rootId.length; i++) {
      if (rootId[i] !== uriId[i]) {
        return false;
      }
    }
    return true;
  }

  private treeIdSegments(uri: string): string[] {
    const match = uri.match(/\/tree\/([^/]+)$/);
    if (!match) {
      return [];
    }
    let treeId: string;
    try {
      treeId = decodeURIComponent(match[1]);
    } catch {
      treeId = match[1];
    }
    return treeId.split('/').filter((segment) => segment.length > 0);
  }

  private async checkPermissions(items: BookmarkItem[]): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    const treeUris = [...new Set(items.filter((item) => item.treeUri).map((item) => item.treeUri as string))];
    const next = { ...this.permissionMap() };
    await Promise.all(
      treeUris.map(async (uri) => {
        if (this.treeUnderRoot(uri)) {
          next[uri] = true;
          return;
        }
        try {
          const result = await FileTree.check({ treeUri: uri });
          next[uri] = result.ok;
        } catch {
          next[uri] = false;
        }
      }),
    );
    this.permissionMap.set(next);
  }

  bookmarkDenied(bookmark: BookmarkItem): boolean {
    return !!bookmark.treeUri && this.permissionMap()[bookmark.treeUri] === false;
  }

  statusInfo: {
    total: number;
    targets: Array<{ bookmark: BookmarkItem; count: number }>;
  } = { total: 0, targets: [] };

  private refreshStatus(): void {
    const summary = this.fileBrowserRef?.statusSummary();
    this.statusInfo = summary ?? { total: 0, targets: [] };
  }

  onFileBrowserClick(): void {
    this.refreshStatus();
  }

  readonly mediaEntry = signal<BrowserEntry | null>(null);

  onOpenMedia(entry: BrowserEntry): void {
    this.mediaEntry.set(entry);
  }

  onCloseMedia(): void {
    this.mediaEntry.set(null);
  }

  async onMoveTriggered(): Promise<void> {
    void this.fileBrowserRef?.moveSelectedToBookmarks();
    this.syncProgress();
    this.refreshStatus();
  }

  readonly moveProgress = signal<{ current: number; total: number } | null>(null);

  private progressTimer: ReturnType<typeof setInterval> | null = null;

  syncProgress(): void {
    const progress = this.fileBrowserRef?.moveProgress() ?? null;
    this.moveProgress.set(progress);
    if (progress) {
      if (!this.progressTimer) {
        this.progressTimer = setInterval(() => {
          const current = this.fileBrowserRef?.moveProgress() ?? null;
          this.moveProgress.set(current);
          if (!current && this.progressTimer) {
            clearInterval(this.progressTimer);
            this.progressTimer = null;
          }
        }, 200);
      }
    } else if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }
}
