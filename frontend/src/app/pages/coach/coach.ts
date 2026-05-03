import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
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
export class Coach implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('bgCanvas')       bgCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('particleCanvas') particleCanvasRef!: ElementRef<HTMLCanvasElement>;

  analysis = '';
  stats: any = null;
  loading = true;
  error = '';
  sections: { title: string; content: string }[] = [];
  Math = Math;

  toast: { msg: string; type: 'success' | 'error' | 'info' } | null = null;
  private toastTimer: any;

  quickTip = '';
  quickTipLoading = false;

  animElo     = 0;
  animWins    = 0;
  animLosses  = 0;
  animWinRate = 0;
  animStreak  = 0;

  tickerItems = [
    'AI тренер анализирует 20 последних партий',
    'Персональный план тренировок обновлён',
    'Радар навыков построен по реальной статистике',
    'Прогноз ELO рассчитан на основе трендов',
    'Рекомендации дебютов подобраны под твой стиль',
    'Слабые стороны выявлены — время исправлять',
  ];

  funFacts = [
    'Магнус Карлсен выучил дебюты в 8 лет',
    'Гарри Каспаров анализировал по 10 часов в день',
    'ИИ обыграл чемпиона мира впервые в 1997 году',
    'Шахматы существуют уже более 1500 лет',
    'В шахматах больше позиций чем атомов во Вселенной',
  ];
  currentFact = 0;
  private factInterval: any;

  radarAxes = [
    { label: 'Тактика',  value: 50 },
    { label: 'Дебют',    value: 50 },
    { label: 'Эндшпиль', value: 50 },
    { label: 'Атака',    value: 50 },
    { label: 'Защита',   value: 50 },
    { label: 'Время',    value: 50 },
  ];

  private apiUrl = 'https://shess-project.onrender.com/api';
  private intervals: any[] = [];
  private animIds:   any[] = [];
  private bgRenderer: any;
  private _mx = 0; private _my = 0;
  private mouseMoveHandler = (e: MouseEvent) => {
    this._mx = (e.clientX / window.innerWidth  - .5) * 2;
    this._my = (e.clientY / window.innerHeight - .5) * 2;
  };

  constructor(
    private http: HttpClient,
    public auth: Auth,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    if (!this.auth.isLoggedIn()) { this.loading = false; return; }
    this.loadAnalysis();
    this.rotateFacts();
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      this.initBg3D();
      this.initParticles();
    });
    this.setupReveal();
    window.addEventListener('mousemove', this.mouseMoveHandler);
  }

  ngOnDestroy() {
    this.intervals.forEach(i => clearInterval(i));
    this.animIds.forEach(id => cancelAnimationFrame(id));
    this.bgRenderer?.dispose();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.factInterval) clearInterval(this.factInterval);
    window.removeEventListener('mousemove', this.mouseMoveHandler);
  }

  showToast(msg: string, type: 'success' | 'error' | 'info' = 'info') {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { msg, type };
    this.cdr.detectChanges();
    this.toastTimer = setTimeout(() => { this.toast = null; this.cdr.detectChanges(); }, 3500);
  }

  rotateFacts() {
    this.factInterval = setInterval(() => {
      this.currentFact = (this.currentFact + 1) % this.funFacts.length;
      this.cdr.detectChanges();
    }, 2800);
  }

  loadAnalysis(retryCount = 0) {
    this.loading = true;
    this.error = '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`);
    this.http.get<any>(`${this.apiUrl}/coach/`, { headers }).subscribe({
      next: (data) => {
        this.analysis = data.analysis || '';
        this.stats = data.stats || { elo:0, total:0, wins:0, losses:0, draws:0, win_rate:0, streak:0, max_streak:0 };
        this.parseSections(this.analysis);
        this.computeRadar();
        this.loading = false;
        if (this.factInterval) clearInterval(this.factInterval);
        this.cdr.detectChanges();
        this.animateCounters();
        setTimeout(() => this.setupReveal(), 150);
        this.showToast('Анализ загружен', 'success');
      },
      error: (err) => {
        if (retryCount < 3 && (err.status === 401 || err.status === 500 || err.status === 0)) {
          setTimeout(() => this.loadAnalysis(retryCount + 1), 3000);
        } else {
          this.error = err.status === 404
            ? 'Сыграйте несколько партий чтобы получить анализ.'
            : 'Не удалось загрузить анализ.';
          this.loading = false;
          if (this.factInterval) clearInterval(this.factInterval);
          this.cdr.detectChanges();
        }
      }
    });
  }

  parseSections(text: string) {
    if (!text) { this.sections = []; return; }
    const titles = ['ОБЩИЙ УРОВЕНЬ','СТИЛЬ ИГРЫ','СИЛЬНЫЕ СТОРОНЫ','СЛАБЫЕ СТОРОНЫ','ПЛАН ТРЕНИРОВОК','ПРОГНОЗ'];
    this.sections = [];
    let current: { title: string; content: string } | null = null;
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      const matched = titles.find(t => trimmed.startsWith(t));
      if (matched) {
        if (current) this.sections.push(current);
        current = { title: matched, content: '' };
      } else if (current && trimmed) {
        current.content += (current.content ? '\n' : '') + trimmed;
      }
    }
    if (current) this.sections.push(current);
  }

  computeRadar() {
    if (!this.stats) return;
    const wr = this.stats.win_rate || 0;
    const total = this.stats.total || 0;
    const streak = this.stats.streak || 0;
    const elo = this.stats.elo || 1200;
    this.radarAxes = [
      { label: 'Тактика',  value: Math.min(100, Math.round(wr * .8 + streak * 5)) },
      { label: 'Дебют',    value: Math.min(100, Math.round(40 + (elo - 1000) / 20)) },
      { label: 'Эндшпиль', value: Math.min(100, Math.round(30 + wr * .6)) },
      { label: 'Атака',    value: Math.min(100, Math.round(wr * .9 + 10)) },
      { label: 'Защита',   value: Math.min(100, Math.round(50 + (100 - wr) * .4)) },
      { label: 'Время',    value: Math.min(100, Math.round(40 + Math.min(total, 50))) },
    ];
  }

  animateCounters() {
    if (!this.stats) return;
    this.ngZone.runOutsideAngular(() => {
      const targets = [
        { key: 'animElo',     t: this.stats.elo },
        { key: 'animWins',    t: this.stats.wins },
        { key: 'animLosses',  t: this.stats.losses },
        { key: 'animWinRate', t: this.stats.win_rate },
        { key: 'animStreak',  t: this.stats.streak },
      ];
      targets.forEach((item, i) => {
        setTimeout(() => {
          const dur = 1600, start = Date.now();
          const tick = () => {
            const p = Math.min((Date.now() - start) / dur, 1);
            const e = 1 - Math.pow(1 - p, 4);
            (this as any)[item.key] = Math.floor(e * item.t);
            this.cdr.detectChanges();
            if (p < 1) requestAnimationFrame(tick);
            else { (this as any)[item.key] = item.t; this.cdr.detectChanges(); }
          };
          requestAnimationFrame(tick);
        }, i * 180 + 300);
      });
    });
  }

  loadQuickTip() {
    if (this.quickTipLoading) return;
    this.quickTipLoading = true;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`);
    this.http.post<any>(`${this.apiUrl}/coach/quick-tip/`, {}, { headers }).subscribe({
      next: (data) => {
        this.quickTip = data.tip || '';
        this.quickTipLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.quickTip = 'Контролируй центр с первых ходов — это основа всей игры.';
        this.quickTipLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  setupReveal() {
    setTimeout(() => {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
        });
      }, { threshold: .04 });
      document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    }, 120);
  }

  getHexPoints(cx: number, cy: number, r: number): string {
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (i * 60 - 90) * Math.PI / 180;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
  }

  getRadarPoints(): string {
    return this.radarAxes.map((axis, i) => {
      const angle = (i * 60 - 90) * Math.PI / 180;
      const r = 85 * (axis.value / 100);
      return `${110 + r * Math.cos(angle)},${110 + r * Math.sin(angle)}`;
    }).join(' ');
  }

  getSectionIcon(title: string): string {
    const icons: Record<string, string> = {
      'ОБЩИЙ УРОВЕНЬ':   '♟',
      'СТИЛЬ ИГРЫ':      '♞',
      'СИЛЬНЫЕ СТОРОНЫ': '♔',
      'СЛАБЫЕ СТОРОНЫ':  '♚',
      'ПЛАН ТРЕНИРОВОК': '♗',
      'ПРОГНОЗ':         '♕',
    };
    return icons[title] || '♙';
  }

  getPotentialGain(): number {
    if (!this.stats) return 100;
    const wr = this.stats.win_rate || 0;
    if (wr > 60) return 150;
    if (wr > 50) return 100;
    return 75;
  }

  getOpeningRec(): { name: string; desc: string } {
    const elo = this.stats?.elo || 1200;
    if (elo < 1300) return { name: 'Итальянская партия', desc: 'Классический дебют для развития фигур. Идеален для новичков.' };
    if (elo < 1500) return { name: 'Испанская партия',   desc: 'Один из сильнейших дебютов. Создаёт долгосрочное давление.' };
    if (elo < 1700) return { name: 'Сицилианская защита', desc: 'Агрессивный асимметричный дебют с богатой теорией.' };
    return { name: 'Ферзевый гамбит', desc: 'Позиционный дебют высшего уровня. Требует глубокого понимания.' };
  }

  getLevelLabel(): string {
    const elo = this.stats?.elo || 0;
    if (elo < 1200) return 'Новичок';
    if (elo < 1400) return 'Любитель';
    if (elo < 1600) return 'Разрядник';
    if (elo < 1800) return 'Кандидат';
    if (elo < 2000) return 'Мастер';
    return 'Гроссмейстер';
  }

  getLevelProgress(): number {
    const elo = this.stats?.elo || 0;
    const brackets = [0, 1200, 1400, 1600, 1800, 2000, 2200];
    for (let i = 0; i < brackets.length - 1; i++) {
      if (elo < brackets[i + 1]) {
        return Math.round((elo - brackets[i]) / (brackets[i + 1] - brackets[i]) * 100);
      }
    }
    return 100;
  }

  /* ─── THREE.JS BACKGROUND ───────────────────────────────────────── */
  private async initBg3D() {
    const THREE = await import('three') as any;
    const canvas = this.bgCanvasRef?.nativeElement;
    if (!canvas) return;
    const W = canvas.offsetWidth || window.innerWidth;
    const H = canvas.offsetHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(60, W / H, .1, 200);
    cam.position.set(0, 0, 30);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    this.bgRenderer = renderer;

    scene.add(new THREE.AmbientLight(0xfff8e8, .5));
    const pt1 = new THREE.PointLight(0xc9a84c, 2, 60); pt1.position.set(10, 10, 10); scene.add(pt1);
    const pt2 = new THREE.PointLight(0x6040c0, 1.5, 50); pt2.position.set(-12, -5, 15); scene.add(pt2);

    const goldMat = new THREE.MeshStandardMaterial({ color:0xc9a84c, emissive:0x8B5E1A, emissiveIntensity:.3, roughness:.15, metalness:.95 });
    const purpleMat = new THREE.MeshStandardMaterial({ color:0x8060d0, emissive:0x3020a0, emissiveIntensity:.2, roughness:.2, metalness:.8, transparent:true, opacity:.5 });

    const makePiece = (type: string, mat: any, s: number) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(.4*s,.48*s,.1*s,16), mat));
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(.18*s,.36*s,.14*s,12), mat);
      neck.position.y = .17*s; g.add(neck);
      let bH=.5*s, tR=.24*s;
      if (type==='queen')  { bH=.85*s; tR=.26*s; }
      if (type==='king')   { bH=1.0*s; tR=.28*s; }
      if (type==='bishop') { bH=.75*s; tR=.14*s; }
      if (type==='rook')   { bH=.55*s; tR=.28*s; }
      const body = new THREE.Mesh(new THREE.CylinderGeometry(tR+.04*s,.32*s,bH,14), mat);
      body.position.y = .3*s+bH/2; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(tR,14,10), mat);
      head.position.y = .3*s+bH+tR*.7; g.add(head);
      if (type==='king') {
        [new THREE.BoxGeometry(.07*s,.22*s,.07*s), new THREE.BoxGeometry(.22*s,.07*s,.07*s)].forEach(geo => {
          const m = new THREE.Mesh(geo, mat); m.position.y = .3*s+bH+tR*1.5; g.add(m);
        });
      }
      if (type==='queen') {
        for (let i=0;i<5;i++) {
          const a=(i/5)*Math.PI*2;
          const b = new THREE.Mesh(new THREE.SphereGeometry(.07*s,8,6), mat);
          b.position.set(Math.cos(a)*.22*s,.3*s+bH+tR*1.3,Math.sin(a)*.22*s); g.add(b);
        }
      }
      return g;
    };

    const configs = [
      {type:'king',   mat:goldMat,   s:2.0, x:-13, y:4,  z:-5 },
      {type:'queen',  mat:goldMat,   s:1.8, x:12,  y:-3, z:-8 },
      {type:'bishop', mat:goldMat,   s:1.4, x:17,  y:5,  z:-10},
      {type:'rook',   mat:goldMat,   s:1.2, x:-7,  y:7,  z:-7 },
      {type:'queen',  mat:purpleMat, s:2.8, x:-20, y:7,  z:-18},
      {type:'king',   mat:purpleMat, s:2.6, x:21,  y:-7, z:-20},
      {type:'bishop', mat:purpleMat, s:1.8, x:-4,  y:8,  z:-16},
    ];

    interface FP { group:any; x:number; y:number; z:number; ry:number; fa:number; fs:number; fo:number; }
    const floaters: FP[] = [];
    configs.forEach((c, i) => {
      const group = makePiece(c.type, c.mat, c.s);
      group.position.set(c.x, c.y, c.z);
      group.rotation.y = Math.random() * Math.PI * 2;
      scene.add(group);
      floaters.push({ group, x:c.x, y:c.y, z:c.z, ry:.003+Math.random()*.004, fa:.12+Math.random()*.22, fs:.25+Math.random()*.45, fo:i*.8 });
    });

    const ringMat = new THREE.MeshStandardMaterial({ color:0xc9a84c, emissive:0xc9a84c, emissiveIntensity:.12, roughness:.2, metalness:.9, transparent:true, opacity:.15 });
    const rings: any[] = [];
    [{r:12,tube:.03,x:0,y:2,z:-10,rx:.6,ry:.2},{r:20,tube:.02,x:3,y:-1,z:-16,rx:1.3,ry:.9}].forEach(rc => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rc.r,rc.tube,8,80), ringMat);
      ring.position.set(rc.x,rc.y,rc.z); ring.rotation.x=rc.rx; ring.rotation.y=rc.ry;
      scene.add(ring); rings.push({ mesh:ring, speed:.0005+Math.random()*.0004 });
    });

    const t0 = Date.now();
    const loop = () => {
      this.animIds[0] = requestAnimationFrame(loop);
      const t = (Date.now()-t0)*.001;
      floaters.forEach(f => {
        f.group.rotation.y += f.ry;
        f.group.position.y  = f.y + Math.sin(t*f.fs+f.fo)*f.fa;
        f.group.position.x  = f.x + Math.cos(t*f.fs*.4+f.fo)*f.fa*.3 + this._mx*(f.z*-.04);
        f.group.position.y += -this._my*(f.z*-.03);
      });
      rings.forEach(r => { r.mesh.rotation.z+=r.speed; r.mesh.rotation.x+=r.speed*.4; });
      pt1.position.x = Math.sin(t*.4)*14; pt1.position.y = Math.cos(t*.3)*8;
      renderer.render(scene, cam);
    };
    loop();

    window.addEventListener('resize', () => {
      const W2=canvas.offsetWidth, H2=canvas.offsetHeight;
      cam.aspect=W2/H2; cam.updateProjectionMatrix(); renderer.setSize(W2,H2);
    });
  }

  /* ─── PARTICLE CANVAS ───────────────────────────────────────────── */
  private initParticles() {
    const canvas = this.particleCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight; };
    resize(); window.addEventListener('resize', resize);

    const pts = Array.from({length:60},()=>({
      x:Math.random()*canvas.width, y:Math.random()*canvas.height,
      vx:(Math.random()-.5)*.16, vy:(Math.random()-.5)*.16,
      r:Math.random()*1.3+.2, a:Math.random()*.14+.03,
    }));

    const draw = () => {
      this.animIds[2] = requestAnimationFrame(draw);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      pts.forEach(p => {
        p.x=(p.x+p.vx+canvas.width)%canvas.width;
        p.y=(p.y+p.vy+canvas.height)%canvas.height;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(201,168,76,${p.a})`; ctx.fill();
      });
      for (let i=0;i<pts.length;i++) for (let j=i+1;j<pts.length;j++) {
        const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y, d=Math.sqrt(dx*dx+dy*dy);
        if (d<100) {
          ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
          ctx.strokeStyle=`rgba(201,168,76,${.04*(1-d/100)})`; ctx.lineWidth=.4; ctx.stroke();
        }
      }
    };
    draw();
  }
}
