import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Game } from '../../services/game';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile implements OnInit {
  profile: any = null;
  games: any[] = [];
  achievements: any[] = [];
  loading = true;
  editCity = '';
  activeTab = 'stats';
  upgradeMsg = '';
  currentHint = '';
  showProModal = false;

  constructor(
    private gameService: Game,
    private auth: Auth,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadProfile();
  }

  loadProfile() {
    this.gameService.getProfile().subscribe({
      next: (data) => {
        this.profile = data;
        this.editCity = data.city;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
    this.gameService.getGames().subscribe({
      next: (data) => {
        this.games = data;
        this.cdr.detectChanges();
      }
    });
    this.gameService.getAchievements().subscribe({
      next: (data) => {
        this.achievements = data;
        this.cdr.detectChanges();
      }
    });
  }

  saveCity() {
    this.gameService.updateProfile({ city: this.editCity }).subscribe({
      next: () => {
        this.profile.city = this.editCity;
        this.cdr.detectChanges();
      }
    });
  }

  upgradeToPro() {
    this.gameService.upgradeToPro().subscribe({
      next: () => {
        this.profile.is_pro = true;
        this.upgradeMsg = 'Добро пожаловать в Pro!';
        this.cdr.detectChanges();
      },
      error: () => {
        this.upgradeMsg = 'Недостаточно монет (нужно 500)';
        this.cdr.detectChanges();
      }
    });
  }

  getWinRate(): number {
    if (!this.profile) return 0;
    const total = this.profile.wins + this.profile.losses + this.profile.draws;
    if (total === 0) return 0;
    return Math.round((this.profile.wins / total) * 100);
  }

  onHintReady(move: string) {
    this.currentHint = move;
    this.cdr.detectChanges();
  }

  logout() {
    this.auth.logout();
  }
}
