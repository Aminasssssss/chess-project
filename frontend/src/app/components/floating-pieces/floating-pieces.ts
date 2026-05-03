import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone } from '@angular/core';

@Component({
  selector: 'app-floating-pieces',
  standalone: true,
  imports: [],
  template: `<canvas #c style="width:100%;height:100%;display:block"></canvas>`,
  styles: [`:host{position:absolute;inset:0;pointer-events:none;z-index:3}`]
})
export class FloatingPieces implements AfterViewInit, OnDestroy {
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
    const W = canvas.offsetWidth || window.innerWidth;
    const H = canvas.offsetHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(60, W / H, 0.1, 200);
    cam.position.set(0, 0, 30);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    this.renderer = renderer;

    scene.add(new THREE.AmbientLight(0xfff8e8, 0.8));
    const pt1 = new THREE.PointLight(0xc9a84c, 3, 60);
    pt1.position.set(10, 10, 10);
    scene.add(pt1);
    const pt2 = new THREE.PointLight(0xffd080, 2, 50);
    pt2.position.set(-10, -5, 15);
    scene.add(pt2);

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xc9a84c,
      emissive: 0x8B5E1A,
      emissiveIntensity: 0.3,
      roughness: 0.15,
      metalness: 0.95,
    });

    const dimGoldMat = new THREE.MeshStandardMaterial({
      color: 0x8B5E1A,
      emissive: 0x4a3010,
      emissiveIntensity: 0.2,
      roughness: 0.3,
      metalness: 0.8,
      transparent: true,
      opacity: 0.6,
    });

    interface FloatPiece {
      group: any;
      rx: number; ry: number; rz: number;
      x: number; y: number; z: number;
      vx: number; vy: number;
      floatAmp: number; floatSpeed: number; floatOffset: number;
      scale: number;
    }

    const floaters: FloatPiece[] = [];

    const makePieceGroup = (type: string, mat: any, scale: number) => {
      const g = new THREE.Group();
      const s = scale;

      g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(.4*s,.48*s,.1*s,16), mat), {castShadow:true}));

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(.18*s,.36*s,.14*s,12), mat);
      neck.position.y = .17*s;
      g.add(neck);

      let bH = .5*s, tR = .24*s;
      switch(type) {
        case 'pawn':   bH=.42*s; tR=.2*s;  break;
        case 'rook':   bH=.55*s; tR=.28*s; break;
        case 'knight': bH=.65*s; tR=.18*s; break;
        case 'bishop': bH=.75*s; tR=.14*s; break;
        case 'queen':  bH=.85*s; tR=.26*s; break;
        case 'king':   bH=1.0*s; tR=.28*s; break;
      }

      const body = new THREE.Mesh(new THREE.CylinderGeometry(tR+.04*s, .32*s, bH, 14), mat);
      body.position.y = .3*s + bH/2;
      g.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(tR, 14, 10), mat);
      head.position.y = .3*s + bH + tR*.7;
      g.add(head);

      if (type === 'king') {
        [new THREE.BoxGeometry(.07*s,.22*s,.07*s), new THREE.BoxGeometry(.22*s,.07*s,.07*s)].forEach(geo => {
          const m = new THREE.Mesh(geo, mat);
          m.position.y = .3*s + bH + tR*1.5;
          g.add(m);
        });
      }

      if (type === 'queen') {
        for (let i = 0; i < 5; i++) {
          const a = (i/5)*Math.PI*2;
          const b = new THREE.Mesh(new THREE.SphereGeometry(.07*s,8,6), mat);
          b.position.set(Math.cos(a)*.22*s, .3*s+bH+tR*1.3, Math.sin(a)*.22*s);
          g.add(b);
        }
      }

      if (type === 'rook') {
        for (let i = 0; i < 4; i++) {
          const a = (i/4)*Math.PI*2;
          const b = new THREE.Mesh(new THREE.BoxGeometry(.12*s,.18*s,.12*s), mat);
          b.position.set(Math.cos(a)*.2*s, .3*s+bH+tR*.9, Math.sin(a)*.2*s);
          g.add(b);
        }
      }

      return g;
    };

    const pieceTypes = ['king','queen','rook','bishop','knight','pawn'];
    const configs = [
      { type:'king',   mat:goldMat,   s:2.2,  x:-14, y:5,   z:-5  },
      { type:'queen',  mat:goldMat,   s:2.0,  x:13,  y:-4,  z:-8  },
      { type:'knight', mat:goldMat,   s:1.8,  x:0,   y:-7,  z:-12 },
      { type:'rook',   mat:goldMat,   s:1.4,  x:-18, y:-3,  z:-10 },
      { type:'bishop', mat:goldMat,   s:1.5,  x:18,  y:6,   z:-10 },
      { type:'pawn',   mat:goldMat,   s:1.2,  x:-7,  y:8,   z:-8  },
      { type:'pawn',   mat:goldMat,   s:1.1,  x:8,   y:7,   z:-6  },
      { type:'queen',  mat:dimGoldMat,s:3.0,  x:-22, y:8,   z:-18 },
      { type:'king',   mat:dimGoldMat,s:2.8,  x:22,  y:-8,  z:-20 },
      { type:'rook',   mat:dimGoldMat,s:1.6,  x:5,   y:-9,  z:-15 },
      { type:'bishop', mat:dimGoldMat,s:2.0,  x:-5,  y:9,   z:-18 },
      { type:'pawn',   mat:dimGoldMat,s:1.3,  x:16,  y:2,   z:-14 },
      { type:'pawn',   mat:dimGoldMat,s:1.2,  x:-16, y:-6,  z:-16 },
      { type:'knight', mat:dimGoldMat,s:2.2,  x:0,   y:10,  z:-20 },
    ];

    configs.forEach((c, i) => {
      const group = makePieceGroup(c.type, c.mat, c.s);
      group.position.set(c.x, c.y, c.z);
      group.rotation.y = Math.random() * Math.PI * 2;
      group.rotation.x = (Math.random() - .5) * .3;
      scene.add(group);
      floaters.push({
        group,
        rx: (Math.random()-.5)*.003,
        ry: .004 + Math.random()*.004,
        rz: (Math.random()-.5)*.002,
        x: c.x, y: c.y, z: c.z,
        vx: 0, vy: 0,
        floatAmp: .15 + Math.random()*.25,
        floatSpeed: .3 + Math.random()*.5,
        floatOffset: i * .7,
        scale: c.s,
      });
    });

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xc9a84c, emissive: 0xc9a84c, emissiveIntensity: .15,
      roughness: .2, metalness: .9, transparent: true, opacity: .35,
    });

    const rings: any[] = [];
    [
      { r:8, tube:.04, x:0, y:0, z:-5, rx:.5, ry:.3 },
      { r:14, tube:.03, x:2, y:1, z:-10, rx:1.2, ry:.8 },
      { r:20, tube:.025, x:-2, y:-1, z:-15, rx:.7, ry:1.5 },
    ].forEach(rc => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rc.r, rc.tube, 8, 80), ringMat);
      ring.position.set(rc.x, rc.y, rc.z);
      ring.rotation.x = rc.rx;
      ring.rotation.y = rc.ry;
      scene.add(ring);
      rings.push({ mesh: ring, speed: .0008 + Math.random()*.0006 });
    });

    const hexMat = new THREE.MeshStandardMaterial({
      color: 0xc9a84c, emissive: 0xc9a84c, emissiveIntensity: .5,
      transparent: true, opacity: .08, side: THREE.DoubleSide,
    });
    const hexes: any[] = [];
    for (let i = 0; i < 8; i++) {
      const hex = new THREE.Mesh(new THREE.CircleGeometry(.8 + Math.random()*.4, 6), hexMat);
      hex.position.set((Math.random()-.5)*36, (Math.random()-.5)*18, -12 - Math.random()*10);
      hex.rotation.z = Math.random() * Math.PI;
      scene.add(hex);
      hexes.push({ mesh: hex, speed: .001 + Math.random()*.002, amp: .5+Math.random() });
    }

    let mx = 0, my = 0;
    window.addEventListener('mousemove', (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth - .5) * 2;
      my = (e.clientY / window.innerHeight - .5) * 2;
    });

    const t0 = Date.now();
    const loop = () => {
      this.animId = requestAnimationFrame(loop);
      const t = (Date.now() - t0) * .001;

      floaters.forEach((f, i) => {
        f.group.rotation.x += f.rx;
        f.group.rotation.y += f.ry;
        f.group.rotation.z += f.rz;
        f.group.position.y = f.y + Math.sin(t * f.floatSpeed + f.floatOffset) * f.floatAmp;
        f.group.position.x = f.x + Math.cos(t * f.floatSpeed * .4 + f.floatOffset) * f.floatAmp * .3;
        f.group.position.x += mx * (f.z * -.05);
        f.group.position.y += -my * (f.z * -.04);
      });

      rings.forEach(r => {
        r.mesh.rotation.z += r.speed;
        r.mesh.rotation.x += r.speed * .5;
      });

      hexes.forEach((h, i) => {
        h.mesh.position.y += Math.sin(t * h.speed * 100 + i) * .003;
        h.mesh.rotation.z += h.speed;
      });

      pt1.position.x = Math.sin(t*.5)*15;
      pt1.position.y = Math.cos(t*.4)*8;
      pt2.position.x = Math.cos(t*.6)*12;

      renderer.render(scene, cam);
    };
    loop();

    const onResize = () => {
      const W2 = canvas.offsetWidth, H2 = canvas.offsetHeight;
      cam.aspect = W2/H2; cam.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    };
    window.addEventListener('resize', onResize);
  }
}
