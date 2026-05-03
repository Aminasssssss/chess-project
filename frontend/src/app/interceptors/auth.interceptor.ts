import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('access');
  const http = inject(HttpClient);

  const authReq = token ? req.clone({
    headers: req.headers.set('Authorization', `Bearer ${token}`)
  }) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        const refresh = localStorage.getItem('refresh');
        if (refresh) {
          return http.post('https://shess-project.onrender.com/api/auth/refresh/', { refresh }).pipe(
            switchMap((data: any) => {
              localStorage.setItem('access', data.access);
              const retryReq = req.clone({
                headers: req.headers.set('Authorization', `Bearer ${data.access}`)
              });
              return next(retryReq);
            }),
            catchError(() => {
              localStorage.clear();
              return throwError(() => error);
            })
          );
        }
        localStorage.clear();
      }
      return throwError(() => error);
    })
  );
};
