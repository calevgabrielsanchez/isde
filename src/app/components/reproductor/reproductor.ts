import { Component, computed, effect, inject, input, OnDestroy, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faClose, faMusic, faSpinner, faChevronLeft, faChevronRight, faPen, faCheck, faXmark, faSpinner as faSaveSpinner } from '@fortawesome/free-solid-svg-icons';
import { Capacitor } from '@capacitor/core';
import { FileTree } from '../../services/file-tree.plugin';
import { isTextFileName } from '../../services/file-browser.service';
import type { BrowserEntry } from '../../services/file-browser.service';

const VIDEO_EXTENSION = /\.(mp4|webm|m4v|ogv|mov|mkv|3gp|3g2)$/i;
const AUDIO_EXTENSION = /\.(mp3|m4a|ogg|oga|wav|flac|aac|opus|wma)$/i;
const PDF_EXTENSION = /\.pdf$/i;
const FULLSCREEN_IMAGE_MAX = 1600;
const PDF_PAGE_MAX = 1440;

export type MediaKind = 'image' | 'video' | 'audio' | 'text' | 'pdf' | 'none';

@Component({
  imports: [CommonModule, FontAwesomeModule],
  standalone: true,
  selector: 'app-reproductor',
  styleUrl: './reproductor.css',
  templateUrl: './reproductor.html',
})
export class Reproductor implements OnDestroy {

  faClose = faClose;
  faMusic = faMusic;
  faSpinner = faSpinner;
  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;
  faPen = faPen;
  faCheck = faCheck;
  faXmark = faXmark;
  faSaveSpinner = faSaveSpinner;
  isNative = Capacitor.isNativePlatform();

  readonly entry = input<BrowserEntry | null>(null);
  readonly close = output<void>();
  readonly renamed = output<{ oldPath: string; newPath: string; newName: string }>();

  readonly isRenaming = signal<boolean>(false);
  readonly renameText = signal<string>('');
  readonly isSavingRename = signal<boolean>(false);
  readonly renameError = signal<string | null>(null);

  readonly mediaUrl = signal<string | null>(null);
  readonly textContent = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly pdfTotalPages = signal<number>(0);
  readonly pdfCurrentPage = signal<number>(1);
  readonly pdfPageUrl = signal<string | null>(null);
  readonly pdfLoading = signal<boolean>(false);
  readonly pdfPagerMode = signal<boolean>(false);
  readonly pdfError = signal<string | null>(null);
  readonly pdfFrameUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.mediaUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  readonly mediaKind = computed<MediaKind>(() => {
    const entry = this.entry();
    if (!entry) {
      return 'none';
    }
    if (entry.isImage) {
      return 'image';
    }
    if (VIDEO_EXTENSION.test(entry.name)) {
      return 'video';
    }
    if (AUDIO_EXTENSION.test(entry.name)) {
      return 'audio';
    }
    if (PDF_EXTENSION.test(entry.name)) {
      return 'pdf';
    }
    if (isTextFileName(entry.name)) {
      return 'text';
    }
    return 'none';
  });

  private readonly sanitizer = inject(DomSanitizer);
  private generation = 0;
  private createdUrls: string[] = [];

  constructor() {
    effect(() => {
      void this.loadMedia(this.entry());
    });
  }

  ngOnDestroy(): void {
    this.revokeCreatedUrls();
  }

