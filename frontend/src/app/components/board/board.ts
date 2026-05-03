import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chess } from 'chess.js';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './board.html',
  styleUrl: './board.scss'
})
export class Board implements OnInit, OnDestroy {
  @Input() flipped = false;
  @Input() playerColor: 'w' | 'b' = 'w';
  @Input() difficulty = 3;
  @Input() boardTheme: { light: string; dark: string } = { light: '#f0d9b5', dark: '#b58863' };
  @Input() timeControl: { label: string; minutes: number; increment: number } = { label: 'Без лимита', minutes: 0, increment: 0 };
  @Output() gameOver = new EventEmitter<any>();
  @Output() moveMade = new EventEmitter<any>();
  @Output() positionEval = new EventEmitter<number>();

  chess = new Chess();
  board: any[][] = [];
  selected: string | null = null;
  legalMoves: string[] = [];
  lastMove: { from: string; to: string } | null = null;
  isAiThinking = false;
  status = '';
  whiteTime = 0;
  blackTime = 0;
  timerInterval: any = null;
  timerStarted = false;
  hintSquares: { from: string; to: string } | null = null;
  hintLoading = false;

  private aiTimer: any = null;
  private stockfish: Worker | null = null;
  private evalDepth = 12;
  private audioCtx: AudioContext | null = null;

