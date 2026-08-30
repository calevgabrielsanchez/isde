import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faFolderOpen, faBookmark, faChevronUp, faChevronDown,
  faHeart, faStar, faDownload, faImage, faMusic, faVideo, faFolder, faCamera, faCode,
  faPlus, faFilePen, faKey, faTrash, faCheck,
  faCircle, faSquare, faCube, faSeptagon, faPentagon, faOctagon, faHexagon, faShapes, 
  faGhost, faDragon, faCrow, faDemocrat, faLandmark, faRepublican, faTrophy, 
  faChess, faChessKnight, faChessPawn, faChessRook, faChessBishop, faChessQueen, faChessKing,
  faDiamond, faGem, faCloud, faComment, faEnvelope, faPaperPlane, faPaperclip, faThumbsUp, faThumbsDown,
  faTruck, faCar, faBicycle, faBus, faTrain, faShip, faPlane, faRocket, faSubway, faMotorcycle,
  faWebAwesome, faHippo, faHorse, faDog, faCat, faFish, faFrog, faSpider, 
faFire, faWater, faLeaf, faTree, faMountain, faSun, faMoon, faStarHalf, faHouse,
faPerson, faPersonDress, faGamepad, faPuzzlePiece, faLightbulb, faBook, faGraduationCap, faLaptop, faMobile, 
faFishFins, faBug, faPalette, faPencil, faBuilding, faSeedling, faRadio, faRadiation, faSpaghettiMonsterFlying,
faSkull, faSkullCrossbones, faScrewdriverWrench
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Filesystem } from '@capacitor/filesystem';
import { FileTree } from '../../services/file-tree.plugin';
import { BrowserEntry, FileBrowserService, MAX_FILES } from '../../services/file-browser.service';

const IMAGE_EXTENSION = /\.(jpe?g|png|gif|bmp|webp|svg|avif|ico)$/i;
const BOOKMARKS_COOKIE = 'isdeBookmarks';
const BOOKMARKS_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const BOOKMARK_ICONS: IconDefinition[] = [
  faBookmark, faHeart, faStar, faDownload, faImage, faMusic, faVideo,
  faFolder, faCamera, faCode, faCircle, faSquare, faCube, faSeptagon,
  faPentagon, faOctagon, faHexagon, faShapes,
];
const ICON_BY_NAME: Record<string, IconDefinition> = Object.fromEntries(
  BOOKMARK_ICONS.map((icon) => [icon.iconName, icon]),
);

export interface BookmarkIconOption {
  label: string;
  icon: IconDefinition;
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

@Component({
  imports: [CommonModule, FontAwesomeModule],
  standalone: true,
  selector: 'app-menu',
  styleUrl: './menu.css',
  templateUrl: './menu.html',
})
export class Menu implements OnInit {

  ngOnInit(): void {
    this.bookmarksChange.emit(this.bookmarks());
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
  isNative = Capacitor.isNativePlatform();

  private readonly browser = inject(FileBrowserService);

  readonly selectedPath = input<string>('');
  readonly permissionMap = input<Record<string, boolean>>({});
  readonly rootTreeUri = input<string | undefined>(undefined);
  readonly folderSelected = output<string>();
  readonly bookmarksChange = output<BookmarkItem[]>();
  readonly moveTriggered = output<void>();
  readonly grantAllAccess = output<void>();
  allAccessGranted = computed(() => !!this.rootTreeUri());

  onGrantAllAccess(): void {
    this.grantAllAccess.emit();
  }
  selectedBookmarkIndex = signal<number>(0);
  selectedDirectory = signal<FileSystemDirectoryHandle | null>(null);
  selectedFolderPath = signal<string | null>(null);
  selectedPathAddBookMark = signal<string>('');
  pendingBookmarkTree = signal<{ treeUri?: string; treePath?: string }>({});

  bookmarks = signal<BookmarkItem[]>(this.loadBookmarksFromCookie());

  bookmarkDenied(bookmark: BookmarkItem): boolean {
    return !!bookmark.treeUri && this.permissionMap()[bookmark.treeUri] === false;
  }

  bookmarkIconOptions: BookmarkIconOption[] = [
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

  selectedBookmarkIconIndex = signal<number>(0);
  selectedBookmarkIcon = computed(() => this.bookmarkIconOptions[this.selectedBookmarkIconIndex()]?.icon ?? faBookmark);
  iconDropdownOpen = signal<boolean>(false);
  editingBookmark = signal<boolean>(false);
  addBookmarkIcon = computed(() => (this.editingBookmark() ? faFilePen : faPlus));

  toggleIconDropdown(): void {
    this.iconDropdownOpen.update((open) => !open);
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
    this.saveBookmarksToCookie(this.bookmarks());
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
          icon: typeof item.icon === 'string' ? (ICON_BY_NAME[item.icon] ?? faBookmark) : faBookmark,
          treeUri: typeof item.treeUri === 'string' ? item.treeUri : undefined,
          treePath: typeof item.treePath === 'string' ? item.treePath : undefined,
        }));
    } catch (error) {
      console.warn('No se pudieron cargar los marcadores desde la cookie:', error);
      return [];
    }
  }

  private saveBookmarksToCookie(items: BookmarkItem[]): void {
    if (typeof document === 'undefined') {
      return;
    }
    const serialized = items.map(({ name, path, icon, treeUri, treePath }) => ({
      name,
      path,
      icon: icon.iconName,
      ...(treeUri !== undefined ? { treeUri } : {}),
      ...(treePath !== undefined ? { treePath } : {}),
    }));
    document.cookie = `${BOOKMARKS_COOKIE}=${encodeURIComponent(JSON.stringify(serialized))}; path=/; max-age=${BOOKMARKS_COOKIE_MAX_AGE}; SameSite=Lax`;
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
      const startDocumentUri = this.startDocumentUriForTree(bookmark.treeUri);
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
    this.saveBookmarksToCookie(this.bookmarks());
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
    this.saveBookmarksToCookie(this.bookmarks());
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

  private async pickFolderPath(): Promise<PickedFolder | null> {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FilePicker.pickDirectory();
        const pickedPath = result.path;
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

  private startDocumentUriForTree(treeUri: string): string | undefined {
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
    return `${treeUri}/document/${encodeURIComponent(treeId)}`;
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
      const result = await FilePicker.pickDirectory();
      pickedPath = result.path;
      console.log('Carpeta seleccionada:', pickedPath);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'pickDirectory canceled.') {
        console.error('Error al abrir la carpeta:', error);
      }
      return;
    }

    const absolutePath = this.rootPathFromPickedPath(pickedPath);
    const folderName = this.folderNameFromPath(absolutePath);
    console.log('Nombre de la carpeta:', folderName);
    this.browser.setSourceDirectory(null);
    this.selectedDirectory.set(null);
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
      this.selectedFolderPath.set(null);
      this.folderSelected.emit(`/${dirHandle.name}`);
      this.browser.beginLoad(dirHandle.name);
      await this.scanWebDirectory(dirHandle);
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
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    input.style.display = 'none';

    input.onchange = async () => {
      const files = input.files;
      if (files && files.length > 0) {
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
      }
      input.remove();
    };

    document.body.appendChild(input);
    input.click();
  }

  private nameFromPath(path: string): string {
    return decodeURIComponent(path.replace(/\/+$/, '')).split('/').pop() ?? path;
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