import { Component, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Board } from '../../components/board/board';
import { ChessPiece } from '../../components/chess-piece/chess-piece';
import { AiCoach } from '../../services/ai-coach';
import { Game } from '../../services/game';
import { Auth } from '../../services/auth';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-play',
  standalone: true,
  imports: [CommonModule, FormsModule, Board, ChessPiece, RouterLink],
  templateUrl: './play.html',
  styleUrl: './play.scss'
})
export class Play implements OnDestroy {
  mode: 'select'|'playing'|'finished' = 'select';
  personality: any = null;
  playerColor: 'w'|'b' = 'w';
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
  openingName = '';
  showConfetti = false;
  capturedByWhite: string[] = [];
  capturedByBlack: string[] = [];
  materialAdvantage = 0;
  isInCheck = false;
  isAiThinking = false;
  probHistory: number[] = [50];
  confettiArr = Array.from({length:20},(_,i)=>i);
  liveOnline = 247;
  liveGames = 43;
  liveElo = 1847;
  private intervals: any[] = [];

  get selectedTheme() { return { light: this.lightColor, dark: this.darkColor }; }

  difficulties = [
    {value:1,label:'Новичок'},{value:2,label:'Любитель'},
    {value:3,label:'Средний'},{value:4,label:'Продвинутый'},{value:5,label:'Мастер'},
  ];

  timeControls = [
    {label:'Пуля',minutes:1,increment:0},{label:'Блиц',minutes:3,increment:2},
    {label:'Блиц 5',minutes:5,increment:0},{label:'Рапид',minutes:10,increment:0},
    {label:'Без лимита',minutes:0,increment:0},
  ];
  selectedTime = this.timeControls[4];

  presetThemes = [
    {label:'Классика',light:'#f0d9b5',dark:'#b58863'},
    {label:'Океан',light:'#dee3e6',dark:'#8ca2ad'},
    {label:'Изумруд',light:'#ffffdd',dark:'#86a666'},
    {label:'Ночь',light:'#e8e9b7',dark:'#4a4a6a'},
    {label:'Розовый',light:'#f0d9e8',dark:'#c07898'},
    {label:'Серый',light:'#d9d9d9',dark:'#6b6b6b'},
  ];

  private openings = [
    {moves:'e4 e5',name:'Открытая игра'},
    {moves:'e4 c5',name:'Сицилианская защита'},
    {moves:'e4 e6',name:'Французская защита'},
    {moves:'e4 c6',name:'Каро-Канн'},
    {moves:'d4 d5',name:'Закрытая игра'},
    {moves:'d4 Nf6',name:'Индийская защита'},
    {moves:'e4 e5 Nf3 Nc6 Bb5',name:'Испанская партия'},
    {moves:'e4 e5 Nf3 Nc6 Bc4',name:'Дебют двух коней'},
    {moves:'d4 d5 c4',name:'Ферзевый гамбит'},
    {moves:'e4 e5 f4',name:'Королевский гамбит'},
    {moves:'c4',name:'Английское начало'},
    {moves:'Nf3',name:'Дебют Рети'},
  ];

  constructor(private aiCoach: AiCoach, private gameService: Game, public auth: Auth, private cdr: ChangeDetectorRef) {
    this.intervals.push(setInterval(() => {
      this.liveOnline += Math.floor((Math.random()-.4)*3);
      this.liveGames  += Math.floor((Math.random()-.5)*2);
      this.cdr.detectChanges();
    }, 3000));
  }

  ngOnDestroy() { this.intervals.forEach(i => clearInterval(i)); }

  getDiffLabel() { return ['','Новичок','Любитель','Средний','Продвинутый','Мастер'][this.difficulty]||''; }
  getDifficultyName() { return this.getDiffLabel(); }

  detectOpening(moves: string[]) {
    if (moves.length < 2) { this.openingName = ''; return; }
    const joined = moves.slice(0,8).join(' ');
    const match = this.openings.filter(o=>joined.startsWith(o.moves)).sort((a,b)=>b.moves.length-a.moves.length)[0];
    this.openingName = match ? match.name : '';
  }

