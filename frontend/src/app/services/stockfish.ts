import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Stockfish {
  private worker: Worker | null = null;
  private resolvers: Array<(move: string) => void> = [];

  init() {
    if (this.worker) return;
    this.worker = new Worker('/stockfish.js');
    this.worker.onmessage = (e: MessageEvent) => {
      const line: string = e.data;
      if (line.startsWith('bestmove')) {
        const move = line.split(' ')[1];
        const resolve = this.resolvers.shift();
        if (resolve && move && move !== '(none)') resolve(move);
      }
    };
    this.worker.postMessage('uci');
    this.worker.postMessage('isready');
  }

  getBestMove(fen: string, depth = 15): Promise<string> {
    return new Promise((resolve) => {
      this.resolvers.push(resolve);
      this.worker?.postMessage('ucinewgame');
      this.worker?.postMessage(`position fen ${fen}`);
      this.worker?.postMessage(`go depth ${depth}`);
    });
  }

  destroy() {
    this.worker?.terminate();
    this.worker = null;
  }
}
