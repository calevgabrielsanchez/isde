import { Component, computed, effect, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faFolderOpen, faBookmark, faChevronUp, faChevronDown,
  faHeart, faStar, faDownload, faImage, faMusic, faVideo, faFolder, faCamera, faCode,
  faPlus, faFilePen, faKey, faTrash, faCheck,faFolderPlus,
  faCircle, faSquare, faCube, faSeptagon, faPentagon, faOctagon, faHexagon, faShapes, 
  faGhost, faDragon, faCrow, faDemocrat, faLandmark, faRepublican, faTrophy, 
  faChess, faChessKnight, faChessPawn, faChessRook, faChessBishop, faChessQueen, faChessKing,
  faDiamond, faGem, faCloud, faComment, faEnvelope, faPaperPlane, faPaperclip, faThumbsUp, faThumbsDown,
  faTruck, faCar, faBicycle, faBus, faTrain, faShip, faPlane, faRocket, faSubway, faMotorcycle,
  faWebAwesome, faHippo, faHorse, faDog, faCat, faFish, faFrog, faSpider, 
faFire, faWater, faLeaf, faTree, faMountain, faSun, faMoon, faStarHalf, faHouse,
faPerson, faPersonDress, faGamepad, faPuzzlePiece, faLightbulb, faBook, faGraduationCap, faLaptop, faMobile, 
faFishFins, faBug, faPalette, faPencil, faBuilding, faSeedling, faRadio, faRadiation, faSpaghettiMonsterFlying,
  faSkull, faSkullCrossbones, faScrewdriverWrench, faSpinner
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import * as solidIconPack from '@fortawesome/free-solid-svg-icons';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Filesystem } from '@capacitor/filesystem';
import { FileTree } from '../../services/file-tree.plugin';
import { BrowserEntry, FileBrowserService, MAX_FILES } from '../../services/file-browser.service';

const IMAGE_EXTENSION = /\.(jpe?g|png|gif|bmp|webp|svg|avif|ico)$/i;
const BOOKMARKS_COOKIE = 'isdeBookmarks';
const BOOKMARKS_PREFERENCE = 'isdeBookmarks';
const BOOKMARKS_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const LAST_NATIVE_SOURCE_TREE_KEY = 'isdeLastNativeSourceTree';

export interface BookmarkIconOption {
  label: string;
  icon: IconDefinition;
}

const CURATED_BOOKMARK_ICON_OPTIONS: BookmarkIconOption[] = [
    { label: 'Marcador', icon: faBookmark },
    { label: 'Corazón', icon: faHeart },
    { label: 'Estrella', icon: faStar },
    { label: 'Descarga', icon: faDownload },
    { label: 'Imagen', icon: faImage },
    { label: 'Música', icon: faMusic },
    { label: 'Video', icon: faVideo },
    { label: 'Carpeta', icon: faFolder },
    { label: 'Cámara', icon: faCamera },
    { label: 'Código', icon: faCode },
    { label: 'Círculo', icon: faCircle },
    { label: 'Cuadrado', icon: faSquare },
    { label: 'Cubo', icon: faCube },
    { label: 'Septágono', icon: faSeptagon },
    { label: 'Pentágono', icon: faPentagon },
    { label: 'Octágono', icon: faOctagon },
    { label: 'Hexágono', icon: faHexagon },
    { label: 'Formas', icon: faShapes },
    { label: 'Fantasma', icon: faGhost },
    { label: 'Dragón', icon: faDragon },
    { label: 'Cuervo', icon: faCrow },
    { label: 'Demócrata', icon: faDemocrat },
    { label: 'Monumento', icon: faLandmark },
    { label: 'Republicano', icon: faRepublican },
    { label: 'Trofeo', icon: faTrophy },
    { label: 'Ajedrez', icon: faChess },
    { label: 'Caballo ajedrez', icon: faChessKnight },
    { label: 'Peón ajedrez', icon: faChessPawn },
    { label: 'Torre ajedrez', icon: faChessRook },
    { label: 'Alfil ajedrez', icon: faChessBishop },
    { label: 'Reina ajedrez', icon: faChessQueen },
    { label: 'Rey ajedrez', icon: faChessKing },
    { label: 'Diamante', icon: faDiamond },
    { label: 'Gema', icon: faGem },
    { label: 'Nube', icon: faCloud },
    { label: 'Comentario', icon: faComment },
    { label: 'Sobre', icon: faEnvelope },
    { label: 'Avión papel', icon: faPaperPlane },
    { label: 'Clip', icon: faPaperclip },
    { label: 'Pulgar arriba', icon: faThumbsUp },
    { label: 'Pulgar abajo', icon: faThumbsDown },
    { label: 'Camión', icon: faTruck },
    { label: 'Coche', icon: faCar },
    { label: 'Bicicleta', icon: faBicycle },
    { label: 'Autobús', icon: faBus },
    { label: 'Tren', icon: faTrain },
    { label: 'Barco', icon: faShip },
    { label: 'Avión', icon: faPlane },
    { label: 'Cohete', icon: faRocket },
    { label: 'Metro', icon: faSubway },
    { label: 'Moto', icon: faMotorcycle },
    { label: 'Web Awesome', icon: faWebAwesome },
    { label: 'Hipopótamo', icon: faHippo },
    { label: 'Caballo', icon: faHorse },
    { label: 'Perro', icon: faDog },
    { label: 'Gato', icon: faCat },
    { label: 'Pez', icon: faFish },
    { label: 'Rana', icon: faFrog },
    { label: 'Araña', icon: faSpider },
    { label: 'Fuego', icon: faFire },
    { label: 'Agua', icon: faWater },
    { label: 'Hoja', icon: faLeaf },
    { label: 'Árbol', icon: faTree },
    { label: 'Montaña', icon: faMountain },
    { label: 'Sol', icon: faSun },
    { label: 'Luna', icon: faMoon },
    { label: 'Media estrella', icon: faStarHalf },
    { label: 'Casa', icon: faHouse },
    { label: 'Persona', icon: faPerson },
    { label: 'Persona vestida', icon: faPersonDress },
    { label: 'Videojuegos', icon: faGamepad },
    { label: 'Rompecabezas', icon: faPuzzlePiece },
    { label: 'Bombilla', icon: faLightbulb },
    { label: 'Libro', icon: faBook },
    { label: 'Graduación', icon: faGraduationCap },
    { label: 'Portátil', icon: faLaptop },
    { label: 'Móvil', icon: faMobile },
    { label: 'Pez con aletas', icon: faFishFins },
    { label: 'Bicho', icon: faBug },
    { label: 'Paleta', icon: faPalette },
    { label: 'Lápiz', icon: faPencil },
    { label: 'Edificio', icon: faBuilding },
    { label: 'Plántula', icon: faSeedling },
    { label: 'Radio', icon: faRadio },
    { label: 'Radiación', icon: faRadiation },
    { label: 'Espagueti volador', icon: faSpaghettiMonsterFlying },
    { label: 'Calavera', icon: faSkull },
    { label: 'Calavera huesos', icon: faSkullCrossbones },
    { label: 'Desarmador-llave', icon: faScrewdriverWrench },
];

