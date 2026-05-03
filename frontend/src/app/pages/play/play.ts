import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Board } from '../../components/board/board';
import { AiCoach } from '../../services/ai-coach';
import { Game } from '../../services/game';
import { Auth } from '../../services/auth';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-play',
  standalone: true,
  imports: [CommonModule, FormsModule, Board, RouterLink],
  templateUrl: './play.html',
  styleUrl: './play.scss'
})
export class Play {
  mode: 'select' | 'playing' | 'finished' = 'select';
  personality: { type: string; desc: string; icon: string } | null = null;
  playerColor: 'w' | 'b' = 'w';
  difficulty = 3;
  gameResult: any = null;
  analysis = '';
  analyzing = false;
  winProb = 50;
  moveHistory: string[] = [];
  currentPgn = '';
  pgnCopied = false;
  showCustomModal = false;
  lightColor = '#f0d9b5';
  darkColor = '#b58863';

  get selectedTheme() {
    return { light: this.lightColor, dark: this.darkColor };
  }

  difficulties = [
    { value: 1, label: 'Новичок' },
    { value: 2, label: 'Любитель' },
    { value: 3, label: 'Средний' },
    { value: 4, label: 'Продвинутый' },
    { value: 5, label: 'Мастер' },
  ];

  timeControls = [
    { label: 'Пуля', minutes: 1, increment: 0 },
    { label: 'Блиц', minutes: 3, increment: 2 },
    { label: 'Блиц 5', minutes: 5, increment: 0 },
    { label: 'Рапид', minutes: 10, increment: 0 },
    { label: 'Без лимита', minutes: 0, increment: 0 },
  ];
  selectedTime = this.timeControls[4];

  presetThemes = [
    { label: 'Классика', light: '#f0d9b5', dark: '#b58863' },
    { label: 'Океан', light: '#dee3e6', dark: '#8ca2ad' },
    { label: 'Изумруд', light: '#ffffdd', dark: '#86a666' },
    { label: 'Ночь', light: '#e8e9b7', dark: '#4a4a6a' },
    { label: 'Розовый', light: '#f0d9e8', dark: '#c07898' },
    { label: 'Серый', light: '#d9d9d9', dark: '#6b6b6b' },
  ];

  constructor(
    private aiCoach: AiCoach,
    private gameService: Game,
    public auth: Auth,
    private cdr: ChangeDetectorRef
  ) {}

  startGame() {
    this.mode = 'playing';
    this.analysis = '';
    this.gameResult = null;
    this.moveHistory = [];
    this.winProb = 50;
    this.pgnCopied = false;
    this.cdr.detectChanges();
  }

  onMoveMade(event: any) {
    this.moveHistory = event.moves;
    this.currentPgn = event.pgn;
    this.cdr.detectChanges();
  }

  onPositionEval(prob: number) {
    this.winProb = prob;
    this.cdr.detectChanges();
  }

  onGameOver(event: any) {
    this.gameResult = event;
    this.mode = 'finished';
    this.cdr.detectChanges();

    if (this.auth.isLoggedIn()) {
      this.gameService.saveGame({
        opponent: 'AI',
        pgn: event.pgn,
        moves: event.moves,
        result: event.result,
        player_color: this.playerColor === 'w' ? 'white' : 'black',
      }).subscribe();
    }

    this.detectPersonality();
  }

  detectPersonality() {
    if (this.moveHistory.length === 0) return;

    const avgMoves = this.moveHistory.length;
    const hasCaptures = this.moveHistory.filter(m => m.includes('x')).length;
    const hasChecks = this.moveHistory.filter(m => m.includes('+')).length;
    const captureRate = hasCaptures / this.moveHistory.length;
    const checkRate = hasChecks / this.moveHistory.length;

    if (checkRate > 0.15 || captureRate > 0.3) {
      this.personality = {
        type: 'Агрессор',
        desc: 'Ты играешь агрессивно — атакуешь, жертвуешь, давишь. Твой стиль — удар до конца.',
        icon: '♞'
      };
    } else if (avgMoves > 40) {
      this.personality = {
        type: 'Позиционщик',
        desc: 'Ты терпелив и методичен. Улучшаешь позицию, ждёшь ошибки соперника.',
        icon: '♗'
      };
    } else {
      this.personality = {
        type: 'Тактик',
        desc: 'Ты ищешь комбинации и точные ходы. Быстрые решения — твоя сила.',
        icon: '♕'
      };
    }
    this.cdr.detectChanges();
  }

  analyzeGame(retryCount = 0) {
    if (!this.gameResult) return;

    if (!this.auth.isLoggedIn()) {
      this.analysis = 'Войдите в аккаунт для AI анализа';
      this.analyzing = false;
      this.cdr.detectChanges();
      return;
    }

    this.analyzing = true;
    this.cdr.detectChanges();

    this.aiCoach.analyzeGame(
      this.moveHistory,
      this.gameResult.result,
      this.currentPgn
    ).subscribe({
      next: (data) => {
        this.analysis = data.analysis;
        this.analyzing = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (retryCount < 3 && (err.status === 401 || err.status === 500 || err.status === 0)) {
          setTimeout(() => {
            this.analyzeGame(retryCount + 1);
          }, 3000);
        } else {
          this.analysis = err.status === 401 ? 'Ошибка авторизации. Войдите заново.' : 'Не удалось получить анализ. Попробуйте позже.';
          this.analyzing = false;
          this.cdr.detectChanges();
        }
      }
    });
  }

  copyPgn() {
    if (!this.currentPgn) return;
    navigator.clipboard.writeText(this.currentPgn);
    this.pgnCopied = true;
    setTimeout(() => { this.pgnCopied = false; this.cdr.detectChanges(); }, 2000);
    this.cdr.detectChanges();
  }

  getResultText(): string {
    if (!this.gameResult) return '';
    if (this.gameResult.result === 'draw') return 'Ничья';
    const playerWon =
      (this.gameResult.result === 'white' && this.playerColor === 'w') ||
      (this.gameResult.result === 'black' && this.playerColor === 'b');
    return playerWon ? 'Победа' : 'Поражение';
  }

  newGame() {
    this.mode = 'select';
    this.analysis = '';
    this.gameResult = null;
    this.pgnCopied = false;
    this.cdr.detectChanges();
  }
}
