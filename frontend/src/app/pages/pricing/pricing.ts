import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pricing.html',
  styleUrl: './pricing.scss'
})
export class Pricing {
  plans = [
    {
      name: 'Базовый',
      price: 'Бесплатно',
      desc: 'Для тех кто только начинает',
      features: [
        'Игра против AI (3 уровня)',
        'Puzzle Rush',
        'Лидерборд',
        '100 монет на старте',
        'История последних 10 партий',
      ],
      disabled: [
        'Кастомные скины доски',
        'AI Coach без лимитов',
        'Детальная аналитика',
        'Приоритет в турнирах',
      ],
      cta: 'Начать бесплатно',
      route: '/register',
      highlight: false,
    },
    {
      name: 'Pro',
      price: '500 монет',
      desc: 'Для серьёзных игроков',
      features: [
        'Всё из Базового',
        'Все 5 уровней сложности AI',
        'Кастомные скины доски',
        'AI Coach без лимитов',
        'Детальная аналитика партий',
        'Приоритет в турнирах',
        'Бонус +50 монет каждую неделю',
        'Полная история партий',
      ],
      disabled: [],
      cta: 'Получить Pro',
      route: '/profile',
      highlight: true,
    },
    {
      name: 'Клуб',
      price: 'Скоро',
      desc: 'Для команд и клубов',
      features: [
        'Всё из Pro',
        'Командный лидерборд',
        'Турниры внутри клуба',
        'Аналитика команды',
        'Приоритетная поддержка',
      ],
      disabled: [],
      cta: 'Оставить заявку',
      route: '/',
      highlight: false,
      soon: true,
    }
  ];
}
