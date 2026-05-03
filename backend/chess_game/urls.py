from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login, name='login'),
    path('profile/', views.profile, name='profile'),
    path('games/', views.games, name='games'),
    path('games/analyze/', views.analyze_game, name='analyze_game'),
    path('leaderboard/', views.leaderboard, name='leaderboard'),
    path('puzzles/', views.puzzles, name='puzzles'),
    path('tournaments/', views.tournaments, name='tournaments'),
    path('upgrade/', views.upgrade_to_pro, name='upgrade'),
    path('achievements/', views.achievements, name='achievements'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('puzzle/save-result/', views.save_puzzle_result, name='save_puzzle_result'),
    path('coach/', views.coach_analysis, name='coach'),
    path('health/', views.health, name='health'),
    ]