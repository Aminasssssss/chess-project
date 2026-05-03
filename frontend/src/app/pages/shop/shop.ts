import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './shop.html',
  styleUrl: './shop.scss'
})
export class Shop {
  activeTab = 'themes';
  buyMsg = '';
  coins = 0;

  themes = [
    { id:1,  name:'Классика',  l:'#f0d9b5', d:'#b58863', price:0,   owned:true,  active:true,  desc:'Классическая деревянная доска' },
    { id:2,  name:'Изумруд',   l:'#ffffdd', d:'#86a666', price:200,  owned:false, active:false, desc:'Свежий зелёный стиль' },
    { id:3,  name:'Ночь',      l:'#e8e9b7', d:'#4a4a6a', price:300,  owned:false, active:false, desc:'Тёмная ночная тема' },
    { id:4,  name:'Розовый',   l:'#f0d9e8', d:'#c07898', price:350,  owned:false, active:false, desc:'Нежный розовый стиль' },
    { id:5,  name:'Океан',     l:'#dee3e6', d:'#8ca2ad', price:400,  owned:false, active:false, desc:'Морская глубина' },
    { id:6,  name:'Рубин',     l:'#ffe0e0', d:'#a03030', price:450,  owned:false, active:false, desc:'Огненно-красный стиль' },
  ];

  titles = [
    { id:10, name:'♟ Тактик',     price:100,  owned:false, desc:'Для тех кто любит комбинации' },
    { id:11, name:'⚔ Атакер',     price:150,  owned:false, desc:'Агрессивный стиль игры' },
    { id:12, name:'♔ Стратег',    price:200,  owned:false, desc:'Позиционная игра' },
    { id:13, name:'♛ Чемпион',    price:400,  owned:false, desc:'Для победителей турниров' },
    { id:14, name:'◈ Коллектор',  price:300,  owned:false, desc:'Для тех кто копит монеты' },
    { id:15, name:'★ Легенда',    price:500,  owned:false, desc:'Самый редкий тайтл' },
  ];

  tabs = [
    { id:'themes', label:'Темы доски' },
    { id:'titles', label:'Тайтлы' },
  ];

  constructor(private auth: Auth, private http: HttpClient, private cdr: ChangeDetectorRef) {
    const user = auth.getUser();
    this.coins = user?.coins ?? 0;
    const owned = JSON.parse(localStorage.getItem('owned_items') || '[]');
    this.themes.forEach(t => { if (owned.includes('theme_'+t.id)) t.owned = true; });
    this.titles.forEach(t => { if (owned.includes('title_'+t.id)) t.owned = true; });
    const activeTheme = localStorage.getItem('active_theme');
    if (activeTheme) {
      this.themes.forEach(t => t.active = String(t.id) === activeTheme);
    }
  }

  buy(item: any, category: string) {
    if (item.owned) {
      this.applyItem(item, category);
      return;
    }
    if (this.coins < item.price) {
      this.buyMsg = 'Недостаточно монет';
      setTimeout(() => { this.buyMsg = ''; this.cdr.detectChanges(); }, 2500);
      return;
    }
    this.coins -= item.price;
    item.owned = true;
    const owned = JSON.parse(localStorage.getItem('owned_items') || '[]');
    owned.push(category + '_' + item.id);
    localStorage.setItem('owned_items', JSON.stringify(owned));
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const u = JSON.parse(userStr); u.coins = this.coins;
      localStorage.setItem('user', JSON.stringify(u));
    }
    this.applyItem(item, category);
    this.buyMsg = `${item.name} куплено!`;
    setTimeout(() => { this.buyMsg = ''; this.cdr.detectChanges(); }, 2500);
    this.cdr.detectChanges();

    if (this.auth.isLoggedIn()) {
      const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`);
      this.http.post('https://shess-project.onrender.com/api/shop/buy/', { item_id: item.id }, { headers }).subscribe();
    }
  }

  applyItem(item: any, category: string) {
    if (category === 'theme') {
      this.themes.forEach(t => t.active = false);
      item.active = true;
      localStorage.setItem('active_theme', String(item.id));
      localStorage.setItem('board_theme_light', item.l);
      localStorage.setItem('board_theme_dark', item.d);
    }
    if (category === 'title') {
      localStorage.setItem('user_title', item.name);
    }
    this.cdr.detectChanges();
  }
}
