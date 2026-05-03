import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  form = { username: '', password: '' };
  error = '';
  loading = false;

  constructor(private auth: Auth, private router: Router) {}

  onSubmit() {
    if (!this.form.username || !this.form.password) {
      this.error = 'Заполните все поля';
      return;
    }
    this.loading = true;
    this.error = '';
    this.auth.login(this.form).subscribe({
      next: () => this.router.navigate(['/']),
      error: () => {
        this.error = 'Неверный логин или пароль';
        this.loading = false;
      }
    });
  }
}
