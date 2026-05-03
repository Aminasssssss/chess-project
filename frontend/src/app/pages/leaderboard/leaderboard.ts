import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Game } from '../../services/game';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.scss'
})
export class Leaderboard implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('bgCanvas')       bgCanvasRef!:      ElementRef<HTMLCanvasElement>;
  @ViewChild('podiumCanvas')   podiumCanvasRef!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('particleCanvas') particleCanvasRef!: ElementRef<HTMLCanvasElement>;

  players:      any[] = [];
  allPlayers:   any[] = [];
  loading       = true;
  selectedCity  = '';
  selectedPeriod = 'all';
  searchQuery   = '';
  searchExpanded = false;
  cities = ['Алматы', 'Астана', 'Шымкент', 'Қарағанды', 'Ақтобе', 'Тараз', 'Павлодар', 'Өскемен'];
  cityStats: any[] = [];

  toast: { msg: string; type: 'success' | 'error' | 'info' } | null = null;
  private toastTimer: any;

  activeTournamentId: number | null = null;
  registerLoading = false;
  registered = false;

  animLiveOnline   = 0;
  animLiveGames    = 0;
  animGamesToday   = 0;
  animTotalPlayers = 0;
  liveOnline   = 247;
  liveGames    = 43;
  gamesToday   = 1847;
  totalPlayers = 3241;

  cdDays = 2; cdHours = 5; cdMinutes = 29; cdSeconds = 0;

  tickerItems = [
    'AlmatyStar vs AstanaKing — ход 24 · e4–e5',
    'KZChampion — серия 12 побед подряд',
    'Новый рекорд ELO: 2104 — GrandMaster_KZ',
    'Шымкент лидирует в командном зачёте',
    'Kazakhstan Open Championship — регистрация открыта',
    'Топ-10 KZ провели симул против Hikaru',
  ];

  risingStars = [
    { name: 'AstanaKing',   change: +142, elo: 1847, city: 'Астана',  streak: 8 },
    { name: 'ShymkentFire', change: +98,  elo: 1634, city: 'Шымкент', streak: 5 },
    { name: 'AlmatyPro',    change: +76,  elo: 1521, city: 'Алматы',  streak: 3 },
  ];

  liveMatches = [
    { w: 'KZMaster',   b: 'AstanaKing',  move: 24, time: '5:42',  isLive: true  },
    { w: 'AlmatyFire', b: 'Shymkent1',   move: 18, time: '8:11',  isLive: true  },
    { w: 'GrandKZ',    b: 'PavlodarAce', move: 7,  time: '12:33', isLive: false },
  ];

  hofRecords = [
    { title: 'РЕКОРД ELO',         val: '2104', who: 'GrandMaster_KZ · 2024', piece: '♛' },
    { title: 'МАКС. СЕРИЯ',        val: '28',   who: 'AstanaKing · Ноябрь',   piece: '♞' },
    { title: 'ПАРТИЙ ЗА ДЕНЬ',     val: '47',   who: 'ChessManiac · Октябрь', piece: '♔' },
    { title: 'ПРИРОСТ ELO / МЕС.', val: '+312', who: 'ShymkentFire · Сент.',  piece: '♗' },
  ];

  private intervals: any[] = [];
  private animIds: any[] = [];
  private bgRenderer: any;
  private podiumRenderer: any;

  constructor(
    private gameService: Game,
    private auth: Auth,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadLeaderboard();
    this.loadTournaments();
    this.startLiveUpdates();
    this.startCountdown();
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      this.initBg3D();
      this.initParticles();
    });
    this.animateCounters();
    this.setupReveal();
  }

  ngOnDestroy() {
    this.intervals.forEach(i => clearInterval(i));
    this.animIds.forEach(id => cancelAnimationFrame(id));
    this.bgRenderer?.dispose();
    this.podiumRenderer?.dispose();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  showToast(msg: string, type: 'success' | 'error' | 'info' = 'info') {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { msg, type };
    this.cdr.detectChanges();
    this.toastTimer = setTimeout(() => {
      this.toast = null;
      this.cdr.detectChanges();
    }, 3000);
  }

  loadLeaderboard() {
    this.loading = true;
    this.gameService.getLeaderboard(this.selectedCity).subscribe({
      next: data => {
        this.allPlayers = data;
        this.applyPeriodFilter();
        this.calculateCityStats();
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.setupReveal();
          this.initPodium3D();
        }, 150);
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyPeriodFilter() {
    if (this.selectedPeriod === 'all') {
      this.players = [...this.allPlayers];
    } else if (this.selectedPeriod === 'month') {
      this.players = [...this.allPlayers].sort((a, b) => b.wins - a.wins);
    } else if (this.selectedPeriod === 'week') {
      this.players = [...this.allPlayers].sort((a, b) => (b.streak || 0) - (a.streak || 0));
    }
  }

  selectPeriod(period: string) {
    this.selectedPeriod = period;
    this.applyPeriodFilter();
    this.cdr.detectChanges();
    setTimeout(() => this.setupReveal(), 100);
  }

  filterByCity(city: string) {
    this.selectedCity = city === this.selectedCity ? '' : city;
    this.loadLeaderboard();
  }

  calculateCityStats() {
    const map: any = {};
    this.allPlayers.forEach(p => {
      if (!p.city) return;
      if (!map[p.city]) map[p.city] = { city: p.city, total_elo: 0, count: 0 };
      map[p.city].total_elo += p.elo;
      map[p.city].count++;
    });
    this.cityStats = Object.values(map)
      .map((c: any) => ({ ...c, avg_elo: Math.round(c.total_elo / c.count) }))
      .sort((a: any, b: any) => b.avg_elo - a.avg_elo)
      .slice(0, 5);
  }

  loadTournaments() {
    if (!this.auth.isLoggedIn()) {
      return;
    }
    this.gameService.getTournaments().subscribe({
      next: (data: any[]) => {
        if (data && data.length > 0) {
          this.activeTournamentId = data[0].id;
        }
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  registerTournament() {
    if (!this.auth.isLoggedIn()) {
      this.showToast('Войдите в аккаунт для регистрации на турнир', 'error');
      return;
    }
    if (this.registered || this.registerLoading) return;
    if (!this.activeTournamentId) {
      this.showToast('Турнир не найден', 'error');
      return;
    }
    this.registerLoading = true;
    this.gameService.joinTournament(this.activeTournamentId).subscribe({
      next: () => {
        this.registered = true;
        this.registerLoading = false;
        this.showToast('Вы зарегистрированы на турнир!', 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.registerLoading = false;
        const msg = err?.error?.detail || err?.error?.message || 'Ошибка регистрации';
        this.showToast(msg, 'error');
        this.cdr.detectChanges();
      }
    });
  }

  watchPlayer(username: string) {
    if (!this.auth.isLoggedIn()) {
      this.showToast('Войдите в аккаунт для наблюдения за игрой', 'error');
      return;
    }
    this.showToast(`Наблюдение за ${username}...`, 'info');
  }

  challengePlayer(username: string) {
    if (!this.auth.isLoggedIn()) {
      this.showToast('Войдите в аккаунт для вызова', 'error');
      return;
    }
    this.showToast(`Вызов отправлен игроку ${username}`, 'success');
  }

  getCityBarWidth(city: any, all: any[]): number {
    const max = Math.max(...all.map(c => c.avg_elo));
    return Math.round((city.avg_elo / max) * 100);
  }

  getMedal(i: number): string {
    return ['I', 'II', 'III'][i] ?? String(i + 1);
  }

  getRankLabel(i: number): string {
    return ['I', 'II', 'III', 'IV', 'V'][i] ?? String(i + 1);
  }

  pad(n: number): string {
    return n < 10 ? '0' + n : String(n);
  }

  isPlayerOnline(i: number): boolean {
    return i < 6 && i % 2 === 0;
  }

  isPlayerHot(i: number): boolean {
    return i > 0 && i < 4;
  }

  isPlayerRising(i: number): boolean {
    return i >= 5 && i < 9;
  }

  getEloChange(i: number): { val: number; cls: string } {
    const arr = [+24, -5, +12, 0, +8, -15, +3, +31, -2, +19, +7, -4, +11, +5, -8];
    const v = arr[i % arr.length];
    return { val: v, cls: v > 0 ? 'pos' : v < 0 ? 'neg' : 'neu' };
  }

  toggleSearch() {
    this.searchExpanded = !this.searchExpanded;
  }

  get filteredPlayers() {
    if (!this.searchQuery) return this.players;
    const q = this.searchQuery.toLowerCase();
    return this.players.filter(p => p.username.toLowerCase().includes(q));
  }

  startLiveUpdates() {
    this.ngZone.runOutsideAngular(() => {
      this.intervals.push(setInterval(() => {
        this.liveOnline += Math.floor((Math.random() - 0.4) * 3);
        this.liveGames += Math.floor((Math.random() - 0.5) * 2);
        this.gamesToday += Math.floor(Math.random() * 2);
        this.cdr.detectChanges();
      }, 3500));
    });
  }

  startCountdown() {
    this.ngZone.runOutsideAngular(() => {
      this.intervals.push(setInterval(() => {
        this.cdSeconds--;
        if (this.cdSeconds < 0) {
          this.cdSeconds = 59;
          this.cdMinutes--;
        }
        if (this.cdMinutes < 0) {
          this.cdMinutes = 59;
          this.cdHours--;
        }
        if (this.cdHours < 0) {
          this.cdHours = 23;
          this.cdDays--;
        }
        this.cdr.detectChanges();
      }, 1000));
    });
  }

  animateCounters() {
    this.ngZone.runOutsideAngular(() => {
      const targets = [
        { key: 'animLiveOnline', t: this.liveOnline },
        { key: 'animLiveGames', t: this.liveGames },
        { key: 'animGamesToday', t: this.gamesToday },
        { key: 'animTotalPlayers', t: this.totalPlayers },
      ];
      targets.forEach((item, i) => {
        setTimeout(() => {
          const dur = 1800, start = Date.now();
          const tick = () => {
            const p = Math.min((Date.now() - start) / dur, 1);
            const e = 1 - Math.pow(1 - p, 4);
            (this as any)[item.key] = Math.floor(e * item.t);
            this.cdr.detectChanges();
            if (p < 1) requestAnimationFrame(tick);
            else {
              (this as any)[item.key] = item.t;
              this.cdr.detectChanges();
            }
          };
          requestAnimationFrame(tick);
        }, i * 220 + 600);
      });
    });
  }

  setupReveal() {
    setTimeout(() => {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            obs.unobserve(e.target);
          }
        });
      }, { threshold: 0.04 });
      document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    }, 120);
  }

  private async initBg3D() {
    const THREE = await import('three') as any;
    const canvas = this.bgCanvasRef?.nativeElement;
    if (!canvas) return;
    const W = canvas.offsetWidth || window.innerWidth;
    const H = canvas.offsetHeight || window.innerHeight;
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(60, W / H, 0.1, 200);
    cam.position.set(0, 0, 30);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    this.bgRenderer = renderer;
    scene.add(new THREE.AmbientLight(0xfff8e8, 0.6));
    const pt1 = new THREE.PointLight(0xc9a84c, 2.5, 60);
    pt1.position.set(10, 10, 10);
    scene.add(pt1);
    const pt2 = new THREE.PointLight(0xffd080, 1.5, 50);
    pt2.position.set(-10, -5, 15);
    scene.add(pt2);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a84c, emissive: 0x8B5E1A, emissiveIntensity: 0.25, roughness: 0.18, metalness: 0.95 });
    const dimMat = new THREE.MeshStandardMaterial({ color: 0x8B5E1A, emissive: 0x4a3010, emissiveIntensity: 0.15, roughness: 0.3, metalness: 0.8, transparent: true, opacity: 0.4 });
    const makePiece = (type: string, mat: any, s: number) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4 * s, 0.48 * s, 0.1 * s, 16), mat));
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.36 * s, 0.14 * s, 12), mat);
      neck.position.y = 0.17 * s;
      g.add(neck);
      let bH = 0.5 * s, tR = 0.24 * s;
      if (type === 'pawn') { bH = 0.42 * s; tR = 0.2 * s; }
      if (type === 'rook') { bH = 0.55 * s; tR = 0.28 * s; }
      if (type === 'queen') { bH = 0.85 * s; tR = 0.26 * s; }
      if (type === 'king') { bH = 1.0 * s; tR = 0.28 * s; }
      if (type === 'bishop') { bH = 0.75 * s; tR = 0.14 * s; }
      const body = new THREE.Mesh(new THREE.CylinderGeometry(tR + 0.04 * s, 0.32 * s, bH, 14), mat);
      body.position.y = 0.3 * s + bH / 2;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(tR, 14, 10), mat);
      head.position.y = 0.3 * s + bH + tR * 0.7;
      g.add(head);
      if (type === 'king') {
        [new THREE.BoxGeometry(0.07 * s, 0.22 * s, 0.07 * s), new THREE.BoxGeometry(0.22 * s, 0.07 * s, 0.07 * s)].forEach(geo => {
          const m = new THREE.Mesh(geo, mat);
          m.position.y = 0.3 * s + bH + tR * 1.5;
          g.add(m);
        });
      }
      if (type === 'queen') {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.07 * s, 8, 6), mat);
          b.position.set(Math.cos(a) * 0.22 * s, 0.3 * s + bH + tR * 1.3, Math.sin(a) * 0.22 * s);
          g.add(b);
        }
      }
      return g;
    };
    const configs = [
      { type: 'king', mat: goldMat, s: 2.2, x: -14, y: 5, z: -5 },
      { type: 'queen', mat: goldMat, s: 2.0, x: 13, y: -4, z: -8 },
      { type: 'bishop', mat: goldMat, s: 1.5, x: 18, y: 6, z: -10 },
      { type: 'pawn', mat: goldMat, s: 1.2, x: -7, y: 8, z: -8 },
      { type: 'pawn', mat: goldMat, s: 1.1, x: 8, y: 7, z: -6 },
      { type: 'queen', mat: dimMat, s: 3.0, x: -22, y: 8, z: -18 },
      { type: 'king', mat: dimMat, s: 2.8, x: 22, y: -8, z: -20 },
      { type: 'rook', mat: dimMat, s: 1.6, x: 5, y: -9, z: -15 },
      { type: 'bishop', mat: dimMat, s: 2.0, x: -5, y: 9, z: -18 },
      { type: 'pawn', mat: dimMat, s: 1.3, x: 16, y: 2, z: -14 },
    ];
    interface FP { group: any; x: number; y: number; z: number; ry: number; fa: number; fs: number; fo: number; }
    const floaters: FP[] = [];
    configs.forEach((c, i) => {
      const group = makePiece(c.type, c.mat, c.s);
      group.position.set(c.x, c.y, c.z);
      group.rotation.y = Math.random() * Math.PI * 2;
      scene.add(group);
      floaters.push({ group, x: c.x, y: c.y, z: c.z, ry: 0.004 + Math.random() * 0.004, fa: 0.15 + Math.random() * 0.25, fs: 0.3 + Math.random() * 0.5, fo: i * 0.7 });
    });
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xc9a84c, emissive: 0xc9a84c, emissiveIntensity: 0.1, roughness: 0.2, metalness: 0.9, transparent: true, opacity: 0.18 });
    const rings: any[] = [];
    [{ r: 10, tube: 0.03, x: 0, y: 0, z: -8, rx: 0.5, ry: 0.3 }, { r: 18, tube: 0.025, x: 2, y: 1, z: -14, rx: 1.2, ry: 0.8 }].forEach(rc => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rc.r, rc.tube, 8, 80), ringMat);
      ring.position.set(rc.x, rc.y, rc.z);
      ring.rotation.x = rc.rx;
      ring.rotation.y = rc.ry;
      scene.add(ring);
      rings.push({ mesh: ring, speed: 0.0006 + Math.random() * 0.0005 });
    });
    let mx = 0, my = 0;
    window.addEventListener('mousemove', (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    const t0 = Date.now();
    const loop = () => {
      this.animIds[0] = requestAnimationFrame(loop);
      const t = (Date.now() - t0) * 0.001;
      floaters.forEach(f => {
        f.group.rotation.y += f.ry;
        f.group.position.y = f.y + Math.sin(t * f.fs + f.fo) * f.fa;
        f.group.position.x = f.x + Math.cos(t * f.fs * 0.4 + f.fo) * f.fa * 0.3 + mx * (f.z * -0.04);
        f.group.position.y += -my * (f.z * -0.03);
      });
      rings.forEach(r => { r.mesh.rotation.z += r.speed; r.mesh.rotation.x += r.speed * 0.4; });
      pt1.position.x = Math.sin(t * 0.5) * 15;
      pt1.position.y = Math.cos(t * 0.4) * 8;
      renderer.render(scene, cam);
    };
    loop();
    window.addEventListener('resize', () => {
      const W2 = canvas.offsetWidth, H2 = canvas.offsetHeight;
      cam.aspect = W2 / H2;
      cam.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    });
  }

  initPodium3D() {
    this.ngZone.runOutsideAngular(() => this._doPodium());
  }

  private async _doPodium() {
    const THREE = await import('three') as any;
    const canvas = this.podiumCanvasRef?.nativeElement;
    if (!canvas) return;
    const W = canvas.offsetWidth || 900, H = canvas.offsetHeight || 380;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07050f, 0.025);
    const cam = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    cam.position.set(0, 8, 18);
    cam.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setClearColor(0x000000, 0);
    this.podiumRenderer = renderer;
    scene.add(new THREE.AmbientLight(0x1a0f05, 1.2));
    const key = new THREE.DirectionalLight(0xfff8e8, 3);
    key.position.set(5, 15, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);
    const goldPt = new THREE.PointLight(0xc9a84c, 4, 40);
    goldPt.position.set(0, 8, 3);
    scene.add(goldPt);
    const rim = new THREE.DirectionalLight(0xc9a84c, 0.6);
    rim.position.set(-8, 3, -8);
    scene.add(rim);
    const pMats = [
      new THREE.MeshStandardMaterial({ color: 0xc9a84c, emissive: 0x8B5E1A, emissiveIntensity: 0.35, roughness: 0.12, metalness: 0.96 }),
      new THREE.MeshStandardMaterial({ color: 0xb8b8c0, emissive: 0x3a3a40, emissiveIntensity: 0.2, roughness: 0.2, metalness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0xc07845, emissive: 0x5a2a0f, emissiveIntensity: 0.22, roughness: 0.25, metalness: 0.85 }),
    ];
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xc9a84c, roughness: 0.15, metalness: 0.9, emissive: 0xc9a84c, emissiveIntensity: 0.12 });
    const wMat = new THREE.MeshStandardMaterial({ color: 0xf8f4ee, roughness: 0.12, metalness: 0.08 });
    const bMat = new THREE.MeshStandardMaterial({ color: 0x18100a, roughness: 0.18, metalness: 0.12 });
    const makePodiumPiece = (type: string, mat: any, s: number) => {
      const g = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.9 * s, 1.0 * s, 0.18 * s, 20), mat);
      disc.position.y = 0.09 * s;
      disc.castShadow = true;
      g.add(disc);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * s, 0.75 * s, 0.28 * s, 14), mat);
      neck.position.y = 0.35 * s;
      g.add(neck);
      let bH = 1.2 * s, tR = 0.38 * s;
      if (type === 'queen') { bH = 1.7 * s; tR = 0.45 * s; }
      if (type === 'king') { bH = 2.0 * s; tR = 0.48 * s; }
      if (type === 'rook') { bH = 1.1 * s; tR = 0.42 * s; }
      const body = new THREE.Mesh(new THREE.CylinderGeometry(tR, 0.55 * s, bH, 16), mat);
      body.position.y = 0.55 * s + bH / 2;
      body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(tR * 1.1, 16, 12), mat);
      head.position.y = 0.55 * s + bH + tR * 0.8;
      head.castShadow = true;
      g.add(head);
      if (type === 'king') {
        const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.45 * s, 0.12 * s), mat);
        c1.position.y = 0.55 * s + bH + tR * 1.8;
        g.add(c1);
        const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.38 * s, 0.12 * s, 0.12 * s), mat);
        c2.position.y = 0.55 * s + bH + tR * 1.8 + 0.1 * s;
        g.add(c2);
      }
      if (type === 'queen') {
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.1 * s, 8, 6), mat);
          b.position.set(Math.cos(a) * 0.38 * s, 0.55 * s + bH + tR * 1.5, Math.sin(a) * 0.38 * s);
          g.add(b);
        }
      }
      if (type === 'rook') {
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          const b = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.18 * s, 0.12 * s), mat);
          b.position.set(Math.cos(a) * 0.2 * s, 0.55 * s + bH + tR * 0.9, Math.sin(a) * 0.2 * s);
          g.add(b);
        }
      }
      return g;
    };
    const podiumData = [
      { h: 2.5, mat: pMats[0], pieceType: 'queen', pieceMat: wMat, x: 0, s: 0.58 },
      { h: 1.8, mat: pMats[1], pieceType: 'king', pieceMat: wMat, x: -4, s: 0.54 },
      { h: 1.2, mat: pMats[2], pieceType: 'rook', pieceMat: bMat, x: 4, s: 0.50 },
    ];
    const pieceMeshes: any[] = [];
    podiumData.forEach(pd => {
      const plat = new THREE.Mesh(new THREE.BoxGeometry(3, pd.h, 3), pd.mat);
      plat.position.set(pd.x, pd.h / 2 - 1, 0);
      plat.castShadow = true;
      plat.receiveShadow = true;
      scene.add(plat);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(3.06, 0.06, 3.06), trimMat);
      trim.position.set(pd.x, pd.h - 1 + 0.03, 0);
      scene.add(trim);
      if (pd.x === 0) {
        const gRingMat = new THREE.MeshStandardMaterial({ color: 0xc9a84c, emissive: 0xc9a84c, emissiveIntensity: 0.5, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
        const gRing = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.04, 8, 60), gRingMat);
        gRing.position.set(0, pd.h - 1 + 0.1, 0);
        gRing.rotation.x = Math.PI / 2;
        scene.add(gRing);
      }
      const piece = makePodiumPiece(pd.pieceType, pd.pieceMat, pd.s);
      piece.position.set(pd.x, pd.h - 1, 0);
      piece.castShadow = true;
      scene.add(piece);
      pieceMeshes.push({ mesh: piece, baseY: pd.h - 1 });
    });
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 20),
      new THREE.MeshStandardMaterial({ color: 0x07050f, roughness: 0.7, metalness: 0.1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.receiveShadow = true;
    scene.add(ground);
    const pC = 80, pPos = new Float32Array(pC * 3);
    for (let i = 0; i < pC; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 22;
      pPos[i * 3 + 1] = Math.random() * 10;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xc9a84c, size: 0.07, transparent: true, opacity: 0.45 })));
    let mx = 0;
    window.addEventListener('mousemove', (e: MouseEvent) => { mx = (e.clientX / window.innerWidth - 0.5) * 2; });
    const t0 = Date.now();
    const loop = () => {
      this.animIds[1] = requestAnimationFrame(loop);
      const t = (Date.now() - t0) * 0.001;
      cam.position.x += (mx * 3.5 - cam.position.x) * 0.022;
      cam.lookAt(0, 0, 0);
      pieceMeshes.forEach((pm, i) => {
        pm.mesh.rotation.y = t * 0.45 + i * Math.PI * 0.66;
        pm.mesh.position.y = pm.baseY + Math.sin(t * 0.8 + i * 0.5) * 0.09;
      });
      goldPt.intensity = 3.5 + Math.sin(t * 1.2) * 1.2;
      goldPt.position.x = Math.sin(t * 0.5) * 3;
      for (let i = 0; i < pC; i++) {
        pPos[i * 3 + 1] -= 0.008;
        if (pPos[i * 3 + 1] < -1) pPos[i * 3 + 1] = 10;
      }
      pGeo.getAttribute('position').needsUpdate = true;
      renderer.render(scene, cam);
    };
    loop();
    window.addEventListener('resize', () => {
      const W2 = canvas.offsetWidth, H2 = canvas.offsetHeight;
      cam.aspect = W2 / H2;
      cam.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    });
  }

  private initParticles() {
    const canvas = this.particleCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.2 + 0.2,
      a: Math.random() * 0.15 + 0.04,
    }));
    const draw = () => {
      this.animIds[2] = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x = (p.x + p.vx + canvas.width) % canvas.width;
        p.y = (p.y + p.vy + canvas.height) % canvas.height;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201,168,76,${p.a})`;
        ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 110) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(201,168,76,${0.04 * (1 - d / 110)})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }
    };
    draw();
  }
}
