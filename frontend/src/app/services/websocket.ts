import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket: WebSocket | null = null;
  public messages$ = new Subject<any>();
  public connected$ = new Subject<boolean>();

  connect(roomCode: string) {
    const url = `ws://localhost:8000/ws/game/${roomCode}/`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.connected$.next(true);
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.messages$.next(data);
    };

    this.socket.onclose = () => {
      this.connected$.next(false);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.connected$.next(false);
    };
  }

  sendMove(move: string, fen: string, pgn: string) {
    this.send({ type: 'move', move, fen, pgn });
  }

  sendGameOver(result: string) {
    this.send({ type: 'game_over', result });
  }

  sendDrawOffer(from: string) {
    this.send({ type: 'draw_offer', from });
  }

  private send(data: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
  }
}
