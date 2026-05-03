import { Component, ElementRef, AfterViewInit, OnDestroy, ViewChild, NgZone } from '@angular/core';

@Component({
  selector: 'app-chess-three-d',
  standalone: true,
  imports: [],
  template: `<canvas #c style="width:100%;height:100%;display:block"></canvas>`,
  styles: [`:host{display:block;width:100%;height:100%}`]
})
export class ChessThreeD implements AfterViewInit, OnDestroy {
  @ViewChild('c') canvasRef!: ElementRef<HTMLCanvasElement>;
  private animId: any;
  private renderer: any;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => this.init());
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animId);
    this.renderer?.dispose();
  }

  private async init() {
    const THREE = await import('three') as any;
    const canvas = this.canvasRef.nativeElement;
    const W = canvas.offsetWidth || 480;
    const H = canvas.offsetHeight || 480;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060504, 0.03);

    const cam = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);
    cam.position.set(0, 15, 19);
    cam.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    this.renderer = renderer;

    scene.add(new THREE.AmbientLight(0x2a1a0a, 1.2));

    const key = new THREE.DirectionalLight(0xfff8e8, 3);
    key.position.set(6, 22, 12);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -14;
    key.shadow.camera.right = 14;
    key.shadow.camera.top = 14;
    key.shadow.camera.bottom = -14;
    key.shadow.camera.far = 60;
    scene.add(key);

    const goldPt = new THREE.PointLight(0xc9a84c, 4, 30);
    goldPt.position.set(0, 10, 2);
    scene.add(goldPt);

    const rim = new THREE.DirectionalLight(0xc9a84c, 0.8);
    rim.position.set(-10, 6, -12);
    scene.add(rim);

    const TILE = 1.6;
    const OFF = -TILE * 3.5;

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(TILE * 8 + 0.8, 0.35, TILE * 8 + 0.8),
      new THREE.MeshStandardMaterial({ color: 0x4a1f08, roughness: 0.5, metalness: 0.05 })
    );
    base.position.y = -0.28;
    base.receiveShadow = true;
    scene.add(base);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(TILE * 8 + 1.0, 0.06, TILE * 8 + 1.0),
      new THREE.MeshStandardMaterial({ color: 0xc9a84c, roughness: 0.15, metalness: 0.9 })
    );
    trim.position.y = -0.08;
    scene.add(trim);

    const tileGeo = new THREE.BoxGeometry(TILE - 0.05, 0.1, TILE - 0.05);
    const lMat = new THREE.MeshStandardMaterial({ color: 0xf0d9b5, roughness: 0.25, metalness: 0.04 });
    const dMat = new THREE.MeshStandardMaterial({ color: 0x7a4a28, roughness: 0.45, metalness: 0.06 });

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const t = new THREE.Mesh(tileGeo, (r + c) % 2 === 0 ? lMat : dMat);
        t.position.set(OFF + c * TILE, 0.02, OFF + r * TILE);
        t.receiveShadow = true;
        scene.add(t);
      }
    }

    const wMat = new THREE.MeshStandardMaterial({ color: 0xf8f4ee, roughness: 0.12, metalness: 0.08 });
    const bMat = new THREE.MeshStandardMaterial({ color: 0x18100a, roughness: 0.18, metalness: 0.12 });

    interface PieceTarget { mesh: any; ty: number; delay: number; tx: number; tz: number; }
    const targets: PieceTarget[] = [];

    const makePiece = (type: string, isW: boolean, col: number, row: number, delay: number) => {
      const mat = isW ? wMat : bMat;
      const group = new THREE.Group();

      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.46, 0.1, 16),
        mat
      );
      disc.position.y = 0.05;
      disc.castShadow = true;
      group.add(disc);

      const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.38, 0.15, 12),
        mat
      );
      neck.position.y = 0.17;
      group.add(neck);

      let bodyH = 0.5;
      let topR = 0.24;

      switch(type) {
        case 'pawn':   bodyH = 0.45; topR = 0.22; break;
        case 'rook':   bodyH = 0.55; topR = 0.28; break;
        case 'knight': bodyH = 0.65; topR = 0.20; break;
        case 'bishop': bodyH = 0.72; topR = 0.16; break;
        case 'queen':  bodyH = 0.82; topR = 0.26; break;
        case 'king':   bodyH = 0.95; topR = 0.28; break;
      }

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(topR + 0.04, 0.32, bodyH, 14),
        mat
      );
      body.position.y = 0.25 + bodyH / 2;
      body.castShadow = true;
      group.add(body);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(topR, 12, 10),
        mat
      );
      head.position.y = 0.25 + bodyH + topR * 0.7;
      head.castShadow = true;
      group.add(head);

      if (type === 'king') {
        const cross1 = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.22, 0.08),
          mat
        );
        cross1.position.y = 0.25 + bodyH + topR * 1.4 + 0.11;
        group.add(cross1);
        const cross2 = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.08, 0.08),
          mat
        );
        cross2.position.y = 0.25 + bodyH + topR * 1.4 + 0.11;
        group.add(cross2);
      }

      if (type === 'queen') {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const ball = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 8, 6),
            mat
          );
          ball.position.set(
            Math.cos(a) * 0.22,
            0.25 + bodyH + topR * 1.3,
            Math.sin(a) * 0.22
          );
          group.add(ball);
        }
      }

      if (type === 'rook') {
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          const b = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.18, 0.12),
            mat
          );
          b.position.set(
            Math.cos(a) * 0.2,
            0.25 + bodyH + topR,
            Math.sin(a) * 0.2
          );
          group.add(b);
        }
      }

      const tx = OFF + col * TILE;
      const tz = OFF + row * TILE;
      const ty = 0.06;

      group.position.set(tx, 30 + Math.random() * 20, tz);
      group.rotation.y = isW ? 0 : Math.PI;
      group.castShadow = true;
      scene.add(group);
      targets.push({ mesh: group, ty, delay, tx, tz });
    };

    const back  = ['rook','knight','bishop','queen','king','bishop','knight','rook'];
    const pawns = Array(8).fill('pawn');

    back.forEach((t,c)  => makePiece(t, false, c, 0, c * 70));
    pawns.forEach((t,c) => makePiece(t, false, c, 1, 600 + c * 70));
    pawns.forEach((t,c) => makePiece(t, true, c, 6, 1200 + c * 70));
    back.forEach((t,c)  => makePiece(t, true, c, 7, 1800 + c * 70));

    const pCount = 100;
    const pPos = new Float32Array(pCount * 3);
    const pVel = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i*3]   = (Math.random()-.5) * 36;
      pPos[i*3+1] = Math.random() * 28;
      pPos[i*3+2] = (Math.random()-.5) * 36;
      pVel[i*3]   = (Math.random()-.5) * .008;
      pVel[i*3+1] = -.012 - Math.random() * .008;
      pVel[i*3+2] = (Math.random()-.5) * .008;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMesh = new THREE.Points(pGeo,
      new THREE.PointsMaterial({ color: 0xc9a84c, size: 0.07, transparent: true, opacity: .55 }));
    scene.add(pMesh);

    interface State { vy: number; y: number; bounces: number; settled: boolean; }
    const states: State[] = targets.map(() => ({ vy: 0, y: 30 + Math.random() * 20, bounces: 0, settled: false }));

    const startTime = Date.now();
    let mx = 0, my = 0;
    const onMove = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth - .5) * 2;
      my = (e.clientY / window.innerHeight - .5) * 2;
    };
    window.addEventListener('mousemove', onMove);

    const G = 0.022;
    const t0 = Date.now();

    const loop = () => {
      this.animId = requestAnimationFrame(loop);
      const elapsed = Date.now() - startTime;
      const t = (Date.now() - t0) * .001;

      cam.position.x += (mx * 4 - cam.position.x) * .025;
      cam.position.y += (-my * 3 + 15 - cam.position.y) * .025;
      cam.lookAt(0, 0, 0);

      goldPt.intensity = 3.5 + Math.sin(t * 1.1) * 1.2;
      goldPt.position.x = Math.sin(t * .4) * 3;

      targets.forEach((pt, i) => {
        const s = states[i];
        if (elapsed < pt.delay) return;
        if (s.settled) {
          pt.mesh.position.y = pt.ty + Math.sin(t * .7 + i * .5) * .02;
          return;
        }
        s.vy -= G;
        s.y += s.vy;
        if (s.y <= pt.ty) {
          s.y = pt.ty;
          const bounce = s.bounces;
          if (bounce < 4) {
            s.vy = Math.abs(s.vy) * (.5 - bounce * .1);
            s.bounces++;
          } else {
            s.vy = 0;
            s.settled = true;
          }
        }
        pt.mesh.position.y = s.y;
        if (!s.settled) pt.mesh.rotation.x = Math.sin(s.y * .3) * .08;
      });

      for (let i = 0; i < pCount; i++) {
        pPos[i*3]   += pVel[i*3];
        pPos[i*3+1] += pVel[i*3+1];
        pPos[i*3+2] += pVel[i*3+2];
        if (pPos[i*3+1] < -1) {
          pPos[i*3]   = (Math.random()-.5)*36;
          pPos[i*3+1] = 28;
          pPos[i*3+2] = (Math.random()-.5)*36;
        }
      }
      pGeo.getAttribute('position').needsUpdate = true;

      renderer.render(scene, cam);
    };
    loop();

    window.addEventListener('resize', () => {
      const W2 = canvas.offsetWidth, H2 = canvas.offsetHeight;
      cam.aspect = W2/H2; cam.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    });
  }
}
