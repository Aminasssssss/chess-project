import { Component, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef, NgZone, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from '../../services/auth';
import { ChessThreeD } from '../../components/chess-three-d/chess-three-d';
import { FloatingPieces } from '../../components/floating-pieces/floating-pieces';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule, ChessThreeD, FloatingPieces],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements AfterViewInit, OnDestroy {
  @ViewChild('particleCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  rows = [0,1,2,3,4,5,6,7];
  cols = [0,1,2,3,4,5,6,7];
  chipsVisible = false;
  currentMove = 14;
  winPct = 67;
  animatedWin = 67;
  Math = Math;

  stats = [
    { target: 247,   current: 0, suffix: '+', label: 'ОНЛАЙН СЕЙЧАС' },
    { target: 12400, current: 0, suffix: '+', label: 'ПАРТИЙ СЫГРАНО' },
    { target: 98,    current: 0, suffix: '%', label: 'ТОЧНОСТЬ STOCKFISH' },
  ];

  features = ['AI-ТРЕНЕР', 'PUZZLE RUSH', 'KAZAKHSTAN LEAGUE', 'WIN PROBABILITY', 'МУЛЬТИПЛЕЕР', 'ДОСТИЖЕНИЯ', 'DAILY BONUS', 'МАГАЗИН', 'РАНГИ', 'OPENING DETECTOR'];

  tickerItems = [
    'Chess Arena KZ','Kazakhstan League','AI Coach','Puzzle Rush',
    'Stockfish Engine','Win Probability','1200 ELO','Алматы vs Астана',
    'Daily Bonus','Магазин тем','Мультиплеер','ELO Graph',
    'Radar Chart','Opening Detector','WebSocket','Three.js 3D',
  ];

  quotes = [
    { text: 'Шахматы — это искусство анализа.', author: 'Михаил Ботвинник' },
    { text: 'Каждый пешечный ход — необратимое решение.', author: 'Вильгельм Стейниц' },
    { text: 'Шахматы — это жизнь в миниатюре.', author: 'Гарри Каспаров' },
    { text: 'Победа приходит к тому, кто делает предпоследнюю ошибку.', author: 'Савелий Тартаковер' },
  ];
  currentQuote = this.quotes[Math.floor(Math.random() * this.quotes.length)];

  coachPills = ['Стиль игры', 'Главная ошибка', 'ELO прогноз', 'Radar chart', 'Quick tip', 'Дебют совет', 'Критический момент'];

  coachStats = [
    { l: 'Тактика', v: 82 },
    { l: 'Дебют',   v: 65 },
    { l: 'Атака',   v: 74 },
    { l: 'Защита',  v: 58 },
    { l: 'Время',   v: 70 },
  ];

  radarVals = [82, 65, 74, 58, 70, 60];
  radarLabels = [
    { text: 'Тактика',  x: 90,  y: 4   },
    { text: 'Дебют',    x: 163, y: 46  },
    { text: 'Атака',    x: 163, y: 134 },
    { text: 'Защита',   x: 90,  y: 176 },
    { text: 'Время',    x: 17,  y: 134 },
    { text: 'Позиция',  x: 17,  y: 46  },
  ];

  get radarPts(): string {
    return this.radarVals.map((v,i) => {
      const a = (i*60-90)*Math.PI/180, r = 80*(v/100);
      return `${90+r*Math.cos(a)},${90+r*Math.sin(a)}`;
    }).join(' ');
  }

  get radarDots() {
    return this.radarVals.map((v,i) => {
      const a = (i*60-90)*Math.PI/180, r = 80*(v/100);
      return { x: 90+r*Math.cos(a), y: 90+r*Math.sin(a) };
    });
  }

  hexPts(cx: number, cy: number, r: number): string {
    return Array.from({length:6},(_,i)=>{
      const a=(i*60-90)*Math.PI/180;
      return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;
    }).join(' ');
  }

  cityData = [
    { name: 'Алматы',    elo: 1387, w: 100 },
    { name: 'Астана',    elo: 1342, w: 88  },
    { name: 'Шымкент',   elo: 1298, w: 74  },
    { name: 'Қарағанды', elo: 1261, w: 62  },
    { name: 'Павлодар',  elo: 1234, w: 54  },
  ];

  winHistory = [55,60,48,65,70,62,67,72,68,75,67,80,74,67];

  rankFlow = [
    { icon:'♙', n:'Новичок',    range:'0–1199',   active:false },
    { icon:'♘', n:'Любитель',   range:'1200–1399', active:true  },
    { icon:'♗', n:'Кандидат',   range:'1400–1599', active:false },
    { icon:'♖', n:'Мастер',     range:'1600–1999', active:false },
    { icon:'♛', n:'Гроссмейстер',range:'2000+',   active:false },
  ];

  themeList = [
    { name:'Классика', l:'#f0d9b5', d:'#b58863', free:true,  active:true,  price:0   },
    { name:'Изумруд',  l:'#ffffdd', d:'#86a666', free:false, active:false, price:200 },
    { name:'Ночь',     l:'#e8e9b7', d:'#4a4a6a', free:false, active:false, price:300 },
    { name:'Розовый',  l:'#f0d9e8', d:'#c07898', free:false, active:false, price:350 },
  ];

  achList = [
    { ico:'♟', t:'First Blood',   d:'Первая победа'     },
    { ico:'♞', t:'On Fire',       d:'10 побед'          },
    { ico:'♔', t:'Unstoppable',   d:'5 побед подряд'    },
    { ico:'♛', t:'Rising Star',   d:'ELO 1600'          },
    { ico:'♗', t:'Puzzle Wizard', d:'50 задач решено'   },
  ];

  openingExamples = [
    { moves:'e4 e5',          n:'Открытая игра'        },
    { moves:'e4 c5',          n:'Сицилианская защита'  },
    { moves:'e4 e5 Nf3 Nc6 Bb5', n:'Испанская партия'  },
    { moves:'d4 d5 c4',       n:'Ферзевый гамбит'      },
  ];

  streamers = [
    { name:'GothamChess',   subs:'4.5M', live:true  },
    { name:'Hikaru',        subs:'2.1M', live:false },
    { name:'BotezLive',     subs:'1.2M', live:true  },
    { name:'DanielNaro',    subs:'800K', live:false },
    { name:'Anna Cramling', subs:'650K', live:true  },
    { name:'Кирилл Щ.',    subs:'120K', live:false },
  ];

  private intervals: any[] = [];

  constructor(public auth: Auth, private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  ngAfterViewInit() {
    this.animateCounters();
    this.initParticles();
    this.setupReveal();
    setTimeout(() => { this.chipsVisible = true; this.cdr.detectChanges(); }, 2000);
    this.startLiveAnimations();
  }

  ngOnDestroy() { this.intervals.forEach(i => clearInterval(i)); }

  animateCounters() {
    this.ngZone.runOutsideAngular(() => {
      this.stats.forEach((s,i) => {
        setTimeout(() => {
          const dur=2500, start=Date.now();
          const tick=()=>{
            const p=Math.min((Date.now()-start)/dur,1);
            s.current=Math.floor((1-Math.pow(1-p,4))*s.target);
            this.cdr.detectChanges();
            if(p<1) requestAnimationFrame(tick);
            else { s.current=s.target; this.cdr.detectChanges(); }
          };
          requestAnimationFrame(tick);
        }, i*300+800);
      });
    });
  }

  startLiveAnimations() {
    this.ngZone.runOutsideAngular(() => {
      const wv=[67,55,72,48,81,60,75,58,83,64]; let wi=0;
      this.intervals.push(setInterval(()=>{ this.animatedWin=wv[wi++%wv.length]; this.cdr.detectChanges(); },2800));
      this.intervals.push(setInterval(()=>{ this.currentMove++; this.cdr.detectChanges(); },3500));
    });
  }

  initParticles() {
    this.ngZone.runOutsideAngular(() => {
      const canvas = this.canvasRef?.nativeElement;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      const resize=()=>{ canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight; };
      resize();
      window.addEventListener('resize', resize);
      const pts=Array.from({length:60},()=>({
        x:Math.random()*canvas.width, y:Math.random()*canvas.height,
        r:Math.random()*1.2+.3, vx:(Math.random()-.5)*.2, vy:(Math.random()-.5)*.2,
        a:Math.random()*.4+.06,
      }));
      const draw=()=>{
        ctx.clearRect(0,0,canvas.width,canvas.height);
        pts.forEach(p=>{
          p.x=(p.x+p.vx+canvas.width)%canvas.width;
          p.y=(p.y+p.vy+canvas.height)%canvas.height;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
          ctx.fillStyle=`rgba(201,168,76,${p.a})`; ctx.fill();
        });
        for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
          const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);
          if(d<80){ ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
            ctx.strokeStyle=`rgba(201,168,76,${.06*(1-d/80)})`; ctx.lineWidth=.5; ctx.stroke(); }
        }
        requestAnimationFrame(draw);
      };
      draw();
    });
  }

  setupReveal() {
    setTimeout(()=>{
      const obs=new IntersectionObserver(entries=>{
        entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); } });
      },{threshold:.06});
      document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));
    },200);
  }
}
