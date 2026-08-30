import { Component, computed, effect, inject, input, OnDestroy, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faClose, faMusic, faSpinner, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
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
  isNative = Capacitor.isNativePlatform();

  readonly entry = input<BrowserEntry | null>(null);
  readonly close = output<void>();

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
}