# Chess Arena KZ

> Первая казахстанская шахматная платформа с AI-тренером

[![Live Demo](https://img.shields.io/badge/demo-live-green)](https://frontend-seven-kappa-36.vercel.app)
[![Backend API](https://img.shields.io/badge/api-online-blue)](https://shess-project.onrender.com)
[![Health Check](https://img.shields.io/badge/health-passing-green)](https://shess-project.onrender.com/api/health/)
[![GitHub](https://img.shields.io/badge/github-repo-black)](https://github.com/Aminasssssss/chess-project)

## Живой проект

**Сайт:** https://frontend-seven-kappa-36.vercel.app  
**API:** https://shess-project.onrender.com

---

## Скриншоты

> Положи скриншоты в папку `docs/screenshots/` и раскомментируй строки ниже

<!-- ![Главная страница](docs/screenshots/home.png) -->
<!-- ![Игровая доска](docs/screenshots/board.png) -->
<!-- ![AI Coach анализ](docs/screenshots/ai-coach.png) -->
<!-- ![Профиль игрока](docs/screenshots/profile.png) -->
<!-- ![Puzzle Rush](docs/screenshots/puzzle.png) -->
<!-- ![Лидерборд](docs/screenshots/leaderboard.png) -->

---

## О проекте

Chess Arena KZ — это не просто шахматы. Это полноценная платформа для игры, обучения и соревнований с уникальным AI Coach который анализирует твои партии как настоящий гроссмейстер.

Единственная шахматная платформа в Казахстане где AI разбирает твои ошибки на русском языке, можно соревноваться за честь своего города и тренировать тактику в режиме Puzzle Rush.

---

## Возможности

### Игра против AI
- 5 уровней сложности — от Новичка до Мастера
- Minimax алгоритм с Alpha-Beta отсечением
- Полные правила шахмат (рокировка, взятие на проходе, превращение пешки)
- Контроль времени — Пуля 1+0, Блиц 3+2, Рапид 10+0
- Конфетти и звуки при ударе и мате
- Кастомизация цвета доски

### Win Probability
- Реальная оценка позиции через **Stockfish.js Web Worker (depth 12)**
- Откалиброванная формула Lichess — точнее чем у большинства шахматных сайтов
- Обновляется после каждого хода в реальном времени
- Fallback на minimax если Stockfish недоступен

### AI Coach
- После каждой партии **Groq AI (LLaMA 3.1)** анализирует твои ходы
- Находит главную ошибку с номером хода
- Определяет стиль игры: Агрессивный / Позиционный / Тактический
- Даёт конкретный совет для следующей партии
- Ответ на русском языке без markdown и шаблонных фраз
- AI подсказка во время игры — лучший ход со стрелкой на доске

### Kazakhstan League
- Глобальный лидерборд с фильтром по городам Казахстана
- Командный зачёт — Алматы против Астаны против Шымкента
- ELO рейтинг (стартовый 1200, как в FIDE)

### Puzzle Rush
- 30 шахматных задач трёх уровней сложности
- Интерактивная доска — ходишь сам, система проверяет правильность хода
- Таймер 5 минут, очки за каждое решение
- Координаты на доске (a-h, 1-8)
- После неверного хода показывает правильный

### Профиль и достижения
- История всех партий с результатами
- PGN экспорт — скопируй партию одной кнопкой
- ELO рейтинг, серия побед, монеты
- Достижения: First Blood, On Fire, Unstoppable, Rising Star, Grandmaster

### Монетизация
- Внутренняя валюта (монеты) за победы
- Upgrade to Pro (500 монет) — готовая бизнес-модель

---

## Технологии

| Слой | Технология |
|------|-----------|
| Frontend | Angular 17, TypeScript, chess.js, SCSS |
| Backend | Django 5.2, Django REST Framework |
| Auth | JWT (SimpleJWT) с refresh токенами |
| AI Coach | Groq API (llama-3.1-8b-instant) |
| Win Probability | Stockfish.js Web Worker (depth 12, формула Lichess) |
| Real-time | Django Channels (WebSockets) |
| База данных | SQLite |
| Деплой Frontend | Vercel |
| Деплой Backend | Render |

---

## Деплой

| Компонент | Ссылка                                        |
|-----------|-----------------------------------------------|
| Frontend | https://frontend-seven-kappa-36.vercel.app    |
| Backend API | https://shess-project.onrender.com            |
| Репозиторий | https://github.com/Aminasssssss/chess-project |

---

## Запуск локально

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_puzzles
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
ng serve
```

### Переменные окружения (backend/.env)
```
SECRET_KEY=your-secret-key
DEBUG=True
GROQ_API_KEY=your-groq-key
```

---

## API Endpoints

| Endpoint | Метод | Описание |
|----------|-------|----------|
| /api/auth/register/ | POST | Регистрация |
| /api/auth/login/ | POST | Вход |
| /api/auth/refresh/ | POST | Обновление токена |
| /api/profile/ | GET/PUT | Профиль пользователя |
| /api/games/ | GET/POST | История партий |
| /api/games/analyze/ | POST | AI Coach анализ |
| /api/leaderboard/ | GET | Рейтинг игроков |
| /api/puzzles/ | GET | Задачи Puzzle Rush |
| /api/achievements/ | GET | Достижения |
| /api/upgrade/ | POST | Upgrade to Pro |

---

## Что делает проект уникальным

**AI Coach** — единственная фича которой нет ни у одного конкурента на казахстанском рынке. После партии получаешь детальный разбор на русском языке с конкретными советами, а не просто "ты проиграл".

**Win Probability через Stockfish** — реальная оценка позиции (depth 12) с откалиброванной формулой Lichess. Точнее чем у большинства шахматных сайтов.

**Kazakhstan League** — социальный слой который удерживает пользователей. Люди регистрируются чтобы играть за свой город и поднимать его в командном зачёте.

**Puzzle Rush** — геймификация обучения тактике. Как Duolingo но для шахмат — таймер, очки, интерактивная проверка хода.

---


Сделано в рамках **nFactorial Incubator 2026**



