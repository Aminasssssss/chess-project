import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from './services/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  constructor(public auth: Auth) {}

  ngOnInit() {
    const theme = localStorage.getItem('theme');
    if (theme === 'light') document.body.classList.add('light-theme');
  }

  toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  }

  isDarkTheme(): boolean {
    return !document.body.classList.contains('light-theme');
  }

  getUserCoins(): number {
    const user = this.auth.getUser();
    return user?.coins ?? 0;
  }

  getUserInitial(): string {
    const user = this.auth.getUser();
    return user?.username?.[0]?.toUpperCase() ?? 'U';
  }
}