const curatedLabels = new Map(
  CURATED_BOOKMARK_ICON_OPTIONS.map(({ label, icon }) => [icon.iconName, label]),
);

export const BOOKMARK_ICON_OPTIONS: BookmarkIconOption[] = [
  ...new Map(
    Object.values(solidIconPack)
      .filter((value): value is IconDefinition =>
        typeof value === 'object' && value !== null && 'iconName' in value && 'icon' in value &&
        (value as IconDefinition).prefix === 'fas',
      )
      .map((icon) => [icon.iconName, {
        icon,
        label: curatedLabels.get(icon.iconName) ?? icon.iconName
          .replace(/^fa/, '')
          .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
          .replace(/^./, (letter) => letter.toUpperCase()),
      }]),
  ).values(),
].sort((first, second) => first.label.localeCompare(second.label));
const BOOKMARK_ICONS_BY_NAME = new Map<string, IconDefinition>(
  BOOKMARK_ICON_OPTIONS.map(({ icon }) => [icon.iconName, icon]),
);

export const BOOKMARK_ICON_TABS = [
  'Todos', 'Acciones', 'Personas', 'Naturaleza', 'Transporte', 'Objetos', 'Símbolos',
] as const;
export type BookmarkIconTab = typeof BOOKMARK_ICON_TABS[number];

function bookmarkIconCategory(iconName: string): Exclude<BookmarkIconTab, 'Todos'> {
  if (/(person|user|people|child|baby|face|hand|address|id-card|users|user-)/.test(iconName)) return 'Personas';
  if (/(tree|leaf|flower|seedling|cloud|sun|moon|water|mountain|animal|dog|cat|bird|fish|bug|horse|frog|spider|paw|hippo|dragon|fire|snow|wind|earth|plant|forest|feather|rain|temperature)/.test(iconName)) return 'Naturaleza';
  if (/(car|truck|bus|train|plane|ship|bicycle|motorcycle|rocket|taxi|van|helicopter|scooter|subway|transport|wheelchair|anchor|road|traffic)/.test(iconName)) return 'Transporte';
  if (/(heart|star|circle|square|triangle|diamond|gem|cross|check|xmark|question|exclamation|plus|minus|equals|infinity|copyright|hashtag|at|quote|symbol|peace|flag|award|trophy|medal|bookmark|thumbs|smile|frown)/.test(iconName)) return 'Símbolos';
  if (/(computer|laptop|mobile|phone|tablet|camera|video|image|music|file|folder|book|key|lock|lightbulb|tool|wrench|hammer|gear|cog|house|building|briefcase|gift|clock|calendar|bell|envelope|keyboard|plug|database|print|microchip|robot|cube|box|basket|cart|utensil|mug|glass|bottle|shirt|shoe|couch|bed|bath|toilet|wallet|credit-card|money|coins|cash|chart|calculator|pen|pencil|paint|palette|scissors|ruler)/.test(iconName)) return 'Objetos';
  return 'Acciones';
}

export function resolveBookmarkIcon(iconName: string): IconDefinition {
  return BOOKMARK_ICONS_BY_NAME.get(iconName) ?? faBookmark;
}

export interface PickedFolder {
  path: string;
  treeUri?: string;
  treePath?: string;
}

export interface BookmarkItem {
  name: string;
  path: string;
  icon: IconDefinition;
  treeUri?: string;
  treePath?: string;
}

interface DuplicateFile {
  name: string;
  path: string;
  size: number;
  lastModified?: number;
  sha256: string;
  handle?: FileSystemFileHandle;
  parentHandle?: FileSystemDirectoryHandle;
  file?: File;
}

interface SyncFile {
  name: string;
  path: string;
  size: number;
  lastModified?: number;
  sha256: string;
  uri?: string;
  handle?: FileSystemFileHandle;
  parentHandle?: FileSystemDirectoryHandle;
  file?: File;
}

interface SyncDifference {
  path: string;
  kind: 'missing-local' | 'missing-peer' | 'modified';
  local?: SyncFile;
  peer?: SyncFile;
}

@Component({
  imports: [CommonModule, FontAwesomeModule],
  standalone: true,
  selector: 'app-menu',
  styleUrl: './menu.css',
  templateUrl: './menu.html',
})
export class Menu implements OnInit {

  ngOnInit(): void {
    if (this.profileBookmarks()) {
      this.bookmarks.set(this.profileBookmarks()!);
      this.bookmarksChange.emit(this.bookmarks());
      return;
    }
    if (this.isNative) {
      void this.loadBookmarksFromPreferences().then((items) => {
        this.bookmarks.set(items);
        this.bookmarksChange.emit(this.bookmarks());
      });
    } else {
      this.bookmarksChange.emit(this.bookmarks());
    }
  }

  faFolderOpen = faFolderOpen;
  faBookmark = faBookmark;
  faChevronUp = faChevronUp;
  faChevronDown = faChevronDown;
  faPlus = faPlus;
  faFilePen = faFilePen;
  faKey = faKey;
  faTrash = faTrash;
  faCheck = faCheck;
  faSpinner = faSpinner;
  isNative = Capacitor.isNativePlatform();
faFolderPlus = faFolderPlus;
  private readonly browser = inject(FileBrowserService);

  readonly selectedPath = input<string>('');
  readonly permissionMap = input<Record<string, boolean>>({});
  readonly rootTreeUri = input<string | undefined>(undefined);
  readonly profileBookmarks = input<BookmarkItem[] | null>(null);
  readonly folderSelected = output<string>();
  readonly folderLoaded = output<void>();
  readonly bookmarksChange = output<BookmarkItem[]>();
  readonly moveTriggered = output<void>();
  readonly grantAllAccess = output<void>();
  allAccessGranted = computed(() => !!this.rootTreeUri());

  constructor() {
    effect(() => {
      const items = this.profileBookmarks();
      if (items) {
        this.bookmarks.set(items);
      }
    });
    if (this.isNative) {
      void this.restoreLastNativeFolder();
    }
  }

  onGrantAllAccess(): void {
    this.grantAllAccess.emit();
  }
  selectedBookmarkIndex = signal<number>(0);
  selectedDirectory = signal<FileSystemDirectoryHandle | null>(null);
  selectedFolderPath = signal<string | null>(null);
  selectedTreeUri = signal<string | null>(null);
  readonly duplicateGroups = signal<DuplicateFile[][]>([]);
  readonly duplicateLoading = signal(false);
  readonly duplicateLoadingMessage = signal('Revisando archivos y subdirectorios…');
  readonly duplicateError = signal<string | null>(null);
  readonly duplicateDialogOpen = signal(false);
  readonly keptDuplicatePaths = signal<Set<string>>(new Set());
  readonly duplicateView = output<BrowserEntry>();
  readonly syncDialogOpen = signal(false);
  readonly syncBusy = signal(false);
  readonly syncError = signal<string | null>(null);
  readonly syncDifferences = signal<SyncDifference[]>([]);
  private peerDirectory: FileSystemDirectoryHandle | null = null;
  private peerTreeUri: string | null = null;
  selectedPathAddBookMark = signal<string>('');
  pendingBookmarkTree = signal<{ treeUri?: string; treePath?: string }>({});