  readonly PIECES: Record<string, string> = {
    wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
    bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
  };
  readonly FILES = ['a','b','c','d','e','f','g','h'];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.initTimer();
    this.initStockfish();
    this.renderBoard();
  }

  ngOnDestroy() {
    if (this.aiTimer) clearTimeout(this.aiTimer);
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.stockfish) { this.stockfish.postMessage('quit'); this.stockfish.terminate(); }
    if (this.audioCtx) { this.audioCtx.close(); }
  }


  playSound(type: 'move' | 'capture' | 'check' | 'end') {
    try {
      if (!this.audioCtx) this.audioCtx = new AudioContext();
      const ctx = this.audioCtx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);

      const sounds: Record<string, [number, string, number, number]> = {
        move:    [440, 'sine', 0.08, 0.08],
        capture: [280, 'square', 0.12, 0.15],
        check:   [660, 'sine', 0.15, 0.25],
        end:     [330, 'sine', 0.2, 0.6],
      };

      const [freq, wave, vol, dur] = sounds[type];
      o.frequency.value = freq as number;
      o.type = wave as OscillatorType;
      g.gain.setValueAtTime(vol as number, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (dur as number));
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + (dur as number));
    } catch {}
  }


  launchConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#c9a84c', '#e2b96f', '#f0ebe0', '#ffffff', '#b58863'];
    const pieces: any[] = [];

    for (let i = 0; i < 120; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        r: Math.random() * Math.PI * 2,
        rv: (Math.random() - 0.5) * 0.2,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 4 + 2,
      });
    }

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.rv;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      frame++;
      if (frame < 180) requestAnimationFrame(animate);
      else canvas.remove();
    };
    animate();
  }


  initTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerStarted = false;
    if (!this.timeControl.minutes) return;
    this.whiteTime = this.timeControl.minutes * 60;
    this.blackTime = this.timeControl.minutes * 60;
  }

  startTimer() {
    if (!this.timeControl.minutes || this.timerStarted) return;
    this.timerStarted = true;
    this.timerInterval = setInterval(() => {
      if (this.isAiThinking || this.chess.isGameOver()) return;
      if (this.chess.turn() === 'w') {
        this.whiteTime--;
        if (this.whiteTime <= 0) {
          this.whiteTime = 0;
          clearInterval(this.timerInterval);
          this.status = 'Время вышло! Чёрные победили';
          this.gameOver.emit({ result: 'black', pgn: this.chess.pgn(), moves: this.chess.history(), reason: 'timeout' });
          this.cdr.detectChanges();
        }
      } else {
        this.blackTime--;
        if (this.blackTime <= 0) {
          this.blackTime = 0;
          clearInterval(this.timerInterval);
          this.status = 'Время вышло! Белые победили';
          this.gameOver.emit({ result: 'white', pgn: this.chess.pgn(), moves: this.chess.history(), reason: 'timeout' });
          this.cdr.detectChanges();
        }
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  addIncrement(color: 'w' | 'b') {
    if (!this.timeControl.increment) return;
    if (color === 'w') this.whiteTime += this.timeControl.increment;
    else this.blackTime += this.timeControl.increment;
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }


  initStockfish() {
    try {
      this.stockfish = new Worker('/stockfish.js');
      this.stockfish.postMessage('uci');
      this.stockfish.postMessage('isready');
      this.stockfish.onmessage = (e: MessageEvent) => {
        const line: string = e.data;
        if (!line.startsWith('info') || !line.includes('score')) return;
        const mateMatch = line.match(/score mate (-?\d+)/);
        const cpMatch = line.match(/score cp (-?\d+)/);
        let prob: number;
        if (mateMatch) {
          const mateIn = parseInt(mateMatch[1]);
          prob = mateIn > 0 ? (this.chess.turn() === 'w' ? 95 : 5) : (this.chess.turn() === 'w' ? 5 : 95);
        } else if (cpMatch) {
          const cp = parseInt(cpMatch[1]);
          const whiteCP = this.chess.turn() === 'w' ? cp : -cp;
          prob = Math.round(50 + 50 * (2 / (1 + Math.exp(-0.00368 * whiteCP)) - 1));
        } else { return; }
        const playerProb = this.playerColor === 'w' ? Math.min(95, Math.max(5, prob)) : Math.min(95, Math.max(5, 100 - prob));
        this.positionEval.emit(playerProb);
        this.cdr.detectChanges();
      };
      this.stockfish.onerror = () => { this.stockfish = null; };
    } catch { this.stockfish = null; }
  }

  requestStockfishEval() {
    if (!this.stockfish || this.chess.isGameOver()) return;
    this.stockfish.postMessage('stop');
    this.stockfish.postMessage(`position fen ${this.chess.fen()}`);
    this.stockfish.postMessage(`go depth ${this.evalDepth}`);
  }


  renderBoard() {
    const raw = this.chess.board();
    this.board = [];
    for (let r = 0; r < 8; r++) {
      const row = [];
      for (let c = 0; c < 8; c++) {
        const rank = this.flipped ? r : 7 - r;
        const file = this.flipped ? 7 - c : c;
        const sq = this.FILES[file] + (rank + 1);
        const piece = raw[7 - rank][file];
        row.push({
          sq,
          piece: piece ? piece.color + piece.type.toUpperCase() : null,
          isLight: (file + rank) % 2 !== 0,
          isSelected: this.selected === sq,
          isLegal: this.legalMoves.includes(sq),
          isLastMove: this.lastMove?.from === sq || this.lastMove?.to === sq,
          isCheck: this.chess.inCheck() && piece?.type === 'k' && piece?.color === this.chess.turn()
        });
      }
      this.board.push(row);
    }
    this.updateStatus();
    if (!this.stockfish) {
      const evalScore = this.evaluate();
      const prob = Math.round(50 + 50 * (2 / (1 + Math.exp(-0.00368 * evalScore)) - 1));
      const playerProb = this.playerColor === 'w' ? Math.min(95, Math.max(5, prob)) : Math.min(95, Math.max(5, 100 - prob));
      this.positionEval.emit(playerProb);
    }
    this.cdr.detectChanges();
  }

  evaluate(): number {
    if (this.chess.isCheckmate()) return this.chess.turn() === 'w' ? -99999 : 99999;
    if (this.chess.isDraw()) return 0;
    const PV: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
    let score = 0;
    for (const row of this.chess.board()) {
      for (const piece of row) {
        if (!piece) continue;
        score += piece.color === 'w' ? (PV[piece.type] || 0) : -(PV[piece.type] || 0);
      }
    }
    const mobilityScore = this.chess.moves().length * 2;
    score += this.chess.turn() === 'w' ? mobilityScore : -mobilityScore;
    for (const sq of ['e4', 'd4', 'e5', 'd5']) {
      const piece = this.chess.get(sq as any);
      if (piece) score += piece.color === 'w' ? 15 : -15;
    }
    for (const sq of ['b1', 'c1', 'f1', 'g1']) { if (!this.chess.get(sq as any)) score += 15; }
    for (const sq of ['b8', 'c8', 'f8', 'g8']) { if (!this.chess.get(sq as any)) score -= 15; }
    for (let file = 0; file < 8; file++) {
      let wp = 0, bp = 0;
      for (let rank = 0; rank < 8; rank++) {
        const sq = String.fromCharCode(97 + file) + (rank + 1);
        const piece = this.chess.get(sq as any);
        if (piece?.type === 'p' && piece?.color === 'w') wp++;
        if (piece?.type === 'p' && piece?.color === 'b') bp++;
      }
      if (wp > 1) score -= 20 * (wp - 1);
      if (bp > 1) score += 20 * (bp - 1);
    }
    return score;
  }


  onSquareClick(sq: string) {
    if (this.isAiThinking || this.chess.isGameOver()) return;
    if (this.chess.turn() !== this.playerColor) return;
    const piece = this.chess.get(sq as any);

    if (this.selected) {
      if (this.legalMoves.includes(sq)) {
        const targetPiece = this.chess.get(sq as any);
        const move = this.chess.move({ from: this.selected as any, to: sq as any, promotion: 'q' });
        if (move) {
          this.lastMove = { from: move.from, to: move.to };
          this.selected = null;
          this.legalMoves = [];
          this.addIncrement(this.playerColor);
          this.startTimer();
          if (this.chess.inCheck()) this.playSound('check');
          else if (targetPiece) this.playSound('capture');
          else this.playSound('move');
          this.moveMade.emit({ move: move.san, pgn: this.chess.pgn(), moves: this.chess.history() });
          this.renderBoard();
          this.requestStockfishEval();
          if (this.chess.isGameOver()) { this.emitGameOver(); return; }
          this.isAiThinking = true;
          this.renderBoard();
          this.aiTimer = setTimeout(() => this.makeAiMove(), 400);
          return;
        }
      }
      this.selected = null;
      this.legalMoves = [];
    }

    if (piece && piece.color === this.playerColor) {
      this.selected = sq;
      this.legalMoves = this.chess.moves({ square: sq as any, verbose: true }).map((m: any) => m.to);
    }
    this.renderBoard();
  }

  makeAiMove() {
    if (this.chess.isGameOver()) { this.isAiThinking = false; this.renderBoard(); return; }
    const moves = this.chess.moves();
    if (!moves.length) { this.isAiThinking = false; this.renderBoard(); return; }

    const aiIsWhite = this.playerColor === 'b';
    let bestMove = null;
    let bestVal = aiIsWhite ? -Infinity : Infinity;

    const shuffled = [...moves];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    for (const m of shuffled) {
      this.chess.move(m);
      const val = this.minimax(this.difficulty - 1, -Infinity, Infinity, !aiIsWhite);
      this.chess.undo();
      if (aiIsWhite ? val > bestVal : val < bestVal) { bestVal = val; bestMove = m; }
    }

    if (bestMove) {
      const targetPiece = this.chess.get((bestMove as string).slice(2, 4) as any);
      const result = this.chess.move(bestMove);
      if (result) {
        this.lastMove = { from: result.from, to: result.to };
        if (this.chess.inCheck()) this.playSound('check');
        else if (targetPiece) this.playSound('capture');
        else this.playSound('move');
      }
    }

    const aiColor = this.playerColor === 'w' ? 'b' : 'w';
    this.addIncrement(aiColor);
    this.isAiThinking = false;
    this.renderBoard();
    this.requestStockfishEval();
    if (this.chess.isGameOver()) this.emitGameOver();
  }

  minimax(depth: number, alpha: number, beta: number, maximizing: boolean): number {
    if (depth === 0 || this.chess.isGameOver()) return this.evaluate();
    const moves = this.chess.moves();
    if (maximizing) {
      let best = -Infinity;
      for (const m of moves) {
        this.chess.move(m);
        const val = this.minimax(depth - 1, alpha, beta, false);
        this.chess.undo();
        best = Math.max(best, val);
        alpha = Math.max(alpha, val);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const m of moves) {
        this.chess.move(m);
        const val = this.minimax(depth - 1, alpha, beta, true);
        this.chess.undo();
        best = Math.min(best, val);
        beta = Math.min(beta, val);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  updateStatus() {
    if (this.chess.isCheckmate()) this.status = `Мат! ${this.chess.turn() === 'w' ? 'Чёрные' : 'Белые'} победили`;
    else if (this.chess.isDraw()) this.status = 'Ничья';
    else if (this.chess.inCheck()) this.status = 'Шах!';
    else if (this.isAiThinking) this.status = 'AI думает...';
    else this.status = this.chess.turn() === 'w' ? 'Ход белых' : 'Ход чёрных';
  }

  emitGameOver() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    const result = this.chess.isCheckmate() ? (this.chess.turn() === 'w' ? 'black' : 'white') : 'draw';
    if (this.chess.isCheckmate()) {
      const playerWon = (result === 'white' && this.playerColor === 'w') || (result === 'black' && this.playerColor === 'b');
      if (playerWon) this.launchConfetti();
    }
    this.playSound('end');
    this.gameOver.emit({ result, pgn: this.chess.pgn(), moves: this.chess.history() });
  }

  newGame() {
    if (this.aiTimer) clearTimeout(this.aiTimer);
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.chess = new Chess();
    this.selected = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.isAiThinking = false;
    this.timerStarted = false;
    this.initTimer();
    this.renderBoard();
  }
  getHint() {
    if (!this.stockfish || this.isAiThinking || this.chess.isGameOver()) return;
    this.hintLoading = true;
    this.cdr.detectChanges();

    const onMsg = (e: MessageEvent) => {
      const line: string = e.data;
      if (line.startsWith('bestmove')) {
        const move = line.split(' ')[1];
        if (move && move !== '(none)') {
          this.hintSquares = { from: move.slice(0, 2), to: move.slice(2, 4) };
        }
        this.hintLoading = false;
        this.stockfish!.removeEventListener('message', onMsg);
        this.cdr.detectChanges();
        setTimeout(() => { this.hintSquares = null; this.cdr.detectChanges(); }, 3000);
      }
    };

    this.stockfish.addEventListener('message', onMsg);
    this.stockfish.postMessage('stop');
    this.stockfish.postMessage(`position fen ${this.chess.fen()}`);
    this.stockfish.postMessage('go depth 15');
  }

  getPiece(code: string): string { return this.PIECES[code] || ''; }
}
