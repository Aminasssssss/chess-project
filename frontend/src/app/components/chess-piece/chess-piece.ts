import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone } from '@angular/core';

@Component({
  selector: 'app-chess-piece',
  standalone: true,
  template: `<canvas #c style="width:100%;height:100%;display:block"></canvas>`,
  styles: [`:host{display:block;width:100%;height:100%}`]
})
export class ChessPiece implements AfterViewInit, OnDestroy {
  @Input() type = 'knight';
  @Input() thinking = false;
  @ViewChild('c') canvasRef!: ElementRef<HTMLCanvasElement>;
  private animId: any;
  private renderer: any;
  constructor(private ngZone: NgZone) {}
  ngAfterViewInit() { this.ngZone.runOutsideAngular(() => this.init()); }
  ngOnDestroy() { cancelAnimationFrame(this.animId); this.renderer?.dispose(); }

  private async init() {
    const THREE = await import('three') as any;
    const canvas = this.canvasRef.nativeElement;
    const W = canvas.offsetWidth || 200, H = canvas.offsetHeight || 200;
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(45, W/H, 0.1, 100);
    cam.position.set(0, 3, 6);
    cam.lookAt(0, 1, 0);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    this.renderer = renderer;

    scene.add(new THREE.AmbientLight(0x2a1a0a, 1.5));
    const key = new THREE.DirectionalLight(0xfff8e8, 3);
    key.position.set(3, 8, 5); key.castShadow = true; scene.add(key);
    const gold = new THREE.PointLight(0xc9a84c, 4, 20);
    gold.position.set(0, 5, 0); scene.add(gold);

    const mat = new THREE.MeshStandardMaterial({ color: 0xc9a84c, emissive: 0x8B5E1A, emissiveIntensity: 0.4, roughness: 0.1, metalness: 0.95 });
    const group = new THREE.Group();

    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.18, 20), mat); disc.position.y = 0.09; disc.castShadow = true; group.add(disc);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.75, 0.28, 14), mat); neck.position.y = 0.35; group.add(neck);

    let bH = 1.2, tR = 0.38;
    switch(this.type) {
      case 'pawn':   bH=0.9;  tR=0.32; break;
      case 'rook':   bH=1.1;  tR=0.42; break;
      case 'bishop': bH=1.5;  tR=0.22; break;
      case 'queen':  bH=1.7;  tR=0.45; break;
      case 'king':   bH=2.0;  tR=0.48; break;
      case 'knight': bH=1.3;  tR=0.3;  break;
    }

    const body = new THREE.Mesh(new THREE.CylinderGeometry(tR, 0.55, bH, 16), mat);
    body.position.y = 0.55 + bH/2; body.castShadow = true; group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(tR*1.1, 16, 12), mat);
    head.position.y = 0.55 + bH + tR*0.8; head.castShadow = true; group.add(head);

    if (this.type === 'king') {
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), mat);
      c1.position.y = 0.55+bH+tR*1.8; group.add(c1);
      const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.12), mat);
      c2.position.y = 0.55+bH+tR*1.8+0.1; group.add(c2);
    }
    if (this.type === 'queen') {
      for (let i=0;i<7;i++) {
        const a=(i/7)*Math.PI*2;
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat);
        b.position.set(Math.cos(a)*0.38, 0.55+bH+tR*1.5, Math.sin(a)*0.38); group.add(b);
      }
    }

    const glowMat = new THREE.MeshStandardMaterial({ color: 0xc9a84c, emissive: 0xc9a84c, emissiveIntensity: 0.8, transparent: true, opacity: 0.15 });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 12), glowMat);
    glow.position.y = 1.5; group.add(glow);

    scene.add(group);

    const pMat = new THREE.PointsMaterial({ color: 0xc9a84c, size: 0.04, transparent: true, opacity: 0.7 });
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(50*3);
    for (let i=0;i<50;i++) { pPos[i*3]=(Math.random()-.5)*4; pPos[i*3+1]=Math.random()*5; pPos[i*3+2]=(Math.random()-.5)*4; }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    scene.add(new THREE.Points(pGeo, pMat));

    const t0 = Date.now();
    let mx=0, my=0;
    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mx = (e.clientX-r.left)/r.width*2-1;
      my = -(e.clientY-r.top)/r.height*2+1;
    });

    const loop = () => {
      this.animId = requestAnimationFrame(loop);
      const t = (Date.now()-t0)*0.001;
      group.rotation.y = this.thinking ? t*1.5 : t*0.4 + mx*0.3;
      group.position.y = Math.sin(t*0.8)*0.1;
      glow.material.opacity = 0.1 + Math.sin(t*2)*0.08;
      gold.intensity = 3 + Math.sin(t*1.5)*1.5;
      for (let i=0;i<50;i++) { pPos[i*3+1]-=0.01; if(pPos[i*3+1]<0) pPos[i*3+1]=5; }
      pGeo.getAttribute('position').needsUpdate = true;
      renderer.render(scene, cam);
    };
    loop();
    window.addEventListener('resize', () => { const W2=canvas.offsetWidth, H2=canvas.offsetHeight; cam.aspect=W2/H2; cam.updateProjectionMatrix(); renderer.setSize(W2,H2); });
  }
}