  bookmarks = signal<BookmarkItem[]>(this.loadBookmarksFromCookie());

  bookmarkDenied(bookmark: BookmarkItem): boolean {
    return !!bookmark.treeUri && this.permissionMap()[bookmark.treeUri] === false;
  }

  bookmarkIconOptions: BookmarkIconOption[] = BOOKMARK_ICON_OPTIONS;
  bookmarkIconTabs = BOOKMARK_ICON_TABS;
  selectedBookmarkIconTab = signal<BookmarkIconTab>('Todos');
  visibleBookmarkIconOptions = computed(() => {
    const tab = this.selectedBookmarkIconTab();
    if (tab === 'Todos') return this.bookmarkIconOptions;
    return this.bookmarkIconOptions.filter((option) => bookmarkIconCategory(option.icon.iconName) === tab);
  });

  selectedBookmarkIconIndex = signal<number>(Math.max(
    0,
    BOOKMARK_ICON_OPTIONS.findIndex((option) => option.icon.iconName === faBookmark.iconName),
  ));
  selectedBookmarkIcon = computed(() => this.bookmarkIconOptions[this.selectedBookmarkIconIndex()]?.icon ?? faBookmark);
  iconDropdownOpen = signal<boolean>(false);
  editingBookmark = signal<boolean>(false);
  addBookmarkIcon = computed(() => (this.editingBookmark() ? faFilePen : faPlus));

  toggleIconDropdown(): void {
    this.iconDropdownOpen.update((open) => !open);
  }

  selectBookmarkIconTab(tab: BookmarkIconTab): void {
    this.selectedBookmarkIconTab.set(tab);
  }

  selectBookmarkIcon(index: number): void {
    this.selectedBookmarkIconIndex.set(index);
    this.iconDropdownOpen.set(false);
  }

  onGuardarMarcador(): void {
    const path = this.selectedPathAddBookMark();
    if (!path) {
      console.warn('Selecciona una carpeta para el marcador primero.');
      return;
    }
    const name = this.nameFromPath(path);
    const icon = this.selectedBookmarkIcon();
    const pending = this.pendingBookmarkTree();

    if (this.editingBookmark()) {
      this.bookmarks.update((current) =>
        current.map((bookmark, index) =>
          index === this.selectedBookmarkIndex()
            ? {
                name,
                path,
                icon,
                treeUri: pending.treeUri ?? bookmark.treeUri,
                treePath: pending.treePath ?? bookmark.treePath,
              }
            : bookmark,
        ),
      );
      this.editingBookmark.set(false);
    } else {
      this.bookmarks.update((current) => [
        ...current,
        { name, path, icon, treeUri: pending.treeUri, treePath: pending.treePath },
      ]);
    }
    this.saveBookmarks(this.bookmarks());
    this.bookmarksChange.emit(this.bookmarks());
    this.selectedPathAddBookMark.set('');
    this.pendingBookmarkTree.set({});
  }

  private loadBookmarksFromCookie(): BookmarkItem[] {
    if (typeof document === 'undefined') {
      return [];
    }
    const matches = document.cookie.match(new RegExp(`(?:^|;\\s*)${BOOKMARKS_COOKIE}=([^;]*)`));
    if (!matches) {
      return [];
    }
    try {
      const parsed = JSON.parse(decodeURIComponent(matches[1]));
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .filter((item) => typeof item?.name === 'string' && typeof item?.path === 'string')
        .map((item) => ({
          name: item.name,
          path: item.path,
          icon: typeof item.icon === 'string' ? resolveBookmarkIcon(item.icon) : faBookmark,
          treeUri: typeof item.treeUri === 'string' ? item.treeUri : undefined,
          treePath: typeof item.treePath === 'string' ? item.treePath : undefined,
        }));
    } catch (error) {
      console.warn('No se pudieron cargar los marcadores desde la cookie:', error);
      return [];
    }
  }

  private serializedBookmarks(items: BookmarkItem[]): Record<string, string | undefined>[] {
    return items.map(({ name, path, icon, treeUri, treePath }) => ({
      name,
      path,
      icon: icon.iconName,
      ...(treeUri !== undefined ? { treeUri } : {}),
      ...(treePath !== undefined ? { treePath } : {}),
    }));
  }

  private async saveBookmarksToPreferences(items: BookmarkItem[]): Promise<void> {
    await Preferences.set({
      key: BOOKMARKS_PREFERENCE,
      value: JSON.stringify(this.serializedBookmarks(items)),
    });
  }

