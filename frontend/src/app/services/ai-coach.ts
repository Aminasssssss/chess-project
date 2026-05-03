import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Auth } from './auth';

@Injectable({ providedIn: 'root' })
export class AiCoach {
  private apiUrl = 'https://chess-project-5-anui.onrender.com/api';

  constructor(private http: HttpClient, private auth: Auth) {}

  analyzeGame(moves: string[], result: string, pgn: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.auth.getToken()}`
    });
    return this.http.post(`${this.apiUrl}/games/analyze/`, {
      moves, result, pgn
    }, { headers });
  }
}
