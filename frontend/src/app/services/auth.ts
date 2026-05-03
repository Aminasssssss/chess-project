import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface User {
  id: number;
  username: string;
  elo: number;
  is_pro: boolean;
  coins: number;
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private apiUrl = 'https://shess-project.onrender.com/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const parsed = JSON.parse(user);
        this.currentUserSubject.next(parsed);
      } catch(e) {}
    }
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

    const user: User = {
      id: res.id || res.user_id || 1,
      username: res.username,
      elo: res.elo || 1200,
      is_pro: res.is_pro || false,
      coins: res.coins || 0
    };

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

  getUserId(): number {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.id) {
          return user.id;
        }
      } catch(e) {}
    }

    const token = this.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.user_id || 1;
      } catch(e) {}
    }

    return 1; // ДЕФОЛТНЫЙ ID
  }

  getUser(): User | null {
    return this.currentUserSubject.value;
  }
}
