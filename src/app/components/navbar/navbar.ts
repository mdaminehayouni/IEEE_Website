import { Component } from '@angular/core';

@Component({
  selector: 'app-navbar',
  imports: [],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  isLightTheme = document.documentElement.dataset['theme'] === 'light';

  toggleTheme(): void {
    this.isLightTheme = !this.isLightTheme;
    const theme = this.isLightTheme ? 'light' : 'dark';
    document.documentElement.dataset['theme'] = theme;

    try {
      localStorage.setItem('ieee-isetr-theme', theme);
    } catch (error) {
      console.error('Could not save the theme preference.', error);
    }
  }}
