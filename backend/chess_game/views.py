from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.conf import settings
from .models import PlayerStats, Game, Achievement, Puzzle, Tournament, ShopItem
from .serializers import (RegisterSerializer, PlayerStatsSerializer,
                          GameSerializer, AchievementSerializer,
                          PuzzleSerializer, TournamentSerializer,
                          LeaderboardSerializer, ShopItemSerializer)
import requests as req


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'username': user.username,
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if user:
        refresh = RefreshToken.for_user(user)
        stats = PlayerStats.objects.get(user=user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'username': user.username,
            'elo': stats.elo,
            'is_pro': stats.is_pro,
            'coins': stats.coins,
            'title': stats.title,
            'board_theme': stats.board_theme,
        })
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile(request):
    stats = PlayerStats.objects.get(user=request.user)
    if request.method == 'GET':
        serializer = PlayerStatsSerializer(stats)
        return Response(serializer.data)
    if request.method == 'PUT':
        for field in ['city', 'favorite_opening', 'board_theme', 'avatar_frame', 'title']:
            if field in request.data:
                setattr(stats, field, request.data[field])
        stats.save()
        return Response({'message': 'Updated'})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def games(request):
    if request.method == 'GET':
        user_games = Game.objects.filter(player=request.user).order_by('-created_at')[:20]
        serializer = GameSerializer(user_games, many=True)
        return Response(serializer.data)
    if request.method == 'POST':
        data = request.data.copy()
        player_color = data.get('player_color', 'white')
        game = Game.objects.create(
            player=request.user,
            opponent=data.get('opponent', 'AI'),
            pgn=data.get('pgn', ''),
            moves=data.get('moves', []),
            result=data.get('result', 'ongoing'),
            player_color=player_color,
            win_probability=data.get('win_probability', []),
            duration_seconds=data.get('duration_seconds', 0),
            opening_name=data.get('opening_name', ''),
        )
        _update_stats(request.user, data.get('result'), player_color, data.get('duration_seconds', 0))
        return Response(GameSerializer(game).data, status=status.HTTP_201_CREATED)


def _update_stats(user, result, player_color, duration=0):
    stats = PlayerStats.objects.get(user=user)
    player_won = (
        (result == 'white' and player_color == 'white') or
        (result == 'black' and player_color == 'black')
    )
    if result == 'draw':
        stats.draws += 1
        stats.streak = 0
        stats.elo += 5
    elif player_won:
        stats.wins += 1
        stats.streak += 1
        stats.elo += 25
        if stats.streak > stats.max_streak:
            stats.max_streak = stats.streak
    else:
        stats.losses += 1
        stats.streak = 0
        stats.elo = max(100, stats.elo - 20)
    stats.total_playtime += duration
    stats.save()
    _check_achievements(user, stats)


