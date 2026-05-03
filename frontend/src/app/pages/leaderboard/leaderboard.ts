import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Game } from '../../services/game';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.scss'
})
export class Leaderboard implements OnInit {
  players: any[] = [];
  loading = true;
  selectedCity = '';

  cities = [
    'Алматы', 'Астана', 'Шымкент', 'Қарағанды',
    'Ақтобе', 'Тараз', 'Павлодар', 'Өскемен'
  ];

  cityStats: any[] = [];

  constructor(
    private gameService: Game,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadLeaderboard();
  }

  loadLeaderboard() {
    this.loading = true;
    this.gameService.getLeaderboard(this.selectedCity).subscribe({
      next: (data) => {
        this.players = data;
        this.calculateCityStats();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  filterByCity(city: string) {
    this.selectedCity = city === this.selectedCity ? '' : city;
    this.loadLeaderboard();
  }

  calculateCityStats() {
    const map: any = {};
    this.players.forEach(p => {
      if (!p.city) return;
      if (!map[p.city]) map[p.city] = { city: p.city, total_elo: 0, count: 0 };
      map[p.city].total_elo += p.elo;
      map[p.city].count++;
    });
    this.cityStats = Object.values(map)
      .map((c: any) => ({ ...c, avg_elo: Math.round(c.total_elo / c.count) }))
      .sort((a: any, b: any) => b.avg_elo - a.avg_elo)
      .slice(0, 5);
  }

  getMedal(index: number): string {
    const medals = ['I', 'II', 'III'];
    return medals[index] || String(index + 1);
  }
}
