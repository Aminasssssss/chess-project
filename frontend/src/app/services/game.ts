import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Auth } from './auth';

@Injectable({ providedIn: 'root' })
export class Game {
  private apiUrl = 'https://shess-project.onrender.com/api';

  constructor(private http: HttpClient, private auth: Auth) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.auth.getToken()}`
    });
  }

  getGames(): Observable<any> {
    return this.http.get(`${this.apiUrl}/games/`, { headers: this.getHeaders() });
  }

  saveGame(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/games/`, data, { headers: this.getHeaders() });
  }

  getLeaderboard(city?: string): Observable<any> {
    const url = city
      ? `${this.apiUrl}/leaderboard/?city=${city}`
      : `${this.apiUrl}/leaderboard/`;
    return this.http.get(url);
  }

  getProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/profile/`, { headers: this.getHeaders() });
  }

  updateProfile(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile/`, data, { headers: this.getHeaders() });
  }

  getAchievements(): Observable<any> {
    return this.http.get(`${this.apiUrl}/achievements/`, { headers: this.getHeaders() });
  }

  getPuzzle(difficulty: string = 'medium'): Observable<any> {
    return this.http.get(`${this.apiUrl}/puzzles/?difficulty=${difficulty}`);
  }

  getTournaments(): Observable<any> {
    return this.http.get(`${this.apiUrl}/tournaments/`, { headers: this.getHeaders() });
  }

  joinTournament(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/tournaments/`, { tournament_id: id }, { headers: this.getHeaders() });
  }

  upgradeToPro(): Observable<any> {
    return this.http.post(`${this.apiUrl}/upgrade/`, {}, { headers: this.getHeaders() });
  }

  savePuzzleResult(score: number, solved: number, failed: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/puzzle/save-result/`,
      { score, solved, failed },
      { headers: this.getHeaders() }
    );
  }
}
