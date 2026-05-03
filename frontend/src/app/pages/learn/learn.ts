import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-learn',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './learn.html',
  styleUrl: './learn.scss'
})
export class Learn {
  streamers = [
    { name: 'GothamChess',     ch: 'Levy Rozman',       subs: '4.5M', desc: 'Разборы, юмор, обучение для всех уровней', url: 'https://youtube.com/@GothamChess',  live: true  },
    { name: 'Hikaru',          ch: 'Hikaru Nakamura',    subs: '2.1M', desc: 'Топ гроссмейстер. Speedrun и разборы',      url: 'https://youtube.com/@GMHikaru',      live: false },
    { name: 'BotezLive',       ch: 'Alexandra & Andrea', subs: '1.2M', desc: 'Весело, интерактивно, для начинающих',      url: 'https://youtube.com/@BotezLive',    live: true  },
    { name: 'Daniel Naroditsky',ch:'Danya',              subs: '800K', desc: 'Лучший для изучения стратегии и эндшпиля',  url: 'https://youtube.com/@DanielNaroditsky', live: false },
    { name: 'Anna Cramling',   ch: 'Anna Cramling',      subs: '650K', desc: 'Дочь гроссмейстера. Красиво и понятно',     url: 'https://youtube.com/@AnnaCramling', live: true  },
    { name: 'Eric Rosen',      ch: 'Eric Rosen',         subs: '500K', desc: 'Oh no my queen! Творческие дебюты',         url: 'https://youtube.com/@EricRosen',    live: false },
  ];

  openings = [
    { name: 'Итальянская партия',     moves: '1.e4 e5 2.Nf3 Nc6 3.Bc4', level: 'Начинающий', icon: '♗', route: '/play' },
    { name: 'Испанская партия',        moves: '1.e4 e5 2.Nf3 Nc6 3.Bb5', level: 'Любитель',   icon: '♘', route: '/play' },
    { name: 'Сицилианская защита',     moves: '1.e4 c5',                  level: 'Средний',     icon: '♜', route: '/play' },
    { name: 'Ферзевый гамбит',         moves: '1.d4 d5 2.c4',             level: 'Средний',     icon: '♛', route: '/play' },
    { name: 'Французская защита',      moves: '1.e4 e6',                  level: 'Средний',     icon: '♝', route: '/play' },
    { name: 'Королевский гамбит',      moves: '1.e4 e5 2.f4',             level: 'Продвинутый', icon: '♔', route: '/play' },
  ];

  tactics = [
    { name: 'Вилка',    desc: 'Одна фигура атакует две одновременно', icon: '♘', example: 'Конь на e5 атакует ферзя и ладью' },
    { name: 'Связка',   desc: 'Фигура не может двигаться — за ней ценность', icon: '♗', example: 'Слон связывает коня перед королём' },
    { name: 'Батарея',  desc: 'Ладья + ферзь на одной линии', icon: '♖', example: 'Ферзь и ладья на открытой вертикали' },
    { name: 'Двойной шах', desc: 'Шах двумя фигурами сразу', icon: '♕', example: 'Конь и слон атакуют короля вместе' },
    { name: 'Рентген',  desc: 'Атака через другую фигуру', icon: '♜', example: 'Ладья давит через чужую ладью' },
    { name: 'Цугцванг', desc: 'Любой ход ухудшает позицию', icon: '♚', example: 'Король вынужден отступить' },
  ];
}
