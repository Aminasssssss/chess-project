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
      name: 'Базовый', price: 'Бесплатно', desc: 'Для тех кто только начинает',
      features: ['Игра против AI (3 уровня)','Puzzle Rush','Лидерборд','100 монет на старте','История 10 партий'],
      disabled: ['Кастомные темы доски','AI Coach без лимитов','Детальная аналитика','Приоритет в турнирах'],
      cta: 'Начать бесплатно', route: '/register', highlight: false, soon: false,
    },
    {
      name: 'Pro', price: '500 монет', desc: 'Для серьёзных игроков',
      features: ['Всё из Базового','Все 5 уровней AI','Кастомные темы доски','AI Coach без лимитов',
        'Детальная аналитика','Приоритет в турнирах','Бонус +50 монет еженедельно','Полная история партий'],
      disabled: [],
      cta: 'Получить Pro', route: '/profile', highlight: true, soon: false,
    },
    {
      name: 'Клуб', price: 'Скоро', desc: 'Для команд и клубов',
      features: ['Всё из Pro','Командный лидерборд','Турниры внутри клуба','Аналитика команды','Приоритетная поддержка'],
      disabled: [],
      cta: 'Оставить заявку', route: '/', highlight: false, soon: true,
    }
  ];

  comparison = [
    { feat: 'Игра против AI',        base: '3 уровня', pro: '5 уровней', club: '5 уровней' },
    { feat: 'Puzzle Rush',            base: true,        pro: true,         club: true         },
    { feat: 'Мультиплеер',            base: true,        pro: true,         club: true         },
    { feat: 'Кастомные темы доски',   base: false,       pro: true,         club: true         },
    { feat: 'AI Coach',               base: '3 в день',  pro: 'Без лимита', club: 'Без лимита' },
    { feat: 'История партий',         base: '10 партий', pro: 'Всё',        club: 'Всё'        },
    { feat: 'Детальная аналитика',    base: false,       pro: true,         club: true         },
    { feat: 'Турниры',                base: false,       pro: true,         club: true         },
    { feat: 'Командный лидерборд',    base: false,       pro: false,        club: true         },
    { feat: 'Daily bonus монеты',     base: '25',        pro: '75',         club: '100'        },
  ];

  faqs = [
    { q: 'Как получить монеты?', a: 'Монеты начисляются за победы, решение пазлов, ежедневный вход и достижения. Никаких реальных денег.' },
    { q: 'Что если не хватает монет?', a: 'Играй больше — монеты копятся. Puzzle Rush приносит +2 монеты за каждую решённую задачу.' },
    { q: 'Можно ли вернуть монеты?', a: 'Pro статус приобретается за игровые монеты навсегда. Возврат не предусмотрен.' },
    { q: 'Когда будет Клуб тариф?', a: 'Клуб тариф находится в разработке. Оставь заявку — уведомим первым.' },
  ];
}
