import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Chess } from 'chess.js';
import { WebSocketService } from '../../services/websocket';

@Component({
  selector: 'app-multiplayer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './multiplayer.html',
  styleUrl: './multiplayer.scss'
})
export class Multiplayer implements OnInit, OnDestroy {
  mode: 'waiting' | 'lobby' | 'playing' | 'finished' = 'waiting';
  roomCode = '';
  joinCode = '';
  playerColor: 'w' | 'b' = 'w';
  opponentConnected = false;
  status = '';
  gameResult = '';
  linkCopied = false;

  chess = new Chess();
  board: any[][] = [];
  selected: string | null = null;
  legalMoves: string[] = [];
  lastMove: { from: string; to: string } | null = null;
  moveHistory: string[] = [];

  private subs: Subscription[] = [];

  readonly PIECES: Record<string, string> = {
    wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
    bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
  };
  readonly FILES = ['a','b','c','d','e','f','g','h'];

  constructor(
    private ws: WebSocketService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    
    const code = this.route.snapshot.paramMap.get('room_code');
    if (code) {
      this.roomCode = code;
      this.playerColor = 'b';
      this.joinRoom(code);
    }
  }

  ngOnDestroy() {
    this.ws.disconnect();
    this.subs.forEach(s => s.unsubscribe());
  }

  generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  createRoom() {
    this.roomCode = this.generateRoomCode();
    this.playerColor = 'w';
    this.joinRoom(this.roomCode);
  }

  joinByCode() {
    if (!this.joinCode.trim()) return;
    this.roomCode = this.joinCode.trim().toUpperCase();
    this.playerColor = 'b';
    this.joinRoom(this.roomCode);
  }

  joinRoom(code: string) {
    this.mode = 'lobby';
    this.ws.connect(code);

    const msgSub = this.ws.messages$.subscribe(data => {
      this.handleMessage(data);
    });

    const connSub = this.ws.connected$.subscribe(connected => {
      if (!connected && this.mode === 'playing') {
        this.status = 'Соперник отключился';
        this.cdr.detectChanges();
      }
    });

    this.subs.push(msgSub, connSub);
  }

  handleMessage(data: any) {
    switch (data.type) {
      case 'player_joined':
        this.opponentConnected = true;
        if (this.mode === 'lobby') {
          this.mode = 'playing';
          this.chess = new Chess();
          this.renderBoard();
          this.updateStatus();
        }
        break;

      case 'move':
        
        try {
          const result = this.chess.move(data.move);
          if (result) {
            this.lastMove = { from: result.from, to: result.to };
            this.moveHistory = this.chess.history();
            this.renderBoard();
            this.updateStatus();
            if (this.chess.isGameOver()) this.handleGameOver();
          }
        } catch(e) {}
        break;

      case 'player_left':
        this.status = 'Соперник покинул игру';
        this.cdr.detectChanges();
        break;

      case 'game_over':
        this.gameResult = data.result;
        this.mode = 'finished';
        this.cdr.detectChanges();
        break;

      case 'draw_offer':
        if (confirm('Соперник предлагает ничью. Принять?')) {
          this.ws.sendGameOver('draw');
          this.gameResult = 'draw';
          this.mode = 'finished';
        }
        break;
    }
    this.cdr.detectChanges();
  }

  onSquareClick(sq: string) {
    if (this.mode !== 'playing') return;
    if (this.chess.turn() !== this.playerColor) return;
    if (this.chess.isGameOver()) return;

    const piece = this.chess.get(sq as any);

    if (this.selected) {
      if (this.legalMoves.includes(sq)) {
        const move = this.chess.move({
          from: this.selected as any,
          to: sq as any,
          promotion: 'q'
        });
        if (move) {
          this.lastMove = { from: move.from, to: move.to };
          this.selected = null;
          this.legalMoves = [];
          this.moveHistory = this.chess.history();

          
          this.ws.sendMove(move.san, this.chess.fen(), this.chess.pgn());

          this.renderBoard();
          this.updateStatus();

          if (this.chess.isGameOver()) {
            this.handleGameOver();
            return;
          }
          return;
        }
      }
      this.selected = null;
      this.legalMoves = [];
    }

    if (piece && piece.color === this.playerColor) {
      this.selected = sq;
      this.legalMoves = this.chess.moves({ square: sq as any, verbose: true })
        .map((m: any) => m.to);
    }

    this.renderBoard();
  }

  handleGameOver() {
    const result = this.chess.isCheckmate()
      ? (this.chess.turn() === 'w' ? 'black' : 'white')
      : 'draw';
    this.ws.sendGameOver(result);
    this.gameResult = result;
    this.mode = 'finished';
    this.cdr.detectChanges();
  }

  renderBoard() {
    const raw = this.chess.board();
    this.board = [];
    const flipped = this.playerColor === 'b';

    for (let r = 0; r < 8; r++) {
      const row = [];
      for (let c = 0; c < 8; c++) {
        const rank = flipped ? r : 7 - r;
        const file = flipped ? 7 - c : c;
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
    this.cdr.detectChanges();
  }

  updateStatus() {
    if (this.chess.isCheckmate()) {
      this.status = `Мат! ${this.chess.turn() === 'w' ? 'Чёрные' : 'Белые'} победили`;
    } else if (this.chess.isDraw()) {
      this.status = 'Ничья';
    } else if (this.chess.inCheck()) {
      this.status = 'Шах!';
    } else if (this.chess.turn() === this.playerColor) {
      this.status = 'Ваш ход';
    } else {
      this.status = 'Ход соперника...';
    }
  }

  getLink(): string {
    return `${window.location.origin}/play/multiplayer/${this.roomCode}`;
  }

  copyLink() {
    navigator.clipboard.writeText(this.getLink());
    this.linkCopied = true;
    setTimeout(() => { this.linkCopied = false; this.cdr.detectChanges(); }, 2000);
    this.cdr.detectChanges();
  }

  getResultText(): string {
    if (this.gameResult === 'draw') return 'Ничья!';
    const won = (this.gameResult === 'white' && this.playerColor === 'w') ||
      (this.gameResult === 'black' && this.playerColor === 'b');
    return won ? '🏆 Победа!' : '😔 Поражение';
  }

  offerDraw() {
    this.ws.sendDrawOffer('me');
  }

  getPiece(code: string): string {
    return this.PIECES[code] || '';
  }

  newGame() {
    this.ws.disconnect();
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
    this.router.navigate(['/play/multiplayer']);
    this.mode = 'waiting';
    this.roomCode = '';
    this.opponentConnected = false;
    this.chess = new Chess();
    this.board = [];
    this.moveHistory = [];
  }
}
