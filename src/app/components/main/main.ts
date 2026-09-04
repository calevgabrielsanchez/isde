import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBars, faSmile, faFolderOpen, faDragon, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Menu } from "../menu/menu";
import { FileBrowser } from "../file-browser/file-browser";
import { FileBrowserService, type BrowserEntry } from "../../services/file-browser.service";
import { FileTree } from "../../services/file-tree.plugin";
import { Reproductor } from "../reproductor/reproductor";
import type { BookmarkItem } from "../menu/menu";
import { resolveBookmarkIcon } from "../menu/menu";

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
  faFolderOpen = faFolderOpen;
  faDragon = faDragon;
  faGlobe = faGlobe;

  // Modos del botón de perfil (ciclo al hacer clic)
  profileModes = [
    { id: 'archivos', icon: faFolderOpen, label: 'Archivos' },
    { id: 'calevrije', icon: faDragon, label: 'CaleVRije' },
    { id: 'universo', icon: faGlobe, label: 'Universo' },
  ];
  profileIndex = signal(0);

  get profileIcon() {
    return this.profileModes[this.profileIndex()].icon;
  }

  getProfileLabel(): string {
    return this.profileModes[this.profileIndex()].label;
  }

  // Cada perfil tiene sus propios marcadores (memoria independiente).
  // Cada memoria se persiste en su PROPIA cookie (web) o su propia clave de Preferences (nativo).
  readonly BOOKMARKS_COOKIE_PREFIX = 'isdeBookmarks';
  readonly BOOKMARKS_PREFERENCE_PREFIX = 'isdeBookmarks';
  readonly BOOKMARKS_MAX_AGE = 60 * 60 * 24 * 365;

  // Slots de memoria independientes, indexados por id de perfil
  bookmarksMap = signal<Record<string, BookmarkItem[]>>(this.loadBookmarksMap());

  private cookieNameFor(profileId: string): string {
    return `${this.BOOKMARKS_COOKIE_PREFIX}-${profileId}`;
  }

  private preferenceNameFor(profileId: string): string {
    return `${this.BOOKMARKS_PREFERENCE_PREFIX}-${profileId}`;
  }

  get activeProfileId(): string {
    return this.profileModes[this.profileIndex()].id;
  }

  // Todas las memorias de marcadores, por perfil (para que el file-browser conozca
  // cada marcador con su perfil y pueda gestionar marcas de distintos perfiles a la vez)
  get profileBookmarksMap(): Record<string, BookmarkItem[]> {
    return this.bookmarksMap();
  }

  // Marcadores activos (del perfil actual) para el file-browser
  bookmarks = signal<BookmarkItem[]>(
    this.bookmarksMap()[this.profileModes[this.profileIndex()].id] ?? [],
  );

  // Set inicial/memoria que se le inyecta al menú para el perfil actual
  get profileBookmarks(): BookmarkItem[] | null {
    return this.bookmarksMap()[this.activeProfileId] ?? [];
  }

  cycleProfile(): void {
    this.persistActiveBookmarks();
    this.profileIndex.set((this.profileIndex() + 1) % this.profileModes.length);
    this.loadActiveBookmarks();
    void this.checkPermissions(this.bookmarks());
  }

  private persistActiveBookmarks(): void {
    // Guarda el set del perfil que se está dejando (el actual) ANTES de cambiar el índice
    const leavingId = this.profileModes[this.profileIndex()].id;
    this.bookmarksMap.update((map) => ({ ...map, [leavingId]: this.bookmarks() }));
    this.saveBookmarksFor(leavingId);
  }

  private loadActiveBookmarks(): void {
    this.bookmarks.set(
      this.bookmarksMap()[this.profileModes[this.profileIndex()].id] ?? [],
    );
  }

  // --- Persistencia por perfil (una cookie / clave por perfil) ---

  private loadBookmarksMap(): Record<string, BookmarkItem[]> {
    if (this.isNative()) {
      // En nativo la carga real se hace en ngOnInit (Preferences async).
      return {};
    }
    const map: Record<string, BookmarkItem[]> = {};
    for (const mode of this.profileModes) {
      const items = this.readCookieArray(this.cookieNameFor(mode.id));
      if (items.length > 0 || this.cookieExists(this.cookieNameFor(mode.id))) {
        map[mode.id] = items;
      }
    }
    return map;
  }

  private cookieExists(name: string): boolean {
    if (typeof document === 'undefined') {
      return false;
    }
    return new RegExp(`(?:^|;\\s*)${name}=`).test(document.cookie);
  }

  private readCookieArray(name: string): BookmarkItem[] {
    if (typeof document === 'undefined') {
      return [];
    }
    const matches = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    if (!matches) {
      return [];
    }
    try {
      const parsed = JSON.parse(decodeURIComponent(matches[1])) as Array<{
        name: string;
        path: string;
        icon: string;
        treeUri?: string;
        treePath?: string;
      }>;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .filter((item) => typeof item?.name === 'string' && typeof item?.path === 'string')
        .map((item) => ({
          name: item.name,
          path: item.path,
          icon: this.matchBookmarkIcon(item.icon),
          treeUri: typeof item.treeUri === 'string' ? item.treeUri : undefined,
          treePath: typeof item.treePath === 'string' ? item.treePath : undefined,
        }));
    } catch (error) {
      console.warn(`No se pudieron cargar los marcadores desde la cookie ${name}:`, error);
      return [];
    }
  }

  private serializedBookmarks(items: BookmarkItem[]): Array<{
    name: string;
    path: string;
    icon: string;
    treeUri?: string;
    treePath?: string;
  }> {
    return items.map(({ name, path, icon, treeUri, treePath }) => ({
      name,
      path,
      icon: icon.iconName,
      ...(treeUri !== undefined ? { treeUri } : {}),
      ...(treePath !== undefined ? { treePath } : {}),
    }));
  }

  private matchBookmarkIcon(iconName: string) {
    return resolveBookmarkIcon(iconName);
  }

  private saveBookmarksFor(profileId: string): void {
    const items = this.bookmarksMap()[profileId] ?? [];
    const value = JSON.stringify(this.serializedBookmarks(items));
    if (this.isNative()) {
      void Preferences.set({ key: this.preferenceNameFor(profileId), value });
      return;
    }
    if (typeof document === 'undefined') {
      return;
    }
    document.cookie = `${this.cookieNameFor(profileId)}=${encodeURIComponent(value)}; path=/; max-age=${this.BOOKMARKS_MAX_AGE}; SameSite=Lax`;
  }

  private isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  readonly fileBrowser = inject(FileBrowserService);
  @ViewChild('fileBrowserRef') fileBrowserRef?: FileBrowser;

  // Ruta de la carpeta seleccionada en el menú
  selectedPath: string = '';

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
    const id = this.activeProfileId;
    this.bookmarksMap.update((map) => ({ ...map, [id]: items }));
    this.bookmarks.set(items);
    this.saveBookmarksFor(id);
    void this.checkPermissions(items);
  }

  readonly permissionMap = signal<Record<string, boolean>>({});

  readonly rootTreeUri = signal<string | undefined>(this.loadRootTreeUri());

  ngOnInit(): void {
    if (this.isNative()) {
      void this.loadBookmarksMapNative();
    }
    void this.checkPermissions(this.bookmarks());
  }

  private async loadBookmarksMapNative(): Promise<void> {
    const map: Record<string, BookmarkItem[]> = {};
    for (const mode of this.profileModes) {
      const { value } = await Preferences.get({ key: this.preferenceNameFor(mode.id) });
      if (value === null || value === undefined) {
        continue;
      }
      try {
        const parsed = JSON.parse(value) as Array<{
          name: string;
          path: string;
          icon: string;
          treeUri?: string;
          treePath?: string;
        }>;
        if (!Array.isArray(parsed)) {
          continue;
        }
        map[mode.id] = parsed
          .filter((item) => typeof item?.name === 'string' && typeof item?.path === 'string')
          .map((item) => ({
            name: item.name,
            path: item.path,
            icon: this.matchBookmarkIcon(item.icon),
            treeUri: typeof item.treeUri === 'string' ? item.treeUri : undefined,
            treePath: typeof item.treePath === 'string' ? item.treePath : undefined,
          }));
      } catch (error) {
        console.warn(
          `No se pudieron cargar los marcadores desde Preferences para ${mode.id}:`,
          error,
        );
      }
    }
    this.bookmarksMap.set(map);
    this.loadActiveBookmarks();
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
    void this.checkPermissions(this.bookmarks());
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

  onMediaRenamed(event: { oldPath: string; newPath: string; newName: string }): void {
    const current = this.mediaEntry();
    this.fileBrowser.renameEntry(event.oldPath, event.newName, event.newPath);
    if (current && current.path === event.oldPath) {
      this.mediaEntry.set({ ...current, name: event.newName, path: event.newPath });
    }
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
