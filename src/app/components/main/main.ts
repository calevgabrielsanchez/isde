import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBars, faSmile } from '@fortawesome/free-solid-svg-icons';
import { Menu } from "../menu/menu";

@Component({
  imports: [CommonModule, FontAwesomeModule, Menu],
  selector: 'app-main',
  styleUrl: './main.css',
  templateUrl: './main.html',
})
export class Main {
  // Iconos de FontAwesome
  faBars = faBars;
  faSmile = faSmile;

  // Estado para controlar si el menú está visible o no
  isMenuOpen: boolean = false;

  // Método para alternar la visibilidad del menú
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }
}
