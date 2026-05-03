from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('auth/register/',       views.register,         name='register'),
    path('auth/login/',          views.login,            name='login'),
    path('auth/refresh/',        TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/',             views.profile,          name='profile'),
    path('games/',               views.games,            name='games'),
    path('games/analyze/',       views.analyze_game,     name='analyze_game'),
    path('leaderboard/',         views.leaderboard,      name='leaderboard'),
    path('puzzles/',             views.puzzles,          name='puzzles'),
    path('tournaments/',         views.tournaments,      name='tournaments'),
    path('upgrade/',             views.upgrade_to_pro,   name='upgrade'),
    path('achievements/',        views.achievements,     name='achievements'),
    path('puzzle/save-result/',  views.save_puzzle_result, name='save_puzzle_result'),
    path('coach/',               views.coach_analysis,   name='coach'),
    path('coach/quick-tip/',     views.quick_tip,        name='quick_tip'),
    path('daily-bonus/',         views.daily_bonus,      name='daily_bonus'),
    path('stats/elo-history/',   views.elo_history,      name='elo_history'),
    path('stats/extended/',      views.extended_stats,   name='extended_stats'),
    path('stats/rival/',         views.rival,            name='rival'),
    path('shop/items/',          views.shop_items,       name='shop_items'),
    path('shop/buy/',            views.shop_buy,         name='shop_buy'),
    path('health/',              views.health,           name='health'),
]