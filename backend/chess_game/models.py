from django.db import models
from django.contrib.auth.models import User


class PlayerStats(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='stats')
    elo = models.IntegerField(default=1200)
    wins = models.IntegerField(default=0)
    losses = models.IntegerField(default=0)
    draws = models.IntegerField(default=0)
    city = models.CharField(max_length=100, blank=True)
    streak = models.IntegerField(default=0)
    max_streak = models.IntegerField(default=0)
    coins = models.IntegerField(default=100)
    is_pro = models.BooleanField(default=False)
    puzzle_total_score = models.IntegerField(default=0)
    puzzle_best_score = models.IntegerField(default=0)
    puzzles_solved_total = models.IntegerField(default=0)
    puzzle_games_played = models.IntegerField(default=0)
    last_bonus_date = models.DateField(null=True, blank=True)
    daily_login_streak = models.IntegerField(default=0)
    favorite_opening = models.CharField(max_length=100, blank=True)
    total_playtime = models.IntegerField(default=0)
    board_theme = models.CharField(max_length=50, default='classic')
    avatar_frame = models.CharField(max_length=50, default='none')
    title = models.CharField(max_length=50, blank=True)
    owned_items = models.JSONField(default=list)

    def __str__(self):
        return f"{self.user.username} — ELO: {self.elo}"


class Game(models.Model):
    RESULT_CHOICES = [
        ('white', 'White wins'),
        ('black', 'Black wins'),
        ('draw', 'Draw'),
        ('ongoing', 'Ongoing'),
    ]
    player = models.ForeignKey(User, on_delete=models.CASCADE, related_name='games')
    opponent = models.CharField(max_length=100, default='AI')
    pgn = models.TextField(blank=True)
    moves = models.JSONField(default=list)
    result = models.CharField(max_length=10, choices=RESULT_CHOICES, default='ongoing')
    player_color = models.CharField(max_length=5, default='white')
    ai_analysis = models.TextField(blank=True)
    win_probability = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    duration_seconds = models.IntegerField(default=0)
    opening_name = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.player.username} vs {self.opponent} — {self.result}"


class Achievement(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='achievements')
    title = models.CharField(max_length=100)
    description = models.CharField(max_length=255)
    icon = models.CharField(max_length=10)
    earned_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} — {self.title}"


class Puzzle(models.Model):
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]
    fen = models.CharField(max_length=255)
    solution = models.JSONField()
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES)
    description = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"Puzzle {self.id} — {self.difficulty}"


class Tournament(models.Model):
    name = models.CharField(max_length=100)
    participants = models.ManyToManyField(User, related_name='tournaments', blank=True)
    prize_coins = models.IntegerField(default=500)
    started_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class ShopItem(models.Model):
    CATEGORY_CHOICES = [
        ('theme', 'Board Theme'),
        ('frame', 'Avatar Frame'),
        ('title', 'Title'),
    ]
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    price = models.IntegerField(default=100)
    value = models.CharField(max_length=50)
    description = models.CharField(max_length=255, blank=True)
    preview_light = models.CharField(max_length=20, blank=True)
    preview_dark = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.category})"