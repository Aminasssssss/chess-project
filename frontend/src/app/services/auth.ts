import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface User {
  username: string;
  elo: number;
  is_pro: boolean;
  coins: number;
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private apiUrl = 'https://chess-project-5-anui.onrender.com/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    const user = localStorage.getItem('user');
    if (user) this.currentUserSubject.next(JSON.parse(user));
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register/`, data).pipe(
      tap((res: any) => this.handleAuth(res))
    );
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login/`, data).pipe(
      tap((res: any) => this.handleAuth(res))
    );
  }

  private handleAuth(res: any) {
    localStorage.setItem('access', res.access);
    localStorage.setItem('refresh', res.refresh);
    const user = { username: res.username, elo: res.elo, is_pro: res.is_pro, coins: res.coins };
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  logout() {
    localStorage.clear();
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('access');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
