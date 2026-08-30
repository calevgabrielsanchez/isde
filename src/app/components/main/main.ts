import { Component, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBars, faSmile } from '@fortawesome/free-solid-svg-icons';
import { Capacitor } from '@capacitor/core';
import { Menu } from "../menu/menu";
import { FileBrowser } from "../file-browser/file-browser";
import { FileBrowserService } from "../../services/file-browser.service";
import { FileTree } from "../../services/file-tree.plugin";
import type { BookmarkItem } from "../menu/menu";

@Component({
  imports: [CommonModule, FontAwesomeModule, Menu, FileBrowser],
  selector: 'app-main',
  styleUrl: './main.css',
  templateUrl: './main.html',
})
export class Main {
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

  private async checkPermissions(items: BookmarkItem[]): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    const treeUris = [...new Set(items.filter((item) => item.treeUri).map((item) => item.treeUri as string))];
    const next = { ...this.permissionMap() };
    await Promise.all(
      treeUris.map(async (uri) => {
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

  onMoveTriggered(): void {
    void this.fileBrowserRef?.moveSelectedToBookmarks();
    this.refreshStatus();
  }
}
