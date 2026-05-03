import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Game } from '../../services/game';
import { Auth } from '../../services/auth';
import { PuzzleBoard } from '../../components/puzzle-board/puzzle-board';

@Component({
  selector: 'app-puzzle',
  standalone: true,
  imports: [CommonModule, PuzzleBoard],
  templateUrl: './puzzle.html',
  styleUrl: './puzzle.scss'
})
export class Puzzle implements OnDestroy {
  puzzle: any = null;
  loading = false;
  timeLeft = 300;
  score = 0;
  solved = 0;
  failed = 0;
  showSolution = false;
  mode: 'waiting' | 'playing' | 'finished' = 'waiting';
  timer: any = null;
  autoNextTimer: any = null;
  selectedDifficulty = 'medium';
  rushActive = true;
  seenIds: Set<number> = new Set();
  savingResult = false;
  coinsEarned = 0;

  difficulties = [
    { value: 'easy', label: 'Лёгкий' },
    { value: 'medium', label: 'Средний' },
    { value: 'hard', label: 'Сложный' },
  ];

  constructor(
    private gameService: Game,
    private auth: Auth,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnDestroy() {
    clearInterval(this.timer);
    clearTimeout(this.autoNextTimer);
  }

  startRush() {
    this.score = 0;
    this.solved = 0;
    this.failed = 0;
    this.timeLeft = 300;
    this.showSolution = false;
    this.rushActive = true;
    this.seenIds.clear();
    this.coinsEarned = 0;
    this.mode = 'playing';
    this.loadPuzzle();
    this.startTimer();
    this.cdr.detectChanges();
  }

  loadPuzzle() {
    this.loading = true;
    this.showSolution = false;
    this.gameService.getPuzzle(this.selectedDifficulty).subscribe({
      next: (data: any) => {
        const p = data[0] || null;
        if (p?.id) this.seenIds.add(p.id);
        this.puzzle = p;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  onPuzzleSolved(correct: boolean) {
    if (correct) {
      this.solved++;
      this.score += 10;

      
      if (this.auth.isLoggedIn() && !this.savingResult) {
        this.savingResult = true;
        this.gameService.savePuzzleResult(this.score, this.solved, this.failed).subscribe({
          next: (res) => {
            this.coinsEarned = res.coins_earned;
            const userStr = localStorage.getItem('user');
            if (userStr) {
              const user = JSON.parse(userStr);
              user.coins = res.coins;
              localStorage.setItem('user', JSON.stringify(user));
            }
            this.savingResult = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.savingResult = false;
            this.cdr.detectChanges();
          }
        });
      }

      this.autoNextTimer = setTimeout(() => this.loadPuzzle(), 2000);
    } else {
      this.failed++;
      this.showSolution = true;
    }
    this.cdr.detectChanges();
  }

  startTimer() {
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.cdr.detectChanges();
      if (this.timeLeft <= 0) this.finishRush();
    }, 1000);
  }

  onSkip() {
    this.failed++;
    this.showSolution = true;
    this.cdr.detectChanges();
  }

  nextPuzzle() {
    clearTimeout(this.autoNextTimer);
    this.loadPuzzle();
  }

  finishRush() {
    clearInterval(this.timer);
    clearTimeout(this.autoNextTimer);
    this.rushActive = false;
    this.mode = 'finished';

    if (this.auth.isLoggedIn() && !this.savingResult) {
      this.savingResult = true;
      this.gameService.savePuzzleResult(this.score, this.solved, this.failed).subscribe({
        next: (res) => {
          this.coinsEarned = res.coins_earned;
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            user.coins = res.coins;
            localStorage.setItem('user', JSON.stringify(user));
          }
          this.savingResult = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.savingResult = false;
          this.cdr.detectChanges();
        }
      });
    }
    this.cdr.detectChanges();
  }

  getTimeFormatted(): string {
    const m = Math.floor(this.timeLeft / 60);
    const s = this.timeLeft % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  restart() {
    clearInterval(this.timer);
    clearTimeout(this.autoNextTimer);
    this.mode = 'waiting';
    this.puzzle = null;
    this.showSolution = false;
    this.rushActive = true;
    this.savingResult = false;
    this.coinsEarned = 0;
    this.cdr.detectChanges();
  }
}
