import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '../../services/auth';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-coach',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './coach.html',
  styleUrl: './coach.scss'
})
export class Coach implements OnInit {
  analysis = '';
  stats: any = null;
  loading = true;
  error = '';

  sections: { title: string; content: string }[] = [];

  constructor(
    private http: HttpClient,
    public auth: Auth,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (!this.auth.isLoggedIn()) return;
    this.loadAnalysis();
  }

  loadAnalysis(retryCount = 0) {
    this.loading = true;
    this.error = '';

    const headers = new HttpHeaders({ 'Authorization': `Bearer ${this.auth.getToken()}` });
    this.http.get<any>('https://chess-project-5-anui.onrender.com/api/coach/analysis/', { headers }).subscribe({
      next: (data) => {
        this.analysis = data.analysis;
        this.stats = data.stats;
        this.parseSections(data.analysis);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (retryCount < 3 && (err.status === 401 || err.status === 500 || err.status === 0)) {
          setTimeout(() => {
            this.loadAnalysis(retryCount + 1);
          }, 3000);
        } else {
          this.error = err.status === 401 ? 'Ошибка авторизации. Войдите заново.' : 'Не удалось загрузить анализ. Попробуйте позже.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      }
    });
  }

  parseSections(text: string) {
    const sectionTitles = [
      'ОБЩИЙ УРОВЕНЬ',
      'СТИЛЬ ИГРЫ',
      'СИЛЬНЫЕ СТОРОНЫ',
      'СЛАБЫЕ СТОРОНЫ',
      'ПЛАН ТРЕНИРОВОК',
      'ПРОГНОЗ'
    ];

    this.sections = [];
    const lines = text.split('\n');
    let current: { title: string; content: string } | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      const matchedTitle = sectionTitles.find(t => trimmed.startsWith(t));
      if (matchedTitle) {
        if (current) this.sections.push(current);
        current = { title: matchedTitle, content: '' };
      } else if (current && trimmed) {
        current.content += (current.content ? '\n' : '') + trimmed;
      }
    }
    if (current) this.sections.push(current);
  }

  getSectionIcon(title: string): string {
    const icons: Record<string, string> = {
      'ОБЩИЙ УРОВЕНЬ': '♟',
      'СТИЛЬ ИГРЫ': '♞',
      'СИЛЬНЫЕ СТОРОНЫ': '♔',
      'СЛАБЫЕ СТОРОНЫ': '♚',
      'ПЛАН ТРЕНИРОВОК': '♗',
      'ПРОГНОЗ': '♕',
    };
    return icons[title] || '♙';
  }

  getWinRateBar(): number {
    return this.stats?.win_rate || 0;
  }
}