  private async loadBookmarksFromPreferences(): Promise<BookmarkItem[]> {
    const { value } = await Preferences.get({ key: BOOKMARKS_PREFERENCE });
    if (value === null || value === undefined) {
      return [];
    }
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .filter((item) => typeof item?.name === 'string' && typeof item?.path === 'string')
        .map((item) => ({
          name: item.name,
          path: item.path,
          icon: typeof item.icon === 'string' ? resolveBookmarkIcon(item.icon) : faBookmark,
          treeUri: typeof item.treeUri === 'string' ? item.treeUri : undefined,
          treePath: typeof item.treePath === 'string' ? item.treePath : undefined,
        }));
    } catch (error) {
      console.warn('No se pudieron cargar los marcadores desde Preferences:', error);
      return [];
    }
  }

  private saveBookmarksToCookie(items: BookmarkItem[]): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.cookie = `${BOOKMARKS_COOKIE}=${encodeURIComponent(JSON.stringify(this.serializedBookmarks(items)))}; path=/; max-age=${BOOKMARKS_COOKIE_MAX_AGE}; SameSite=Lax`;
  }

  private saveBookmarks(items: BookmarkItem[]): void {
    if (this.isNative) {
      void this.saveBookmarksToPreferences(items);
    } else {
      this.saveBookmarksToCookie(items);
    }
  }

  onOpenFolderAddBookMark(): void {
    this.editingBookmark.set(false);
    void this.pickFolderPath().then((folder) => {
      if (folder) {
        this.selectedPathAddBookMark.set(folder.path);
        this.pendingBookmarkTree.set({ treeUri: folder.treeUri, treePath: folder.treePath });
      }
    });
  }

  selectBookmark(index: number): void {
    this.selectedBookmarkIndex.set(index);
    this.editingBookmark.set(true);
    const bookmark = this.bookmarks()[index];
    if (bookmark) {
      this.selectedPathAddBookMark.set(bookmark.path);
      this.pendingBookmarkTree.set({ treeUri: bookmark.treeUri, treePath: bookmark.treePath });
      const iconIndex = this.bookmarkIconOptions.findIndex((option) => option.icon === bookmark.icon);
      if (iconIndex !== -1) {
        this.selectedBookmarkIconIndex.set(iconIndex);
      }
    }
  }

  async requestBookmarkPermission(index: number): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      window.alert('Pedir permiso solo está disponible desde el dispositivo.');
      return;
    }
    const bookmark = this.bookmarks()[index];
    if (!bookmark) {
      return;
    }
    let folder: PickedFolder;
    if (bookmark.treeUri && bookmark.treeUri.includes('/tree/')) {
       const startDocumentUri = this.startDocumentUriForTree(bookmark.treeUri, bookmark.treePath);
      try {
        const result = await FileTree.pickTree({ startDocumentUri });
        folder = { path: this.rootPathFromPickedPath(result.treeUri), ...this.folderTreeInfo(result.treeUri) };
      } catch (error) {
        if (!(error instanceof Error) || error.message !== 'pickDirectory canceled.') {
          console.error('Error al pedir permiso para el marcador:', error);
        }
        return;
      }
    } else {
      const picked = await this.pickFolderPath();
      if (!picked) {
        return;
      }
      folder = picked;
    }
    this.bookmarks.update((current) =>
      current.map((item, i) =>
        i === index
          ? { ...item, path: folder.path, treeUri: folder.treeUri, treePath: folder.treePath }
          : item,
      ),
    );
    this.saveBookmarks(this.bookmarks());
    this.bookmarksChange.emit(this.bookmarks());
    if (this.selectedBookmarkIndex() === index) {
      this.selectedPathAddBookMark.set(folder.path);
      this.pendingBookmarkTree.set({ treeUri: folder.treeUri, treePath: folder.treePath });
    }
  }

  deleteBookmark(index: number): void {
    this.bookmarks.update((current) => current.filter((_, i) => i !== index));
    const count = this.bookmarks().length;
    let selected = this.selectedBookmarkIndex();
    if (selected > index) {
      selected -= 1;
    }
    if (selected >= count) {
      selected = Math.max(0, count - 1);
    }
    this.selectedBookmarkIndex.set(selected);
    this.editingBookmark.set(count > 0);
    this.saveBookmarks(this.bookmarks());
    this.bookmarksChange.emit(this.bookmarks());
    const bookmark = this.bookmarks()[selected];
    if (bookmark) {
      this.selectedPathAddBookMark.set(bookmark.path);
      this.pendingBookmarkTree.set({ treeUri: bookmark.treeUri, treePath: bookmark.treePath });
    } else {
      this.selectedPathAddBookMark.set('');
      this.pendingBookmarkTree.set({});
    }
  }

  onOpenFolder(): void {
    if (Capacitor.isNativePlatform()) {
      void this.openNativeFolder();
      return;
    }
    void this.openWebFolder();
  }

  async onAddBookmarkFolder(): Promise<void> {
    try {
      const newBookmarks: BookmarkItem[] = [];
      if (this.isNative) {
        const { treeUri } = await FileTree.pickTree({});
        const { files } = await FileTree.list({ treeUri });
        const rootPath = this.rootPathFromPickedPath(treeUri).replace(/\/+$/, '');
        for (const entry of files) {
          if (entry.isDirectory) {
            newBookmarks.push({
              name: entry.name,
              path: `${rootPath}/${entry.name}`,
              icon: faFolder,
              treeUri,
              treePath: entry.name,
            });
          }
        }
      } else {
        const picker = window as Window & {
          showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
        };
        if (!picker.showDirectoryPicker) {
          window.alert('Agregar carpetas de marcadores requiere un navegador compatible con selección de carpetas.');
          return;
        }
        const root = await picker.showDirectoryPicker({ mode: 'read' });
        for await (const entry of root.values()) {
          if (entry.kind === 'directory') {
            newBookmarks.push({ name: entry.name, path: `/${root.name}/${entry.name}`, icon: faFolder });
          }
        }
      }
      if (!newBookmarks.length) {
        window.alert('La carpeta seleccionada no contiene subcarpetas de primer nivel.');
        return;
      }
      const existing = new Set(this.bookmarks().map((bookmark) => `${bookmark.treeUri ?? ''}|${bookmark.treePath ?? bookmark.path}`));
      const additions = newBookmarks.filter((bookmark) => {
        const key = `${bookmark.treeUri ?? ''}|${bookmark.treePath ?? bookmark.path}`;
        if (existing.has(key)) return false;
        existing.add(key);
        return true;
      });
      this.bookmarks.update((current) => [...current, ...additions]);
      this.saveBookmarks(this.bookmarks());
      this.bookmarksChange.emit(this.bookmarks());
      if (!additions.length) window.alert('Las subcarpetas ya estaban agregadas como marcadores.');
    } catch (error) {
      const reason = error as { name?: string; message?: string };
      if (reason?.name !== 'AbortError' && !reason?.message?.includes('canceled')) {
        console.error('No se pudieron agregar las carpetas como marcadores:', error);
        window.alert(reason?.message || String(error));
      }
    }
  }

  async onSearchDuplicates(): Promise<void> {
    this.duplicateError.set(null);
    this.duplicateGroups.set([]);
    this.keptDuplicatePaths.set(new Set());
    this.duplicateDialogOpen.set(true);
    this.duplicateLoading.set(true);
    this.duplicateLoadingMessage.set('Revisando archivos y subdirectorios…');
    try {
      const candidates: Omit<DuplicateFile, 'sha256'>[] = [];
      const webRoot = this.selectedDirectory();
      const treeUri = this.selectedTreeUri();
      if (webRoot) {
        await this.collectWebFiles(webRoot, candidates, webRoot.name);
      } else if (treeUri) {
        await this.collectNativeFiles(treeUri, undefined, candidates);
      } else {
        for (const entry of this.browser.entries()) {
          if (entry.kind === 'file' && entry.file) {
            candidates.push({ name: entry.name, path: entry.path, size: entry.file.size, lastModified: entry.file.lastModified, file: entry.file });
          } else if (entry.kind === 'file' && entry.handle) {
            const file = await (entry.handle as FileSystemFileHandle).getFile();
            candidates.push({ name: entry.name, path: entry.path, size: file.size, lastModified: file.lastModified, file, handle: entry.handle as FileSystemFileHandle });
          }
        }
      }
      if (!webRoot && !treeUri && candidates.length === 0) {
        throw new Error('Abre una carpeta antes de buscar duplicados.');
      }

      const hashed: DuplicateFile[] = [];
      for (let index = 0; index < candidates.length; index++) {
        const item = candidates[index];
        try {
          const sha256 = treeUri
            ? (await FileTree.hash({ uri: item.path })).sha256
            : await this.hashWebFile(item.file ?? await item.handle!.getFile());
          hashed.push({ ...item, sha256 });
        } catch (error) {
          console.warn(`No se pudo verificar ${item.path}`, error);
        }
      }
      const groups = new Map<string, DuplicateFile[]>();
      for (const item of hashed) {
        const current = groups.get(item.sha256) ?? [];
        current.push(item);
        groups.set(item.sha256, current);
      }
      this.duplicateGroups.set([...groups.values()].filter((group) => group.length > 1));
    } catch (error) {
      this.duplicateError.set(error instanceof Error ? error.message : String(error));
    } finally {
      this.duplicateLoading.set(false);
    }
  }

  closeDuplicateDialog(): void {
    this.duplicateDialogOpen.set(false);
  }

  async deleteDuplicate(file: DuplicateFile): Promise<void> {
    if (!window.confirm(`¿Eliminar definitivamente “${file.name}”?`)) return;
    try {
      await this.removeDuplicateFile(file);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
    }
  }

  async renameDuplicate(file: DuplicateFile): Promise<void> {
    const name = window.prompt('Nuevo nombre del archivo:', file.name)?.trim();
    if (!name || name === file.name) return;
    try {
      let newPath = file.path;
      if (file.path.startsWith('content://')) {
        const result = await FileTree.rename({ uri: file.path, name });
        this.browser.renameEntry(file.path, name, result.uri);
        newPath = result.uri;
      } else if (file.handle) {
        await (file.handle as FileSystemFileHandle & { move(name: string): Promise<void> }).move(name);
        const parent = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/') + 1) : '';
        newPath = `${parent}${name}`;
        this.browser.renameEntry(file.path, name, newPath);
      } else {
        throw new Error('No se puede renombrar este archivo desde el navegador.');
      }
      const renamed = { ...file, name, path: newPath };
      this.duplicateGroups.update((groups) => groups.map((group) => group.map((item) => item === file ? renamed : item)));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
    }
  }

  refreshDuplicateGroups(removed: DuplicateFile): void {
    this.duplicateGroups.update((groups) => groups.map((group) => group.filter((item) => item !== removed)).filter((group) => group.length > 1));
  }

  async keepDuplicate(file: DuplicateFile): Promise<void> {
    const group = this.duplicateGroups().find((items) => items.some((item) => item.path === file.path));
    if (!group) return;
    const others = group.filter((item) => item.path !== file.path);
    if (!window.confirm(`Se conservará “${file.name}” y se eliminarán los otros ${others.length} duplicado(s). ¿Continuar?`)) return;
    const failures: string[] = [];
    for (const duplicate of others) {
      try {
        await this.removeDuplicateFile(duplicate);
      } catch (error) {
        failures.push(`${duplicate.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    this.keptDuplicatePaths.update((current) => new Set(current).add(file.path));
    if (failures.length) window.alert(`Se conservará “${file.name}”, pero no se pudieron eliminar todos los duplicados:\n${failures.join('\n')}`);
  }

  async keepOnePerDuplicateGroup(): Promise<void> {
    if (this.duplicateLoading()) return;
    const groups = this.duplicateGroups();
    const duplicatesToDelete = groups.flatMap((group) => group.slice(1));
    if (!duplicatesToDelete.length) return;
    if (!window.confirm(
      `Se conservará el primer archivo de cada uno de los ${groups.length} grupos y se eliminarán ${duplicatesToDelete.length} duplicado(s). ¿Continuar?`,
    )) return;

    this.keptDuplicatePaths.update((current) => {
      const next = new Set(current);
      for (const group of groups) next.add(group[0].path);
      return next;
    });
    this.duplicateLoadingMessage.set(`Eliminando duplicados (0 de ${duplicatesToDelete.length})…`);
    this.duplicateLoading.set(true);
    const failures: string[] = [];
    let completed = 0;
    try {
      for (const file of duplicatesToDelete) {
        try {
          await this.removeDuplicateFile(file);
        } catch (error) {
          failures.push(`${file.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
        completed++;
        this.duplicateLoadingMessage.set(`Eliminando duplicados (${completed} de ${duplicatesToDelete.length})…`);
      }
    } finally {
      this.duplicateLoading.set(false);
      this.duplicateLoadingMessage.set('Revisando archivos y subdirectorios…');
    }
    if (failures.length) {
      window.alert(`Se conservará un archivo por grupo cuando fue posible, pero no se pudieron eliminar ${failures.length} archivo(s):\n\n${failures.join('\n')}`);
    }
  }

  isDuplicateKept(path: string): boolean {
    return this.keptDuplicatePaths().has(path);
  }

  async onSyncFolders(): Promise<void> {
    this.syncError.set(null);
    this.syncDifferences.set([]);
    this.syncDialogOpen.set(true);
    this.syncBusy.set(true);
    try {
      if (!this.selectedDirectory() && !this.selectedTreeUri()) {
        throw new Error('Primero abre en esta aplicación la carpeta que quieres sincronizar.');
      }
      if (this.isNative) {
        const { treeUri } = await FileTree.pickTree({});
        this.peerTreeUri = treeUri;
        this.peerDirectory = null;
      } else {
        const picker = window as Window & { showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle> };
        if (!picker.showDirectoryPicker) throw new Error('Este navegador no permite seleccionar una segunda carpeta para sincronizar.');
        this.peerDirectory = await picker.showDirectoryPicker({ mode: 'readwrite' });
        this.peerTreeUri = null;
      }
      const [localFiles, peerFiles] = await Promise.all([this.scanSyncSide(false), this.scanSyncSide(true)]);
      const localByPath = new Map(localFiles.map((file) => [file.path, file]));
      const peerByPath = new Map(peerFiles.map((file) => [file.path, file]));
      const paths = new Set([...localByPath.keys(), ...peerByPath.keys()]);
      const differences: SyncDifference[] = [];
      for (const path of paths) {
        const local = localByPath.get(path);
        const peer = peerByPath.get(path);
        if (!local) differences.push({ path, kind: 'missing-local', peer });
        else if (!peer) differences.push({ path, kind: 'missing-peer', local });
        else if (local.sha256 !== peer.sha256) differences.push({ path, kind: 'modified', local, peer });
      }
      this.syncDifferences.set(differences);
    } catch (error) {
      const reason = error as { name?: string; message?: string };
      if (reason?.name === 'AbortError' || reason?.message?.includes('canceled')) {
        this.syncDialogOpen.set(false);
      } else {
        this.syncError.set(reason?.message || String(error));
      }
    } finally {
      this.syncBusy.set(false);
    }
  }

  closeSyncDialog(): void {
    this.syncDialogOpen.set(false);
  }

  async syncOne(difference: SyncDifference, direction: 'bring' | 'send'): Promise<void> {
    if (this.syncBusy()) return;
    this.syncBusy.set(true);
    try {
      await this.transferSyncFile(difference, direction);
      this.syncDifferences.update((items) => items.filter((item) => item !== difference));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
    } finally {
      this.syncBusy.set(false);
    }
  }

  viewSyncFile(file: SyncFile): void {
    this.duplicateView.emit({
      name: file.name,
      path: file.uri ?? file.path,
      kind: 'file',
      size: file.size,
      isImage: IMAGE_EXTENSION.test(file.name),
      thumb: undefined,
      ...(file.handle ? { handle: file.handle } : {}),
      ...(file.file ? { file: file.file } : {}),
    });
  }

  async deleteSyncFile(difference: SyncDifference, side: 'local' | 'peer'): Promise<void> {
    const file = side === 'local' ? difference.local : difference.peer;
    if (!file || this.syncBusy()) return;
    if (!window.confirm(`¿Eliminar “${difference.path}” de ${side === 'local' ? 'esta carpeta' : 'la otra carpeta'}?`)) return;
    this.syncBusy.set(true);
    try {
      if (file.uri) await FileTree.delete({ uri: file.uri });
      else if (file.parentHandle) await file.parentHandle.removeEntry(file.name);
      else throw new Error('No se pudo eliminar el archivo en este tipo de almacenamiento.');
      this.syncDifferences.update((items) => items.flatMap((item) => {
        if (item !== difference) return [item];
        const updated: SyncDifference = { ...item, [side]: undefined };
        if (!updated.local && !updated.peer) return [];
        updated.kind = updated.local ? 'missing-peer' : 'missing-local';
        return [updated];
      }));
      this.browser.removeEntry(file.uri ?? file.path);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
    } finally {
      this.syncBusy.set(false);
    }
  }

  async syncAll(direction: 'bring' | 'send'): Promise<void> {
    if (this.syncBusy()) return;
    const applicable = this.syncDifferences().filter((item) => direction === 'bring' ? !!item.peer : !!item.local);
    if (!applicable.length) return;
    const label = direction === 'bring' ? 'traer a esta carpeta' : 'enviar a la otra carpeta';
    if (!window.confirm(`Se copiarán ${applicable.length} archivo(s) para ${label}. En caso de conflicto, se reemplazará la versión del destino. ¿Continuar?`)) return;
    this.syncBusy.set(true);
    const failed = new Set<SyncDifference>();
    for (const item of applicable) {
      try { await this.transferSyncFile(item, direction); }
      catch (error) { failed.add(item); console.error('Error al sincronizar', item.path, error); }
    }
    this.syncDifferences.update((items) => items.filter((item) => failed.has(item)));
    this.syncBusy.set(false);
    if (failed.size) window.alert(`No se pudieron sincronizar ${failed.size} archivo(s). Revisa la consola para más información.`);
  }

  private async scanSyncSide(peer: boolean): Promise<SyncFile[]> {
    const treeUri = peer ? this.peerTreeUri : this.selectedTreeUri();
    if (treeUri) {
      const files: SyncFile[] = [];
      await this.collectSyncNative(treeUri, undefined, '', files);
      return files;
    }
    const root = peer ? this.peerDirectory : this.selectedDirectory();
    if (!root) throw new Error('No se pudo acceder a una de las carpetas seleccionadas.');
    const files: SyncFile[] = [];
    await this.collectSyncWeb(root, '', files);
    return files;
  }

  private async collectSyncNative(treeUri: string, parentUri: string | undefined, relative: string, output: SyncFile[]): Promise<void> {
    const { files } = await FileTree.list({ treeUri, ...(parentUri ? { parentUri } : {}) });
    for (const entry of files) {
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory) await this.collectSyncNative(treeUri, entry.uri, path, output);
      else {
        const { sha256 } = await FileTree.hash({ uri: entry.uri });
        output.push({ name: entry.name, path, size: entry.size, lastModified: entry.lastModified, sha256, uri: entry.uri });
      }
    }
  }

  private async collectSyncWeb(directory: FileSystemDirectoryHandle, relative: string, output: SyncFile[]): Promise<void> {
    for await (const entry of directory.values()) {
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.kind === 'directory') await this.collectSyncWeb(entry as FileSystemDirectoryHandle, path, output);
      else {
        const handle = entry as FileSystemFileHandle;
        const file = await handle.getFile();
        output.push({ name: entry.name, path, size: file.size, lastModified: file.lastModified, sha256: await this.hashWebFile(file), handle, parentHandle: directory, file });
      }
    }
  }

  private async transferSyncFile(difference: SyncDifference, direction: 'bring' | 'send'): Promise<void> {
    const source = direction === 'bring' ? difference.peer : difference.local;
    const destinationTree = direction === 'bring' ? this.selectedTreeUri() : this.peerTreeUri;
    const destinationDirectory = direction === 'bring' ? this.selectedDirectory() : this.peerDirectory;
    if (!source) throw new Error('No se encontró el archivo de origen.');
    if (source.uri && destinationTree) {
      await FileTree.copy({ sourceUri: source.uri, destTreeUri: destinationTree, destRelativePath: source.path });
    } else if (source.file && destinationDirectory) {
      await this.writeSyncFile(destinationDirectory, source.path, source.file);
    } else {
      throw new Error('No se pueden copiar archivos entre estos tipos de almacenamiento.');
    }
  }

  private async writeSyncFile(root: FileSystemDirectoryHandle, path: string, file: File): Promise<void> {
    const segments = path.split('/').filter(Boolean);
    const name = segments.pop();
    if (!name) throw new Error('Ruta de archivo no válida.');
    let directory = root;
    for (const segment of segments) directory = await directory.getDirectoryHandle(segment, { create: true });
    const handle = await directory.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(file);
    await writable.close();
  }

  viewDuplicate(file: DuplicateFile): void {
    this.duplicateView.emit({
      name: file.name,
      path: file.path,
      kind: 'file',
      size: file.size,
      isImage: IMAGE_EXTENSION.test(file.name),
      thumb: undefined,
      ...(file.handle ? { handle: file.handle } : {}),
      ...(file.file ? { file: file.file } : {}),
    });
  }

  private async removeDuplicateFile(file: DuplicateFile): Promise<void> {
    if (file.path.startsWith('content://')) await FileTree.delete({ uri: file.path });
    else if (file.parentHandle) await file.parentHandle.removeEntry(file.name);
    else if (file.file && Capacitor.isNativePlatform()) await Filesystem.deleteFile({ path: file.path });
    else throw new Error('Este navegador no permite eliminar archivos de la carpeta seleccionada.');
    this.browser.removeEntry(file.path);
    this.refreshDuplicateGroups(file);
  }

  private async hashWebFile(file: File): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
  }

  private async collectWebFiles(directory: FileSystemDirectoryHandle, output: Omit<DuplicateFile, 'sha256'>[], relativePath: string): Promise<void> {
    for await (const entry of directory.values()) {
      if (entry.kind === 'directory') await this.collectWebFiles(entry as FileSystemDirectoryHandle, output, `${relativePath}/${entry.name}`);
      else {
        const handle = entry as FileSystemFileHandle;
        const file = await handle.getFile();
        output.push({ name: entry.name, path: `${relativePath}/${entry.name}`, size: file.size, lastModified: file.lastModified, handle, parentHandle: directory, file });
      }
    }
  }

  private async collectNativeFiles(treeUri: string, parentUri: string | undefined, output: Omit<DuplicateFile, 'sha256'>[]): Promise<void> {
    const { files } = await FileTree.list({ treeUri, ...(parentUri ? { parentUri } : {}) });
    for (const entry of files) {
      if (entry.isDirectory) await this.collectNativeFiles(treeUri, entry.uri, output);
      else output.push({ name: entry.name, path: entry.uri, size: entry.size, lastModified: entry.lastModified });
    }
  }

  private async pickFolderPath(): Promise<PickedFolder | null> {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FileTree.pickTree({ startDocumentUri: undefined });
        const pickedPath = result.treeUri;
        const tree = this.folderTreeInfo(pickedPath);
        return { path: this.rootPathFromPickedPath(pickedPath), ...tree };
      } catch (error) {
        if (!(error instanceof Error) || error.message !== 'pickDirectory canceled.') {
          console.error('Error al abrir la carpeta:', error);
        }
        return null;
      }
    }
    const webPath = await this.pickWebFolderPath();
    return webPath !== null ? { path: webPath } : null;
  }

  private startDocumentUriForTree(treeUri: string, treePath?: string): string | undefined {
    const treeMatch = treeUri.match(/\/tree\/([^/]+)$/);
    if (!treeMatch) {
      return undefined;
    }
    let treeId: string;
    try {
      treeId = decodeURIComponent(treeMatch[1]);
    } catch {
      treeId = treeMatch[1];
    }
    const documentId = treePath ? `${treeId}/${treePath}` : treeId;
    return `${treeUri}/document/${encodeURIComponent(documentId)}`;
  }

  private folderTreeInfo(pickedPath: string): { treeUri?: string; treePath?: string } {
    if (!pickedPath.startsWith('content://')) {
      return {};
    }
    const decoded = decodeURIComponent(pickedPath);
    const treeIndex = decoded.indexOf('/tree/');
    if (treeIndex === -1) {
      return { treeUri: pickedPath };
    }
    return { treeUri: pickedPath };
  }

  private async pickWebFolderPath(): Promise<string | null> {
    const pickerWindow = window as Window & {
      showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
    };

    if (typeof pickerWindow.showDirectoryPicker === 'function') {
      try {
        const dirHandle = await pickerWindow.showDirectoryPicker?.({ mode: 'read' });
        return dirHandle ? `/${dirHandle.name}` : null;
      } catch (error) {
        const reason = error as { name?: string } | null;
        if (!reason || reason.name !== 'AbortError') {
          console.error('Error al abrir la carpeta:', error);
        }
        return null;
      }
    }
    return this.pickFolderPathViaInput();
  }

  private pickFolderPathViaInput(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.setAttribute('webkitdirectory', '');
      input.setAttribute('directory', '');
      input.style.display = 'none';

      input.onchange = () => {
        const files = input.files;
        const value = input.value;
        input.remove();
        if (!files || files.length === 0) {
          const folderName = this.folderNameFromFileInputValue(value);
          if (folderName) {
            resolve(`/${folderName}`);
            return;
          }
          const typedName = window.prompt('La carpeta elegida está vacía. Escribe su nombre:');
          resolve(typedName ? `/${typedName.trim()}` : null);
          return;
        }
        const firstFile = files[0] as File & { webkitRelativePath?: string };
        const folderName = firstFile.webkitRelativePath?.split('/')[0] ?? firstFile.name;
        resolve(`/${folderName}`);
      };

      input.oncancel = () => {
        input.remove();
        resolve(null);
      };

      document.body.appendChild(input);
      input.click();
    });
  }

  private async openNativeFolder(): Promise<void> {
    let pickedPath: string;
    try {
      const result = await FileTree.pickTree({ startDocumentUri: undefined });
      pickedPath = result.treeUri;
      console.log('Carpeta seleccionada:', pickedPath);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'pickDirectory canceled.') {
        console.error('Error al abrir la carpeta:', error);
      }
      return;
    }

    await Preferences.set({ key: LAST_NATIVE_SOURCE_TREE_KEY, value: pickedPath });
    await this.loadNativeFolder(pickedPath);
    this.folderLoaded.emit();
  }

  private async restoreLastNativeFolder(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: LAST_NATIVE_SOURCE_TREE_KEY });
      if (!value) {
        return;
      }
      const { ok } = await FileTree.check({ treeUri: value });
      if (!ok) {
        await Preferences.remove({ key: LAST_NATIVE_SOURCE_TREE_KEY });
        return;
      }
      await this.loadNativeFolder(value);
    } catch (error) {
      console.warn('No se pudo restaurar la última carpeta:', error);
    }
  }

  private async loadNativeFolder(pickedPath: string): Promise<void> {
    const absolutePath = this.rootPathFromPickedPath(pickedPath);
    const folderName = this.folderNameFromPath(absolutePath);
    console.log('Nombre de la carpeta:', folderName);
    this.browser.setSourceDirectory(null);
    this.selectedDirectory.set(null);
    this.selectedTreeUri.set(pickedPath.startsWith('content://') ? pickedPath : null);
    this.selectedFolderPath.set(absolutePath);
    this.folderSelected.emit(absolutePath);
    this.browser.beginLoad(folderName);

    try {
      const entries = await this.listNativeDirectory(pickedPath);
      this.browser.addEntries(entries);
      this.browser.finishLoad();
      void this.enrichNativeThumbs(entries);
    } catch (error) {
      console.warn('No se pudo listar el contenido del directorio, se abrirá el selector de archivos:', error);
      await this.openNativeFileFallback();
    }
  }

  private async enrichNativeThumbs(entries: BrowserEntry[]): Promise<void> {
    const images = entries.filter(
      (entry) => entry.isImage && entry.path.startsWith('content://'),
    );
    for (let i = 0; i < images.length; i += 6) {
      const batch = images.slice(i, i + 6);
      await Promise.all(
        batch.map(async (entry) => {
          try {
            const result = await FileTree.thumbnail({ uri: entry.path });
            this.browser.setEntryThumb(entry.path, result.data);
          } catch (error) {
            console.warn('Miniatura no disponible:', entry.name, error);
          }
        }),
      );
    }
  }

  private async listNativeDirectory(pickedPath: string): Promise<BrowserEntry[]> {
    if (pickedPath.startsWith('content://')) {
      const { files } = await FileTree.list({ treeUri: pickedPath });
      this.notifyFileLimit(files.length);
      const entries: BrowserEntry[] = [];
      for (const file of files) {
        if (entries.length >= MAX_FILES) {
          break;
        }
        entries.push({
          name: file.name,
          path: file.uri,
          kind: file.isDirectory ? 'directory' : 'file',
          size: file.size >= 0 ? file.size : undefined,
          isImage: file.isDirectory ? false : IMAGE_EXTENSION.test(file.name),
          thumb: undefined,
        });
      }
      return entries;
    }

    const result = await Filesystem.readdir({ path: pickedPath });
    this.notifyFileLimit(result.files.length);
    const entries: BrowserEntry[] = [];
    for (const file of result.files) {
      if (entries.length >= MAX_FILES) {
        break;
      }
      entries.push(await this.buildBrowserEntry(file.name, file.type, file.size, file.uri));
    }
    return entries;
  }

  private async openNativeFileFallback(): Promise<void> {
    try {
      const result = await FilePicker.pickFiles();
      this.notifyFileLimit(result.files.length);
      const selectableFiles = result.files.length > MAX_FILES ? result.files.slice(0, MAX_FILES) : result.files;
      for (const file of selectableFiles) {
        const name = file.name || this.nameFromPath(file.path || '');
        const isImage = IMAGE_EXTENSION.test(name);
        let thumb: string | undefined;
        if (isImage && file.path) {
          thumb = await this.nativeImageThumb(file.path);
        }
        this.browser.addEntries([{
          name,
          path: file.path ?? name,
          kind: 'file',
          size: file.size,
          isImage,
          thumb,
        }]);
      }
      this.browser.finishLoad();
    } catch (error) {
      console.warn('Selector de archivos cancelado o con error:', error);
      this.browser.finishLoad();
    }
  }

  private async buildBrowserEntry(
    name: string,
    type: 'file' | 'directory',
    size: number,
    path: string,
  ): Promise<BrowserEntry> {
    const isImage = type === 'file' && IMAGE_EXTENSION.test(name);
    const thumb = isImage ? await this.nativeImageThumb(path) : undefined;
    return { name, path, kind: type, size, isImage, thumb };
  }

  private async nativeImageThumb(path: string): Promise<string | undefined> {
    if (path.startsWith('content://')) {
      try {
        const result = await FileTree.thumbnail({ uri: path });
        return result.data;
      } catch (error) {
        console.warn('No se pudo generar la miniatura:', path, error);
        return undefined;
      }
    }
    try {
      const result = await Filesystem.readFile({ path });
      if (typeof result.data === 'string') {
        return `data:image/${this.imageMime(path)};base64,${result.data}`;
      }
    } catch (error) {
      console.warn('No se pudo generar la miniatura:', path, error);
    }
    return undefined;
  }

  private imageMime(path: string): string {
    switch (path.split('.').pop()?.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
        return 'jpeg';
      case 'png':
        return 'png';
      case 'gif':
        return 'gif';
      case 'bmp':
        return 'bmp';
      case 'webp':
        return 'webp';
      case 'svg':
        return 'svg+xml';
      case 'avif':
        return 'avif';
      case 'ico':
        return 'x-icon';
      default:
        return '*';
    }
  }

  private openWebFolder(): void {
    const pickerWindow = window as Window & {
      showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
    };

    if (typeof pickerWindow.showDirectoryPicker === 'function') {
      this.openWebDirectory(pickerWindow);
      return;
    }
    this.openFallbackFolderPicker();
  }

  private async openWebDirectory(
    pickerWindow: Window & {
      showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
    },
  ): Promise<void> {
    try {
      const dirHandle = await pickerWindow.showDirectoryPicker?.({ mode: 'readwrite' });
      if (!dirHandle) {
        return;
      }
      this.browser.setSourceDirectory(dirHandle);
      this.selectedDirectory.set(dirHandle);
      this.selectedTreeUri.set(null);
      this.selectedFolderPath.set(null);
      this.folderSelected.emit(`/${dirHandle.name}`);
      this.browser.beginLoad(dirHandle.name);
      await this.scanWebDirectory(dirHandle);
      this.folderLoaded.emit();
    } catch (error) {
      const reason = error as { name?: string } | null;
      if (!reason || reason.name !== 'AbortError') {
        console.error('Error al abrir la carpeta:', error);
      }
    }
  }

  private async scanWebDirectory(dirHandle: FileSystemDirectoryHandle): Promise<void> {
    for await (const entry of dirHandle.values()) {
      if (this.browser.entries().length >= MAX_FILES) {
        this.notifyFileLimit(MAX_FILES + 1);
        break;
      }
      if (entry.kind === 'directory') {
        this.browser.addEntries([{
          name: entry.name,
          path: `${entry.name}/`,
          kind: 'directory',
          size: undefined,
          isImage: false,
          thumb: undefined,
          handle: entry,
        }]);
        continue;
      }
      const fileHandle = entry as FileSystemFileHandle;
      const isImage = IMAGE_EXTENSION.test(entry.name);
      let size: number | undefined;
      let thumb: string | undefined;
      if (isImage) {
        try {
          const file = await fileHandle.getFile();
          size = file.size;
          thumb = URL.createObjectURL(file);
        } catch (error) {
          console.warn('No se pudo generar la miniatura:', entry.name, error);
        }
      }
      this.browser.addEntries([{
        name: entry.name,
        path: entry.name,
        kind: 'file',
        size,
        isImage,
        thumb,
        handle: fileHandle,
      }]);
    }
    this.browser.finishLoad();
  }

  private openFallbackFolderPicker(): void {
    this.browser.setSourceDirectory(null);
    this.selectedTreeUri.set(null);
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    input.style.display = 'none';

    input.onchange = async () => {
      const files = input.files;
      if (files && files.length > 0) {
        this.notifyFileLimit(files.length);
        const firstFile = files[0] as File & { webkitRelativePath?: string };
        const folderName = firstFile.webkitRelativePath?.split('/')[0] ?? firstFile.name;
        this.folderSelected.emit(`/${folderName}`);
        this.browser.beginLoad(folderName);
        for (const file of files) {
          if (this.browser.entries().length >= MAX_FILES) {
            break;
          }
          const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
          const name = relativePath.split('/').pop() ?? file.name;
          const isImage = IMAGE_EXTENSION.test(name);
          const thumb = isImage ? URL.createObjectURL(file) : undefined;
          this.browser.addEntries([{
            name,
            path: relativePath,
            kind: 'file',
            size: file.size,
            isImage,
            thumb,
            file,
          }]);
        }
        this.browser.finishLoad();
        this.folderLoaded.emit();
      }
      input.remove();
    };

    document.body.appendChild(input);
    input.click();
  }

  private nameFromPath(path: string): string {
    return decodeURIComponent(path.replace(/\/+$/, '')).split('/').pop() ?? path;
  }

  private notifyFileLimit(totalFiles: number): void {
    if (totalFiles > MAX_FILES) {
      window.alert(`Por cuestiones de memoria, solo se cargarán los primeros ${MAX_FILES} archivos.`);
    }
  }

  private folderNameFromFileInputValue(value: string): string {
    const normalized = value.replace(/\\/g, '/');
    const segments = normalized.split('/').filter((segment) => segment.length > 0);
    return segments.length > 0 ? decodeURIComponent(segments[segments.length - 1]) : '';
  }

  private rootPathFromPickedPath(path: string): string {
    const decoded = decodeURIComponent(path);

    if (decoded.startsWith('content://')) {
      const treeIndex = decoded.indexOf('/tree/');
      if (treeIndex !== -1) {
        const afterTree = decoded.slice(treeIndex + 6);
        const colonIndex = afterTree.indexOf(':');
        const volume = colonIndex !== -1 ? afterTree.slice(0, colonIndex) : 'primary';
        const relative = colonIndex !== -1 ? afterTree.slice(colonIndex + 1) : afterTree;
        const root = volume === 'primary' ? '/storage/emulated/0' : `/storage/${volume}`;
        return relative ? `${root}/${relative}` : root;
      }
      return decoded;
    }

    if (decoded.startsWith('file://')) {
      return decoded.slice('file://'.length);
    }

    return decoded;
  }

  private folderNameFromPath(path: string): string {
    const decoded = decodeURIComponent(path.replace(/\/$/, ''));
    const treeIndex = decoded.indexOf('/tree/');
    if (treeIndex !== -1) {
      const afterTree = decoded.slice(treeIndex + 6);
      const volumeEnd = afterTree.indexOf(':');
      return volumeEnd !== -1 ? afterTree.slice(volumeEnd + 1) : afterTree;
    }
    const segments = decoded.split('/');
    return segments[segments.length - 1] || decoded;
  }

  onMove(): void {
    this.moveTriggered.emit();
  }

}