  startGame() {
    this.mode = 'playing';
    this.analysis = ''; this.gameResult = null; this.moveHistory = [];
    this.winProb = 50; this.pgnCopied = false; this.openingName = '';
    this.capturedByWhite = []; this.capturedByBlack = [];
    this.showConfetti = false; this.probHistory = [50];
    this.cdr.detectChanges();
  }

  onMoveMade(event: any) {
    this.moveHistory = event.moves;
    this.currentPgn = event.pgn;
    this.detectOpening(this.moveHistory);
    this.cdr.detectChanges();
  }

  onPositionEval(prob: number) {
    this.winProb = prob;
    this.probHistory.push(prob);
    if (this.probHistory.length > 14) this.probHistory.shift();
    this.cdr.detectChanges();
  }

  onGameOver(event: any) {
    this.gameResult = event;
    this.mode = 'finished';
    const won = (event.result==='white'&&this.playerColor==='w')||(event.result==='black'&&this.playerColor==='b');
    if (won) { this.showConfetti = true; setTimeout(()=>{ this.showConfetti=false; this.cdr.detectChanges(); },4500); }
    this.cdr.detectChanges();
    if (this.auth.isLoggedIn()) {
      this.gameService.saveGame({ opponent:'AI', pgn:event.pgn, moves:event.moves, result:event.result, player_color:this.playerColor==='w'?'white':'black', opening_name:this.openingName }).subscribe();
    }
    this.detectPersonality();
  }

  detectPersonality() {
    if (!this.moveHistory.length) return;
    const captures = this.moveHistory.filter(m=>m.includes('x')).length;
    const checks   = this.moveHistory.filter(m=>m.includes('+')).length;
    const cr = captures/this.moveHistory.length, ckr = checks/this.moveHistory.length;
    if (ckr>0.15||cr>0.3) this.personality = {type:'Агрессор', desc:'Атакуешь, жертвуешь, давишь.', icon:'♞'};
    else if (this.moveHistory.length>40) this.personality = {type:'Позиционщик', desc:'Терпелив и методичен.', icon:'♗'};
    else this.personality = {type:'Тактик', desc:'Ищешь комбинации и точные ходы.', icon:'♕'};
    this.cdr.detectChanges();
  }

  analyzeGame(retry=0) {
    if (!this.gameResult) return;
    if (!this.auth.isLoggedIn()) { this.analysis='Войдите для AI анализа'; this.cdr.detectChanges(); return; }
    this.analyzing = true; this.cdr.detectChanges();
    this.aiCoach.analyzeGame(this.moveHistory, this.gameResult.result, this.currentPgn).subscribe({
      next: d => { this.analysis=d.analysis; this.analyzing=false; this.cdr.detectChanges(); },
      error: e => {
        if (retry<3&&(e.status===401||e.status===500||e.status===0)) setTimeout(()=>this.analyzeGame(retry+1),3000);
        else { this.analysis=e.status===401?'Ошибка авторизации.':'Не удалось получить анализ.'; this.analyzing=false; this.cdr.detectChanges(); }
      }
    });
  }

  getProbColor() {
    if (this.winProb>65) return '#4caf7d';
    if (this.winProb>45) return '#c9a84c';
    return '#e05050';
  }

  getResultText() {
    if (!this.gameResult) return '';
    if (this.gameResult.result==='draw') return 'Ничья';
    const won=(this.gameResult.result==='white'&&this.playerColor==='w')||(this.gameResult.result==='black'&&this.playerColor==='b');
    return won?'Победа':'Поражение';
  }

  getResultClass() {
    if (!this.gameResult) return '';
    if (this.gameResult.result==='draw') return 'draw';
    const won=(this.gameResult.result==='white'&&this.playerColor==='w')||(this.gameResult.result==='black'&&this.playerColor==='b');
    return won?'win':'loss';
  }

  copyPgn() {
    if (!this.currentPgn) return;
    navigator.clipboard.writeText(this.currentPgn);
    this.pgnCopied=true;
    setTimeout(()=>{ this.pgnCopied=false; this.cdr.detectChanges(); },2000);
    this.cdr.detectChanges();
  }

  newGame() { this.mode='select'; this.analysis=''; this.gameResult=null; this.pgnCopied=false; this.openingName=''; this.cdr.detectChanges(); }
}