  private async loadMedia(entry: BrowserEntry | null): Promise<void> {
    const generation = ++this.generation;
    this.revokeCreatedUrls();
    this.mediaUrl.set(null);
    this.textContent.set(null);
    this.pdfTotalPages.set(0);
    this.pdfCurrentPage.set(1);
    this.pdfPageUrl.set(null);
    this.pdfPagerMode.set(false);
    this.pdfError.set(null);
    if (!entry || this.mediaKind() === 'none') {
      this.isLoading.set(false);
      return;
    }
    this.isLoading.set(true);
    if (this.mediaKind() === 'pdf') {
      await this.loadPdf(entry, generation);
      return;
    }
    try {
      if (this.mediaKind() === 'text') {
        const text = await this.loadText(entry);
        if (generation === this.generation) {
          this.textContent.set(text);
        }
        return;
      }
      let url: string | null;
      if (entry.path.startsWith('content://')) {
        url = this.mediaKind() === 'image'
          ? await this.nativeImageUrl(entry)
          : await this.nativeLocalUrl(entry);
      } else {
        url = await this.webUrl(entry);
      }
      if (generation !== this.generation) {
        if (url?.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
        return;
      }
      this.mediaUrl.set(url);
    } catch (error) {
      console.warn('No se pudo cargar el medio:', entry.name, error);
      if (generation === this.generation) {
        this.mediaUrl.set(null);
        this.textContent.set(null);
      }
    } finally {
      if (generation === this.generation) {
        this.isLoading.set(false);
      }
    }
  }

  private async loadPdf(entry: BrowserEntry, generation: number): Promise<void> {
    try {
      if (!this.isNative) {
        const url = await this.webUrl(entry);
        if (generation === this.generation) {
          this.mediaUrl.set(url);
        }
        return;
      }
      try {
        const { count } = await FileTree.pdfInfo({ uri: entry.path });
        if (generation !== this.generation) {
          return;
        }
        this.pdfPagerMode.set(true);
        this.pdfTotalPages.set(count);
        this.pdfCurrentPage.set(1);
        await this.loadPdfPage(entry, 1, generation);
      } catch (error) {
        console.warn('Visor de páginas no disponible, abriendo el PDF en el navegador:', entry.name, error);
        if (generation !== this.generation) {
          return;
        }
        this.pdfPagerMode.set(false);
        if (error instanceof Error) {
          this.pdfError.set(error.message || 'Visor de páginas no disponible');
        }
        try {
          const url = await this.nativeLocalUrl(entry);
          if (generation === this.generation) {
            this.mediaUrl.set(url);
          }
        } catch (innerError) {
          console.warn('No se pudo abrir el PDF:', entry.name, innerError);
        }
      }
    } finally {
      if (generation === this.generation) {
        this.isLoading.set(false);
      }
    }
  }

  async nextPdfPage(): Promise<void> {
    const entry = this.entry();
    if (!entry || this.pdfCurrentPage() >= this.pdfTotalPages()) {
      return;
    }
    const next = this.pdfCurrentPage() + 1;
    this.pdfCurrentPage.set(next);
    await this.loadPdfPage(entry, next, this.generation);
  }

  async prevPdfPage(): Promise<void> {
    const entry = this.entry();
    if (!entry || this.pdfCurrentPage() <= 1) {
      return;
    }
    const previous = this.pdfCurrentPage() - 1;
    this.pdfCurrentPage.set(previous);
    await this.loadPdfPage(entry, previous, this.generation);
  }

  private async loadPdfPage(entry: BrowserEntry, pageNumber: number, generation: number): Promise<void> {
    this.pdfLoading.set(true);
    try {
      const { data } = await FileTree.pdfPage({ uri: entry.path, page: pageNumber - 1, max: PDF_PAGE_MAX });
      if (generation === this.generation) {
        this.pdfPageUrl.set(data);
      }
    } catch (error) {
      console.warn('No se pudo renderizar la página:', entry.name, error);
      if (generation === this.generation) {
        this.pdfPageUrl.set(null);
      }
    } finally {
      if (generation === this.generation) {
        this.pdfLoading.set(false);
      }
    }
  }

  private async loadText(entry: BrowserEntry): Promise<string | null> {
    if (entry.path.startsWith('content://')) {
      try {
        const result = await FileTree.readText({ uri: entry.path });
        return result.text;
      } catch (error) {
        console.warn('No se pudo leer el archivo de texto:', entry.name, error);
        return null;
      }
    }
    const file = await this.readWebFile(entry);
    if (file) {
      try {
        return await file.text();
      } catch (error) {
        console.warn('No se pudo leer el archivo de texto:', entry.name, error);
        return null;
      }
    }
    if (entry.thumb?.startsWith('blob:')) {
      try {
        const response = await fetch(entry.thumb);
        return await response.text();
      } catch (error) {
        console.warn('No se pudo leer el archivo de texto:', entry.name, error);
      }
    }
    return null;
  }

  private async readWebFile(entry: BrowserEntry): Promise<File | null> {
    if (entry.file instanceof File) {
      return entry.file;
    }
    if (entry.handle) {
      try {
        return await (entry.handle as FileSystemFileHandle).getFile();
      } catch (error) {
        console.warn('No se pudo leer el archivo:', entry.name, error);
      }
    }
    return null;
  }

  private async webUrl(entry: BrowserEntry): Promise<string | null> {
    const file = await this.readWebFile(entry);
    if (file) {
      const url = URL.createObjectURL(file);
      this.createdUrls.push(url);
      return url;
    }
    if (entry.thumb?.startsWith('blob:') || entry.thumb?.startsWith('data:')) {
      return entry.thumb;
    }
    return null;
  }

  private async nativeLocalUrl(entry: BrowserEntry): Promise<string | null> {
    try {
      const result = await FileTree.prepareMedia({ uri: entry.path });
      return result.url;
    } catch (error) {
      console.warn('No se pudo preparar el medio nativo:', entry.name, error);
      return null;
    }
  }

  private async nativeImageUrl(entry: BrowserEntry): Promise<string | null> {
    try {
      const result = await FileTree.thumbnail({ uri: entry.path, max: FULLSCREEN_IMAGE_MAX });
      return result.data;
    } catch (error) {
      console.warn('No se pudo generar la imagen completa:', entry.name, error);
      return entry.thumb ?? null;
    }
  }

  private revokeCreatedUrls(): void {
    for (const url of this.createdUrls) {
      URL.revokeObjectURL(url);
    }
    this.createdUrls = [];
  }

  startRename(): void {
    const entry = this.entry();
    if (!entry) {
      return;
    }
    this.renameText.set(this.fileBaseName(entry.name));
    this.renameError.set(null);
    this.isRenaming.set(true);
  }

  cancelRename(): void {
    this.isRenaming.set(false);
    this.renameError.set(null);
  }

  private fileBaseName(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(0, dot) : name;
  }

  async saveRename(): Promise<void> {
    const entry = this.entry();
    const newBase = this.renameText().trim();
    if (!entry || this.isSavingRename()) {
      return;
    }
    if (!newBase) {
      this.renameError.set('El nombre no puede estar vacío.');
      return;
    }
    const newName = this.completeName(entry.name, newBase);
    if (newName === entry.name) {
      this.isRenaming.set(false);
      this.renameError.set(null);
      return;
    }
    this.isSavingRename.set(true);
    this.renameError.set(null);
    try {
      const newPath = this.rebuildPath(entry, newName);
      await this.renameFile(entry, newName);
      this.renamed.emit({ oldPath: entry.path, newPath, newName });
      this.renameText.set(newBase);
      this.isRenaming.set(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.renameError.set(`No se pudo renombrar: ${message}`);
      console.warn('No se pudo renombrar el archivo:', entry.name, error);
    } finally {
      this.isSavingRename.set(false);
    }
  }

  private completeName(oldName: string, newBase: string): string {
    const dot = oldName.lastIndexOf('.');
    return dot > 0 ? `${newBase}${oldName.slice(dot)}` : newBase;
  }

  private rebuildPath(entry: BrowserEntry, newName: string): string {
    if (entry.path.startsWith('content://')) {
      const slash = entry.path.lastIndexOf('/');
      const base = slash > 0 ? entry.path.slice(0, slash + 1) : entry.path;
      return `${base}${newName}`;
    }
    const slash = entry.path.lastIndexOf('/');
    const base = slash > 0 ? entry.path.slice(0, slash + 1) : '';
    return `${base}${newName}`;
  }

  private async renameFile(entry: BrowserEntry, newName: string): Promise<void> {
    if (this.isNative) {
      await this.renameNative(entry, newName);
      return;
    }
    await this.renameWeb(entry, newName);
  }

  private async renameWeb(entry: BrowserEntry, newName: string): Promise<void> {
    const handle = entry.handle as FileSystemFileHandle | undefined;
    if (!handle) {
      throw new Error(
        'Este archivo no se puede renombrar aquí (no hay acceso de escritura a la carpeta).',
      );
    }
    const moveFn = (handle as FileSystemFileHandle & { move?: (n: string) => Promise<void> }).move;
    if (typeof moveFn === 'function') {
      await moveFn.call(handle, newName);
      return;
    }
    throw new Error('Tu navegador no permite renombrar el archivo directamente.');
  }

  private async renameNative(entry: BrowserEntry, newName: string): Promise<void> {
    const treeMatch = entry.path.match(/^((?:content|file):\/\/[^/]+\/tree\/[^/]+)\/.+$/);
    if (!treeMatch) {
      throw new Error('No se pudo determinar el destino del archivo.');
    }
    const destTreeUri = treeMatch[1];
    await FileTree.move({
      sourceUri: entry.path,
      destTreeUri,
      destRelativePath: newName,
    });
  }
}