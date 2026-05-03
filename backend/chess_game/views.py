from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.conf import settings
from .models import PlayerStats, Game, Achievement, Puzzle, Tournament
from .serializers import (RegisterSerializer, PlayerStatsSerializer,
                          GameSerializer, AchievementSerializer,
                          PuzzleSerializer, TournamentSerializer,
                          LeaderboardSerializer)
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
        city = request.data.get('city', stats.city)
        stats.city = city
        stats.save()
        return Response({'message': 'Updated successfully'})


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
        )
        _update_stats(request.user, data.get('result'), player_color)
        return Response(GameSerializer(game).data, status=status.HTTP_201_CREATED)


def _update_stats(user, result, player_color):
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

    stats.save()
    _check_achievements(user, stats)

def _check_achievements(user, stats):
    achievements_to_check = [
        (stats.wins == 1, 'First Blood', 'Первая победа', '⚔️'),
        (stats.wins == 10, 'On Fire', '10 побед!', '🔥'),
        (stats.streak == 5, 'Unstoppable', '5 побед подряд', '🚀'),
        (stats.elo >= 1500, 'Rising Star', 'ELO 1500', '⭐'),
        (stats.elo >= 2000, 'Grandmaster', 'ELO 2000', '👑'),
    ]
    for condition, title, desc, icon in achievements_to_check:
        if condition:
            Achievement.objects.get_or_create(user=user, title=title,
                defaults={'description': desc, 'icon': icon})
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_game(request):
    moves = request.data.get('moves', [])
    result = request.data.get('result', '')
    pgn = request.data.get('pgn', '')

    try:
        import requests as req
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

        response = req.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {settings.GROQ_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'llama-3.1-8b-instant',
                'messages': [{'role': 'user', 'content': prompt}],
                'max_tokens': 1000
            },
            timeout=30
        )
        data = response.json()
        text = data['choices'][0]['message']['content']
        return Response({'analysis': text})
    except Exception as e:
        print('Groq error:', str(e))
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

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
    random_id = random.choice(ids)
    puzzle = Puzzle.objects.filter(id=random_id)
    serializer = PuzzleSerializer(puzzle, many=True)
    return Response(serializer.data)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def tournaments(request):
    if request.method == 'GET':
        tournament_list = Tournament.objects.filter(is_active=True)
        serializer = TournamentSerializer(tournament_list, many=True)
        return Response(serializer.data)
    if request.method == 'POST':
        tournament_id = request.data.get('tournament_id')
        tournament = Tournament.objects.get(id=tournament_id)
        tournament.participants.add(request.user)
        stats = PlayerStats.objects.get(user=request.user)
        stats.coins = max(0, stats.coins - 50)
        stats.save()
        return Response({'message': 'Joined tournament!'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upgrade_to_pro(request):
    stats = PlayerStats.objects.get(user=request.user)
    if stats.coins >= 500:
        stats.is_pro = True
        stats.coins -= 500
        stats.save()
        return Response({'message': 'Welcome to Pro!', 'is_pro': True})
    return Response({'error': 'Not enough coins'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def achievements(request):
    user_achievements = Achievement.objects.filter(user=request.user)
    serializer = AchievementSerializer(user_achievements, many=True)
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
    
    if stats.puzzle_total_score >= 100:
        Achievement.objects.get_or_create(
            user=request.user,
            title='Puzzle Master',
            defaults={'description': 'Набрал 100 очков в Puzzle Rush', 'icon': '🧩'}
        )
    
    return Response({
        'puzzle_total_score': stats.puzzle_total_score,
        'puzzle_best_score': stats.puzzle_best_score,
        'puzzles_solved_total': stats.puzzles_solved_total,
        'coins': stats.coins,
        'coins_earned': coins_earned
    })
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def coach_analysis(request):
    import requests as req
    
    stats = PlayerStats.objects.get(user=request.user)
    games = Game.objects.filter(player=request.user).order_by('-created_at')[:20]
    
    total = stats.wins + stats.losses + stats.draws
    win_rate = round(stats.wins / total * 100) if total > 0 else 0
    
    # Для новых игроков без партий
    if total == 0:
        return Response({
            'analysis': 'ОБЩИЙ УРОВЕНЬ\nВы новый игрок. Сыграйте несколько партий и AI Coach даст детальный анализ.\n\nСТИЛЬ ИГРЫ\nОпределится после 3-5 партий\n\nСИЛЬНЫЕ СТОРОНЫ\nБудут определены после партий\n\nСЛАБЫЕ СТОРОНЫ\nБудут определены после партий\n\nПЛАН ТРЕНИРОВОК\n1. Сыграйте партию против AI\n2. Решайте Puzzle Rush\n3. Возвращайтесь за анализом\n\nПРОГНОЗ\nСыграйте партии для прогноза',
            'stats': {
                'elo': stats.elo,
                'wins': 0,
                'losses': 0,
                'draws': 0,
                'win_rate': 0,
                'streak': 0,
                'max_streak': 0,
                'total': 0,
            }
        })
    
    games_data = []
    for g in games:
        games_data.append({
            'result': g.result,
            'color': g.player_color,
            'moves_count': len(g.moves),
            'pgn': g.pgn[:200] if g.pgn else '',
        })
    
    prompt = f"""Ты персональный шахматный тренер. Проанализируй игрока и дай детальный анализ. Отвечай БЕЗ markdown, без звёздочек, без решёток — только обычный текст с разделами.

ДАННЫЕ ИГРОКА:
Имя: {request.user.username}
ELO: {stats.elo}
Победы: {stats.wins} | Поражения: {stats.losses} | Ничьи: {stats.draws}
Винрейт: {win_rate}%
Серия побед: {stats.streak}
Лучшая серия: {stats.max_streak}
Партий сыграно: {total}
Последние партии: {games_data[:10]}

Дай анализ в таком формате:

ОБЩИЙ УРОВЕНЬ
(оцени уровень игрока по ELO и статистике, 2-3 предложения)

СТИЛЬ ИГРЫ
(определи стиль — Агрессивный / Позиционный / Тактический / Универсальный, объясни почему)

СИЛЬНЫЕ СТОРОНЫ
(что игрок делает хорошо на основе данных)

СЛАБЫЕ СТОРОНЫ
(где теряет очки, конкретно)

ПЛАН ТРЕНИРОВОК
(3 конкретных совета что делать чтобы вырасти)

ПРОГНОЗ
(до какого ELO может вырасти и за сколько если будет тренироваться)"""

    default_analysis = f"""ОБЩИЙ УРОВЕНЬ
Игрок с рейтингом {stats.elo} ELO. Сыграно {total} партий. Винрейт {win_rate}%. Серия побед: {stats.streak} (лучшая: {stats.max_streak}).

СТИЛЬ ИГРЫ
{('Агрессивный' if stats.wins > stats.losses else 'Позиционный')} стиль. {'Атакует и создаёт угрозы' if stats.wins > stats.losses else 'Старается не рисковать'}.

СИЛЬНЫЕ СТОРОНЫ
{('Тактическое зрение, умение атаковать' if stats.wins > stats.losses else 'Оборона, редко проигрывает вчистую')}

СЛАБЫЕ СТОРОНЫ
{('Иногда переоценивает атаки' if stats.wins > stats.losses else 'Мало атак, пассивная игра')}

ПЛАН ТРЕНИРОВОК
1. {('Решать задачи на тактику' if stats.wins > stats.losses else 'Изучать атакующие схемы')}
2. Анализировать свои партии
3. Решать Puzzle Rush ежедневно

ПРОГНОЗ
При регулярных тренировках через месяц ELO вырастет до {stats.elo + 100}"""

    try:
        response = req.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {settings.GROQ_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'llama-3.1-8b-instant',
                'messages': [{'role': 'user', 'content': prompt}],
                'max_tokens': 1500
            },
            timeout=30
        )
        data = response.json()
        text = data['choices'][0]['message']['content']
        return Response({
            'analysis': text,
            'stats': {
                'elo': stats.elo,
                'wins': stats.wins,
                'losses': stats.losses,
                'draws': stats.draws,
                'win_rate': win_rate,
                'streak': stats.streak,
                'max_streak': stats.max_streak,
                'total': total,
            }
        })
    except Exception as e:
        return Response({
            'analysis': default_analysis,
            'stats': {
                'elo': stats.elo,
                'wins': stats.wins,
                'losses': stats.losses,
                'draws': stats.draws,
                'win_rate': win_rate,
                'streak': stats.streak,
                'max_streak': stats.max_streak,
                'total': total,
            }
        })
    
@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    return Response({'status': 'ok'})