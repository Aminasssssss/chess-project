import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Game } from '../../services/game';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile implements OnInit, AfterViewInit {
  profile: any = null;
  games: any[] = [];
  achievements: any[] = [];
  eloHistory: any[] = [];
  extendedStats: any = null;
  loading = true;
  editCity = '';
  activeTab = 'stats';
  upgradeMsg = '';
  showProModal = false;
  bonusMsg = '';
  bonusClaiming = false;
  quickTip = '';
  loadingTip = false;
  rival: string | null = null;
  rivalLosses = 0;

  private api = 'https://shess-project.onrender.com/api';

  ranks = [
    { name:'Новичок',     min:0,    max:1199,  icon:'♙' },
    { name:'Любитель',    min:1200, max:1399,  icon:'♘' },
    { name:'Кандидат',    min:1400, max:1599,  icon:'♗' },
    { name:'Мастер',      min:1600, max:1999,  icon:'♖' },
    { name:'Гроссмейстер',min:2000, max:9999,  icon:'♛' },
  ];

  proPerks = [
    { icon:'♗', t:'Кастомные темы доски',  d:'6 эксклюзивных тем в магазине'    },
    { icon:'♘', t:'AI Coach без лимитов',  d:'Неограниченный разбор партий'      },
    { icon:'♖', t:'Все 5 уровней AI',      d:'Включая уровень Мастер'            },
    { icon:'♕', t:'Приоритет в турнирах',  d:'Ранний доступ + бонусные монеты'   },
  ];

  get statCards() {
    if (!this.profile) return [];
    return [
      { icon:'♟', label:'ELO рейтинг',    value:this.profile.elo,                  gold:true,  sub:'' },
      { icon:'♔', label:'Победы',          value:this.profile.wins,                 gold:false, sub:'' },
      { icon:'♚', label:'Поражения',       value:this.profile.losses,               gold:false, sub:'' },
      { icon:'♕', label:'Ничьи',           value:this.profile.draws,                gold:false, sub:'' },
      { icon:'%',  label:'Винрейт',         value:this.getWinRate()+'%',             gold:false, sub:'' },
      { icon:'◈', label:'Монеты',          value:this.profile.coins,                gold:true,  sub:'' },
      { icon:'♗', label:'Серия побед',     value:this.profile.streak,               gold:false, sub:'текущая' },
      { icon:'♘', label:'Лучшая серия',    value:this.profile.max_streak,           gold:false, sub:'' },
      { icon:'♙', label:'Рекорд Puzzle',   value:this.profile.puzzle_best_score,    gold:false, sub:'' },
      { icon:'♞', label:'Задач решено',    value:this.profile.puzzles_solved_total, gold:false, sub:'' },
    ];
  }

  constructor(private gameService: Game, private auth: Auth, private router: Router, private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/login']); return; }
    this.loadAll();
  }

  ngAfterViewInit() {
    setTimeout(() => this.animateStats(), 600);
  }

  loadAll() {
    this.gameService.getProfile().subscribe({ next: d => { this.profile=d; this.editCity=d.city; this.loading=false; this.cdr.detectChanges(); this.loadEloHistory(); this.loadExtendedStats(); this.loadRival(); } });
    this.gameService.getGames().subscribe({ next: d => { this.games=d; this.cdr.detectChanges(); } });
    this.gameService.getAchievements().subscribe({ next: d => { this.achievements=d; this.cdr.detectChanges(); } });
  }

  loadEloHistory() {
    const h = new HttpHeaders().set('Authorization',`Bearer ${this.auth.getToken()}`);
    this.http.get<any[]>(`${this.api}/stats/elo-history/`,{headers:h}).subscribe({ next: d => { this.eloHistory=d; this.cdr.detectChanges(); } });
  }

  loadExtendedStats() {
    const h = new HttpHeaders().set('Authorization',`Bearer ${this.auth.getToken()}`);
    this.http.get<any>(`${this.api}/stats/extended/`,{headers:h}).subscribe({ next: d => { this.extendedStats=d; this.cdr.detectChanges(); } });
  }

  loadRival() {
    const h = new HttpHeaders().set('Authorization',`Bearer ${this.auth.getToken()}`);
    this.http.get<any>(`${this.api}/stats/rival/`,{headers:h}).subscribe({ next: d => { this.rival=d.rival; this.rivalLosses=d.losses_to_rival||0; this.cdr.detectChanges(); } });
  }

  claimDailyBonus() {
    if (this.bonusClaiming) return;
    this.bonusClaiming = true;
    const h = new HttpHeaders().set('Authorization',`Bearer ${this.auth.getToken()}`);
    this.http.post<any>(`${this.api}/daily-bonus/`,{},{headers:h}).subscribe({
      next: d => {
        this.bonusMsg = d.already_claimed ? 'Уже получено сегодня' : `+${d.bonus} монет получено!`;
        if (!d.already_claimed) { this.profile.coins=d.coins; this.profile.daily_login_streak=d.daily_login_streak; }
        this.bonusClaiming = false; this.cdr.detectChanges();
        setTimeout(()=>{ this.bonusMsg=''; this.cdr.detectChanges(); },3000);
      },
      error: () => { this.bonusClaiming=false; this.cdr.detectChanges(); }
    });
  }

  loadQuickTip() {
    this.loadingTip = true;
    const h = new HttpHeaders().set('Authorization',`Bearer ${this.auth.getToken()}`);
    this.http.post<any>(`${this.api}/coach/quick-tip/`,{},{headers:h}).subscribe({
      next: d => { this.quickTip=d.tip; this.loadingTip=false; this.cdr.detectChanges(); },
      error: () => { this.loadingTip=false; this.cdr.detectChanges(); }
    });
  }

  getRank() {
    if (!this.profile) return this.ranks[0];
    return this.ranks.find(r=>this.profile.elo>=r.min&&this.profile.elo<=r.max)||this.ranks[0];
  }

  getNextRank() {
    const idx = this.ranks.indexOf(this.getRank());
    return idx < this.ranks.length-1 ? this.ranks[idx+1] : null;
  }

  getRankProgress(): number {
    const rank=this.getRank(), next=this.getNextRank();
    if (!next) return 100;
    return Math.min(Math.round(((this.profile.elo-rank.min)/(next.min-rank.min))*100),100);
  }

  getWinRate():  number { if (!this.profile) return 0; const t=this.profile.wins+this.profile.losses+this.profile.draws; return t===0?0:Math.round(this.profile.wins/t*100); }
  getLossRate(): number { if (!this.profile) return 0; const t=this.profile.wins+this.profile.losses+this.profile.draws; return t===0?0:Math.round(this.profile.losses/t*100); }
  getDrawRate(): number { if (!this.profile) return 0; const t=this.profile.wins+this.profile.losses+this.profile.draws; return t===0?0:Math.round(this.profile.draws/t*100); }

  getEloSvgPath(): string {
    if (!this.eloHistory.length) return '';
    const w=600,h=120,pad=10, elos=this.eloHistory.map(e=>e.elo);
    const min=Math.min(...elos)-50, max=Math.max(...elos)+50;
    const pts=this.eloHistory.map((e,i)=>{ const x=pad+(i/Math.max(elos.length-1,1))*(w-pad*2); const y=h-pad-((e.elo-min)/(max-min))*(h-pad*2); return `${x},${y}`; });
    return `M ${pts.join(' L ')}`;
  }

  getEloFillPath(): string {
    if (!this.eloHistory.length) return '';
    const w=600,h=120,pad=10, elos=this.eloHistory.map(e=>e.elo);
    const min=Math.min(...elos)-50, max=Math.max(...elos)+50;
    const pts=this.eloHistory.map((e,i)=>{ const x=pad+(i/Math.max(elos.length-1,1))*(w-pad*2); const y=h-pad-((e.elo-min)/(max-min))*(h-pad*2); return `${x},${y}`; });
    return `M ${pad},${h-pad} L ${pts.join(' L ')} L ${w-pad},${h-pad} Z`;
  }

  getEloDots() {
    if (!this.eloHistory.length) return [];
    const w=600,h=120,pad=10, elos=this.eloHistory.map(e=>e.elo);
    const min=Math.min(...elos)-50, max=Math.max(...elos)+50;
    return this.eloHistory.map((e,i)=>({ x:pad+(i/Math.max(elos.length-1,1))*(w-pad*2), y:h-pad-((e.elo-min)/(max-min))*(h-pad*2) }));
  }

  getDailyStreakDays(): boolean[] {
    const streak=this.profile?.daily_login_streak||0;
    return Array(7).fill(false).map((_,i)=>i<Math.min(streak,7));
  }

  formatDuration(s: number): string {
    if (!s) return '0м';
    const h=Math.floor(s/3600), m=Math.floor((s%3600)/60);
    return h>0?`${h}ч ${m}м`:`${m}м`;
  }

  animateStats() {
    document.querySelectorAll('.stat-num-animate').forEach(el => {
      const target = parseInt(el.getAttribute('data-target')||'0');
      if (isNaN(target)) return;
      const dur=1400, start=Date.now();
      const tick=()=>{ const p=Math.min((Date.now()-start)/dur,1); const e=1-Math.pow(1-p,3);
        el.textContent=Math.floor(e*target).toString(); if(p<1) requestAnimationFrame(tick); else el.textContent=target.toString(); };
      requestAnimationFrame(tick);
    });
  }

  saveCity() { this.gameService.updateProfile({city:this.editCity}).subscribe({next:()=>{this.profile.city=this.editCity;this.cdr.detectChanges();}}); }
  upgradeToPro() { this.gameService.upgradeToPro().subscribe({next:()=>{this.profile.is_pro=true;this.upgradeMsg='Добро пожаловать в Pro!';this.cdr.detectChanges();},error:()=>{this.upgradeMsg='Недостаточно монет (нужно 500)';this.cdr.detectChanges();}}); }
  logout() { this.auth.logout(); }
}
