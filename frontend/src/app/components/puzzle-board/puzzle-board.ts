import { Component, Input, OnChanges, OnDestroy, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chess } from 'chess.js';
import { Stockfish } from '../../services/stockfish';

@Component({
  selector: 'app-puzzle-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './puzzle-board.html',
  styleUrl: './puzzle-board.scss'
})
export class PuzzleBoard implements OnChanges, OnDestroy {
  @Input() fen = '';
  @Input() solution: string[] = [];
  @Input() active = true;
  @Output() solved = new EventEmitter<boolean>();

  chess!: Chess;
  board: any[][] = [];
  selected: string | null = null;
  legalMoves: string[] = [];
  lastMove: { from: string; to: string } | null = null;
  message = '';
  messageType = '';
  solutionIndex = 0;
  waitingForComputer = false;

  readonly PIECES: Record<string, string> = {
    wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
    bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
  };
  readonly FILES = ['a','b','c','d','e','f','g','h'];

  constructor(private cdr: ChangeDetectorRef, private stockfish: Stockfish) {}

  ngOnChanges() {
    if (this.fen) {
      this.stockfish.init();
      this.chess = new Chess(this.fen);
      this.selected = null;
      this.legalMoves = [];
      this.lastMove = null;
      this.message = '';
      this.messageType = '';
      this.solutionIndex = 0;
      this.waitingForComputer = false;
      this.renderBoard();
    }
  }

  ngOnDestroy() { this.stockfish.destroy(); }

  renderBoard() {
    try {
      const raw = this.chess.board();
      this.board = [];
      for (let r = 0; r < 8; r++) {
        const row = [];
        for (let c = 0; c < 8; c++) {
          const rank = 7 - r;
          const file = c;
          const sq = this.FILES[file] + (rank + 1);
          const piece = raw[7 - rank][file];
          row.push({
            sq,
            piece: piece ? piece.color + piece.type.toUpperCase() : null,
            isLight: (file + rank) % 2 !== 0,
            isSelected: this.selected === sq,
            isLegal: this.legalMoves.includes(sq),
            isLastMove: this.lastMove?.from === sq || this.lastMove?.to === sq,
          });
        }
        this.board.push(row);
      }
      this.cdr.detectChanges();
    } catch(e) {}
  }

  normalizeSan(san: string): string {
    
    return san.replace(/^([NBRQK])[a-h1-8](x)/, '$1$2')
      .replace(/^([NBRQK])[a-h1-8]([a-h][1-8])/, '$1$2');
  }

  onSquareClick(sq: string) {
    if (!this.active || this.waitingForComputer) return;
    if (this.solutionIndex >= this.solution.length) return;

    const piece = this.chess.get(sq as any);

    if (this.selected) {
      if (this.legalMoves.includes(sq)) {
        const move = this.chess.move({ from: this.selected as any, to: sq as any, promotion: 'q' });

        if (move) {
          this.lastMove = { from: move.from, to: move.to };
          this.selected = null;
          this.legalMoves = [];

          const uciShort = `${move.from}${move.to}`;
          const uci = `${move.from}${move.to}${move.promotion ?? ''}`;
          const expected = this.solution[this.solutionIndex];
          console.log('normalized san:', move.san.replace(/[+#]/g, ''), '| normalized expected:', expected.replace(/[+#]/g, ''));
          const normalize = (san: string) => {
            return san
              .replace(/[+#]/g, '')
              .replace(/^([NBRQK])[a-h][1-8]([a-h][1-8])/, '$1$2')  
              .replace(/^([NBRQK])[a-h](x)/, '$1$2');               
          };
          const isCorrect =
            move.san.replace(/[+#]/g, '') === expected.replace(/[+#]/g, '') ||
            uciShort === expected ||
            uci === expected;

          if (isCorrect) {
            this.solutionIndex++;

            if (this.solutionIndex >= this.solution.length) {
              this.message = '✓ Правильно!';
              this.messageType = 'success';
              this.solved.emit(true);
              this.renderBoard();
              return;
            }

            
            this.waitingForComputer = true;
            this.message = 'Соперник думает...';
            this.messageType = 'success';
            this.renderBoard();

            setTimeout(() => {
              const computerSan = this.solution[this.solutionIndex];
              try {
                const m = this.chess.move(computerSan);
                if (m) {
                  this.lastMove = { from: m.from, to: m.to };
                  this.solutionIndex++;
                } else {
                  
                  const legal = this.chess.moves({ verbose: true });
                  if (legal.length > 0) {
                    const m2 = this.chess.move(legal[0]);
                    if (m2) {
                      this.lastMove = { from: m2.from, to: m2.to };
                      this.solutionIndex++;
                    }
                  }
                }
              } catch(e) {
                
                try {
                  const legal = this.chess.moves({ verbose: true });
                  if (legal.length > 0) {
                    const m2 = this.chess.move(legal[0] as any);
                    if (m2) {
                      this.lastMove = { from: m2.from, to: m2.to };
                      this.solutionIndex++;
                    }
                  }
                } catch(e2) {}
              }

              this.waitingForComputer = false;
              this.message = '';
              this.messageType = '';

              if (this.solutionIndex >= this.solution.length) {
                this.message = '✓ Правильно!';
                this.messageType = '';
                this.solved.emit(true);
              }

              this.renderBoard();
            }, 700);
          } else {
            this.chess.undo();
            this.lastMove = null;
            this.message = 'Неверно. Попробуй ещё!';
            this.messageType = 'error';
            this.renderBoard();
          }
          return;
        }
      }

      this.selected = null;
      this.legalMoves = [];
      if (this.messageType === 'error') {
        this.message = '';
        this.messageType = '';
      }
    }

    if (piece && piece.color === this.chess.turn()) {
      console.log('Выбрана фигура:', sq, '| ход:', this.chess.turn(), '| solutionIndex:', this.solutionIndex);
      this.selected = sq;
      this.legalMoves = this.chess.moves({ square: sq as any, verbose: true })
        .map((m: any) => m.to);
    }
    this.renderBoard();
  }

  getPiece(code: string): string { return this.PIECES[code] || ''; }
}