def _check_achievements(user, stats):
    total = stats.wins + stats.losses + stats.draws
    checks = [
        (stats.wins >= 1,                    'First Blood',    'Первая победа',           '♟'),
        (stats.wins >= 10,                   'On Fire',        '10 побед',                '♞'),
        (stats.wins >= 50,                   'Veteran',        '50 побед',                '♜'),
        (stats.wins >= 100,                  'Legend',         '100 побед',               '♛'),
        (stats.streak >= 5,                  'Unstoppable',    '5 побед подряд',          '♔'),
        (stats.streak >= 10,                 'Godlike',        '10 побед подряд',         '♕'),
        (stats.elo >= 1400,                  'Promising',      'ELO 1400',                '♗'),
        (stats.elo >= 1600,                  'Rising Star',    'ELO 1600',                '♘'),
        (stats.elo >= 2000,                  'Grandmaster',    'ELO 2000',                '♚'),
        (stats.puzzles_solved_total >= 10,   'Puzzle Rookie',  '10 задач решено',         '♙'),
        (stats.puzzles_solved_total >= 50,   'Puzzle Wizard',  '50 задач решено',         '♟'),
        (stats.puzzle_best_score >= 100,     'Speed Solver',   'Рекорд 100 очков',        '♞'),
        (stats.daily_login_streak >= 7,      'Devoted',        '7 дней подряд',           '♜'),
        (stats.daily_login_streak >= 30,     'Dedicated',      '30 дней подряд',          '♛'),
        (total >= 100,                       'Century',        '100 партий',              '♔'),
    ]
    for condition, title, desc, icon in checks:
        if condition:
            Achievement.objects.get_or_create(
                user=user, title=title,
                defaults={'description': desc, 'icon': icon}
            )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def daily_bonus(request):
    from datetime import date, timedelta
    stats = PlayerStats.objects.get(user=request.user)
    today = date.today()

    if stats.last_bonus_date == today:
        return Response({
            'already_claimed': True,
            'coins': stats.coins,
            'daily_login_streak': stats.daily_login_streak,
        })

    yesterday = today - timedelta(days=1)
    if stats.last_bonus_date == yesterday:
        stats.daily_login_streak += 1
    else:
        stats.daily_login_streak = 1

    bonus = min(25 + stats.daily_login_streak * 5, 85)
    stats.coins += bonus
    stats.last_bonus_date = today
    stats.save()
    _check_achievements(request.user, stats)

    return Response({
        'already_claimed': False,
        'coins': stats.coins,
        'bonus': bonus,
        'daily_login_streak': stats.daily_login_streak,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def elo_history(request):
    games = Game.objects.filter(player=request.user).order_by('created_at')[:50]
    history = []
    elo = 1200
    for g in games:
        player_won = (
            (g.result == 'white' and g.player_color == 'white') or
            (g.result == 'black' and g.player_color == 'black')
        )
        if g.result == 'draw':
            elo += 5
        elif player_won:
            elo += 25
        else:
            elo = max(100, elo - 20)
        history.append({
            'elo': elo,
            'result': g.result,
            'date': g.created_at.strftime('%d.%m'),
            'opponent': g.opponent,
            'opening': g.opening_name,
        })
    return Response(history)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def extended_stats(request):
    from datetime import datetime
    stats = PlayerStats.objects.get(user=request.user)
    games_qs = Game.objects.filter(player=request.user)
    total = stats.wins + stats.losses + stats.draws
    win_rate = round(stats.wins / total * 100) if total > 0 else 0

    hour_wins = {}
    for g in games_qs:
        hour = g.created_at.hour
        if hour not in hour_wins:
            hour_wins[hour] = {'wins': 0, 'total': 0}
        hour_wins[hour]['total'] += 1
        player_won = (
            (g.result == 'white' and g.player_color == 'white') or
            (g.result == 'black' and g.player_color == 'black')
        )
        if player_won:
            hour_wins[hour]['wins'] += 1

    best_hour = None
    best_rate = 0
    for hour, data in hour_wins.items():
        if data['total'] >= 3:
            rate = data['wins'] / data['total']
            if rate > best_rate:
                best_rate = rate
                best_hour = hour

    avg_duration = 0
    if total > 0:
        total_dur = sum(g.duration_seconds for g in games_qs)
        avg_duration = round(total_dur / total)

    openings = {}
    for g in games_qs:
        if g.opening_name:
            if g.opening_name not in openings:
                openings[g.opening_name] = {'count': 0, 'wins': 0}
            openings[g.opening_name]['count'] += 1
            player_won = (
                (g.result == 'white' and g.player_color == 'white') or
                (g.result == 'black' and g.player_color == 'black')
            )
            if player_won:
                openings[g.opening_name]['wins'] += 1

    top_openings = sorted(
        [{'name': k, **v, 'win_rate': round(v['wins'] / v['count'] * 100)} for k, v in openings.items()],
        key=lambda x: x['count'], reverse=True
    )[:5]

    return Response({
        'win_rate': win_rate,
        'total_games': total,
        'avg_duration_seconds': avg_duration,
        'best_hour': best_hour,
        'best_hour_win_rate': round(best_rate * 100),
        'top_openings': top_openings,
        'total_playtime': stats.total_playtime,
        'daily_login_streak': stats.daily_login_streak,
        'board_theme': stats.board_theme,
        'title': stats.title,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def rival(request):
    stats = PlayerStats.objects.get(user=request.user)
    games_qs = Game.objects.filter(player=request.user).exclude(opponent='AI')
    rival_losses = {}
    for g in games_qs:
        player_lost = (
            (g.result == 'white' and g.player_color == 'black') or
            (g.result == 'black' and g.player_color == 'white')
        )
        if player_lost:
            opp = g.opponent
            rival_losses[opp] = rival_losses.get(opp, 0) + 1

    if not rival_losses:
        return Response({'rival': None})

    top_rival = max(rival_losses, key=rival_losses.get)
    return Response({
        'rival': top_rival,
        'losses_to_rival': rival_losses[top_rival],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def shop_items(request):
    items = ShopItem.objects.filter(is_active=True)
    stats = PlayerStats.objects.get(user=request.user)
    data = ShopItemSerializer(items, many=True).data
    for item in data:
        item['owned'] = item['value'] in stats.owned_items
    return Response({'items': data, 'coins': stats.coins})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def shop_buy(request):
    item_id = request.data.get('item_id')
    try:
        item = ShopItem.objects.get(id=item_id, is_active=True)
    except ShopItem.DoesNotExist:
        return Response({'error': 'Item not found'}, status=404)

    stats = PlayerStats.objects.get(user=request.user)

    if item.value in stats.owned_items:
        return Response({'error': 'Already owned'}, status=400)

    if stats.coins < item.price:
        return Response({'error': 'Not enough coins'}, status=400)

    stats.coins -= item.price
    owned = stats.owned_items or []
    owned.append(item.value)
    stats.owned_items = owned

    if item.category == 'theme':
        stats.board_theme = item.value
    elif item.category == 'frame':
        stats.avatar_frame = item.value
    elif item.category == 'title':
        stats.title = item.value

    stats.save()
    return Response({'coins': stats.coins, 'owned_items': stats.owned_items})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def quick_tip(request):
    stats = PlayerStats.objects.get(user=request.user)
    total = stats.wins + stats.losses + stats.draws
    win_rate = round(stats.wins / total * 100) if total > 0 else 0

    prompt = f"""Дай один конкретный шахматный совет для игрока с ELO {stats.elo} и винрейтом {win_rate}%. 
Одно предложение, максимум 20 слов. Без вступления, сразу совет. На русском."""

    try:
        response = req.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={'Authorization': f'Bearer {settings.GROQ_API_KEY}', 'Content-Type': 'application/json'},
            json={'model': 'llama-3.1-8b-instant', 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 100},
            timeout=15
        )
        text = response.json()['choices'][0]['message']['content'].strip()
        return Response({'tip': text})
    except Exception:
        tips = [
            'Контролируй центр с первых ходов — это основа всей игры.',
            'Перед атакой убедись что твой король в безопасности.',
            'Развивай фигуры быстро и рокируйся до 10-го хода.',
            'Думай об угрозах соперника, не только о своих планах.',
            'В эндшпиле активируй короля — он становится сильной фигурой.',
        ]
        import random
        return Response({'tip': random.choice(tips)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_game(request):
    moves = request.data.get('moves', [])
    result = request.data.get('result', '')
    pgn = request.data.get('pgn', '')

    prompt = f"""Ты профессиональный шахматный тренер. Проанализируй партию. Отвечай БЕЗ markdown, без звёздочек, без решёток — только обычный текст.

Ходы: {', '.join(moves[:40]) if moves else 'нет ходов'}
Результат: {result}
PGN: {pgn}

Дай анализ на русском в таком формате:

ОБЩАЯ ОЦЕНКА
(2-3 предложения об игре)

ГЛАВНАЯ ОШИБКА
(номер хода и что случилось)

ЧТО СДЕЛАЛ ХОРОШО
(1-2 момента)

СОВЕТ
(один конкретный совет)

СТИЛЬ ИГРЫ
(Агрессивный / Позиционный / Тактический)"""

    try:
        response = req.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={'Authorization': f'Bearer {settings.GROQ_API_KEY}', 'Content-Type': 'application/json'},
            json={'model': 'llama-3.1-8b-instant', 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 1000},
            timeout=30
        )
        text = response.json()['choices'][0]['message']['content']
        return Response({'analysis': text})
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def leaderboard(request):
    city = request.query_params.get('city', None)
    stats = PlayerStats.objects.all().order_by('-elo')
    if city:
        stats = stats.filter(city__icontains=city)
    serializer = LeaderboardSerializer(stats[:50], many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def puzzles(request):
    import random
    difficulty = request.query_params.get('difficulty', 'medium')
    ids = list(Puzzle.objects.filter(difficulty=difficulty).values_list('id', flat=True))
    if not ids:
        return Response([])
    puzzle = Puzzle.objects.filter(id=random.choice(ids))
    return Response(PuzzleSerializer(puzzle, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def tournaments(request):
    if request.method == 'GET':
        serializer = TournamentSerializer(Tournament.objects.filter(is_active=True), many=True)
        return Response(serializer.data)
    if request.method == 'POST':
        tournament = Tournament.objects.get(id=request.data.get('tournament_id'))
        tournament.participants.add(request.user)
        stats = PlayerStats.objects.get(user=request.user)
        stats.coins = max(0, stats.coins - 50)
        stats.save()
        return Response({'message': 'Joined!'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upgrade_to_pro(request):
    stats = PlayerStats.objects.get(user=request.user)
    if stats.coins >= 500:
        stats.is_pro = True
        stats.coins -= 500
        stats.save()
        return Response({'message': 'Welcome to Pro!', 'is_pro': True})
    return Response({'error': 'Not enough coins'}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def achievements(request):
    serializer = AchievementSerializer(Achievement.objects.filter(user=request.user), many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_puzzle_result(request):
    stats = PlayerStats.objects.get(user=request.user)
    score = request.data.get('score', 0)
    solved = request.data.get('solved', 0)
    stats.puzzle_total_score += score
    stats.puzzles_solved_total += solved
    stats.puzzle_games_played += 1
    if score > stats.puzzle_best_score:
        stats.puzzle_best_score = score
    coins_earned = solved * 2
    stats.coins += coins_earned
    stats.save()
    _check_achievements(request.user, stats)
    return Response({
        'puzzle_total_score': stats.puzzle_total_score,
        'puzzle_best_score': stats.puzzle_best_score,
        'puzzles_solved_total': stats.puzzles_solved_total,
        'coins': stats.coins,
        'coins_earned': coins_earned,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def coach_analysis(request):
    stats = PlayerStats.objects.get(user=request.user)
    games = Game.objects.filter(player=request.user).order_by('-created_at')[:20]
    total = stats.wins + stats.losses + stats.draws
    win_rate = round(stats.wins / total * 100) if total > 0 else 0

    if total == 0:
        return Response({
            'analysis': 'ОБЩИЙ УРОВЕНЬ\nВы новый игрок. Сыграйте несколько партий.\n\nСТИЛЬ ИГРЫ\nОпределится после 3-5 партий\n\nСИЛЬНЫЕ СТОРОНЫ\nБудут определены после партий\n\nСЛАБЫЕ СТОРОНЫ\nБудут определены после партий\n\nПЛАН ТРЕНИРОВОК\n1. Сыграйте партию против AI\n2. Решайте Puzzle Rush\n3. Возвращайтесь за анализом\n\nПРОГНОЗ\nСыграйте партии для прогноза',
            'stats': {'elo': stats.elo, 'wins': 0, 'losses': 0, 'draws': 0, 'win_rate': 0, 'streak': 0, 'max_streak': 0, 'total': 0}
        })

    games_data = [{'result': g.result, 'color': g.player_color, 'moves_count': len(g.moves), 'opening': g.opening_name} for g in games]

    prompt = f"""Ты персональный шахматный тренер. Проанализируй игрока. Отвечай БЕЗ markdown, без звёздочек, без решёток.

ELO: {stats.elo} | Победы: {stats.wins} | Поражения: {stats.losses} | Ничьи: {stats.draws}
Винрейт: {win_rate}% | Серия: {stats.streak} | Лучшая серия: {stats.max_streak}
Последние партии: {games_data[:10]}

Формат:

ОБЩИЙ УРОВЕНЬ
СТИЛЬ ИГРЫ
СИЛЬНЫЕ СТОРОНЫ
СЛАБЫЕ СТОРОНЫ
ПЛАН ТРЕНИРОВОК
ПРОГНОЗ"""

    try:
        response = req.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={'Authorization': f'Bearer {settings.GROQ_API_KEY}', 'Content-Type': 'application/json'},
            json={'model': 'llama-3.1-8b-instant', 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 1500},
            timeout=30
        )
        text = response.json()['choices'][0]['message']['content']
    except Exception:
        text = f'ОБЩИЙ УРОВЕНЬ\nELO {stats.elo}, {total} партий, винрейт {win_rate}%.\n\nСТИЛЬ ИГРЫ\n{"Агрессивный" if stats.wins > stats.losses else "Позиционный"}.\n\nСИЛЬНЫЕ СТОРОНЫ\nРегулярность игры.\n\nСЛАБЫЕ СТОРОНЫ\nНужно больше партий для анализа.\n\nПЛАН ТРЕНИРОВОК\n1. Puzzle Rush ежедневно\n2. Анализируй свои партии\n3. Изучай дебюты\n\nПРОГНОЗ\nЧерез месяц тренировок ELO вырастет до {stats.elo + 100}'

    return Response({
        'analysis': text,
        'stats': {
            'elo': stats.elo, 'wins': stats.wins, 'losses': stats.losses,
            'draws': stats.draws, 'win_rate': win_rate,
            'streak': stats.streak, 'max_streak': stats.max_streak, 'total': total,
        }
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    return Response({'status': 'ok'})