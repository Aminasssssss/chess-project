import { Component, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {
  form = {
    username: '',
    email: '',
    password: '',
    city: ''
  };
  error = '';
  loading = false;

  cities = [
    'Алматы', 'Астана', 'Шымкент', 'Қарағанды',
    'Ақтобе', 'Тараз', 'Павлодар', 'Өскемен'
  ];

  constructor(
    private auth: Auth,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  onSubmit() {
    if (!this.form.username || !this.form.password) {
      this.error = 'Заполните обязательные поля';
      this.cdr.detectChanges();
      return;
    }
    this.loading = true;
    this.error = '';
    this.auth.register(this.form).subscribe({
      next: () => {
        this.router.navigate(['/']);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.username?.[0] || 'Ошибка регистрации';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
