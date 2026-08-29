import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faFolderOpen, faBookmark, faChevronUp, faChevronDown } from '@fortawesome/free-solid-svg-icons';

@Component({
  imports: [CommonModule, FontAwesomeModule],
  standalone: true,
  selector: 'app-menu',
  styleUrl: './menu.css',
  templateUrl: './menu.html',
})
export class Menu {

  faFolderOpen = faFolderOpen;
  faBookmark = faBookmark;
  faChevronUp = faChevronUp;
  faChevronDown = faChevronDown;

  currentPath = signal<string>('Path:/downloads');
  selectedBookmarkIndex = signal<number>(0);

  bookmarks = signal<string[]>([
    'Descargas',
    'Documentos',
    'Imágenes',
    'Proyectos',
    'Música',
    'Videos'
  ]);

  selectBookmark(index: number): void {
    this.selectedBookmarkIndex.set(index);
  }

  onMove(): void {
    console.log('Moviendo elemento a:', this.bookmarks()[this.selectedBookmarkIndex()]);
  }

}
