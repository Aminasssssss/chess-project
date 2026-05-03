import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
  modes = [
    { title: 'Против AI', desc: 'Minimax алгоритм с 5 уровнями сложности', route: '/play/ai' },
    { title: 'Мультиплеер', desc: 'Играй с другом по ссылке', route: '/play/multiplayer' },
    { title: 'Puzzle Rush', desc: 'Реши задачи на скорость', route: '/puzzle' },
  ];

  features = [
    { label: 'AI COACH', title: 'Разбор как гроссмейстер', desc: 'После партии AI анализирует каждый ход и объясняет где ты ошибся' },
    { label: 'LIVE ML', title: 'Вероятность победы', desc: 'Модель считает шансы после каждого хода в реальном времени' },
    { label: 'СОЦИАЛЬНЫЙ', title: 'Kazakhstan League', desc: 'Алматы против Астаны. Соревнуйся за честь своего города' },
    { label: 'ГЕЙМИФИКАЦИЯ', title: 'Chess Streak', desc: 'Серия побед открывает достижения и внутреннюю валюту' },
  ];

  constructor(public auth: Auth) {}
}
