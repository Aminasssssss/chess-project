from rest_framework import serializers
from django.contrib.auth.models import User
from .models import PlayerStats, Game, Achievement, Puzzle, Tournament, ShopItem


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    city = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'city']

    def create(self, validated_data):
        city = validated_data.pop('city', '')
        user = User.objects.create_user(**validated_data)
        PlayerStats.objects.create(user=user, city=city)
        return user


class PlayerStatsSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')
    email = serializers.CharField(source='user.email')

    class Meta:
        model = PlayerStats
        fields = [
            'username', 'email', 'elo', 'wins', 'losses', 'draws',
            'city', 'streak', 'max_streak', 'coins', 'is_pro',
            'puzzle_total_score', 'puzzle_best_score',
            'puzzles_solved_total', 'puzzle_games_played',
            'daily_login_streak', 'last_bonus_date',
            'favorite_opening', 'total_playtime',
            'board_theme', 'avatar_frame', 'title', 'owned_items',
        ]


class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = '__all__'
        read_only_fields = ['player', 'created_at']


class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = '__all__'


class PuzzleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Puzzle
        fields = '__all__'


class TournamentSerializer(serializers.ModelSerializer):
    participants_count = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = ['id', 'name', 'prize_coins', 'started_at', 'is_active', 'participants_count']

    def get_participants_count(self, obj):
        return obj.participants.count()


class LeaderboardSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')
    games_played = serializers.SerializerMethodField()

    class Meta:
        model = PlayerStats
        fields = ['username', 'elo', 'wins', 'losses', 'draws', 'city', 'games_played', 'streak', 'title']

    def get_games_played(self, obj):
        return obj.wins + obj.losses + obj.draws


class ShopItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopItem
        fields = '__all__'