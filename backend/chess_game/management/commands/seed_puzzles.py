from django.core.management.base import BaseCommand
from chess_game.models import Puzzle

class Command(BaseCommand):
    help = 'Seed puzzles'

    def handle(self, *args, **kwargs):
        puzzles = [
            {'fen': '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
             'solution': ['Re8'], 'difficulty': 'easy', 'description': 'Мат по последней горизонтали'},

            {'fen': 'k7/2R5/1K6/8/8/8/8/8 w - - 0 1',
             'solution': ['Rc8'], 'difficulty': 'easy', 'description': 'Мат ладьёй в углу'},

            {'fen': '7k/5QR1/8/8/8/8/8/6K1 w - - 0 1',
             'solution': ['Rh7'], 'difficulty': 'easy', 'description': 'Мат ладьёй на 7-й'},

            {'fen': 'k7/2Q5/2K5/8/8/8/8/8 w - - 0 1',
             'solution': ['Qb7'], 'difficulty': 'easy', 'description': 'Мат ферзём'},

            {'fen': 'k7/8/KQ6/8/8/8/8/8 w - - 0 1',
             'solution': ['Qb8'], 'difficulty': 'easy', 'description': 'Мат ферзём 2'},

            {'fen': '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
             'solution': ['Ra8'], 'difficulty': 'easy', 'description': 'Мат ладьёй по 8-й'},

            {'fen': '5k2/8/4QK2/8/8/8/8/8 w - - 0 1',
             'solution': ['Qe8'], 'difficulty': 'easy', 'description': 'Мат ферзём 3'},

            {'fen': '3k4/8/2QK4/8/8/8/8/8 w - - 0 1',
             'solution': ['Qd7'], 'difficulty': 'easy', 'description': 'Мат ферзём 4'},

            {'fen': '2k5/8/1QK5/8/8/8/8/8 w - - 0 1',
             'solution': ['Qc7'], 'difficulty': 'easy', 'description': 'Мат ферзём 5'},

            {'fen': 'k7/8/K1R5/8/8/8/8/8 w - - 0 1',
             'solution': ['Rc8'], 'difficulty': 'easy', 'description': 'Мат ладьёй 2'},

            {'fen': '4r1rk/5K1b/7R/R7/8/8/8/8 w - - 0 1',
             'solution': ['Rxh7', 'Kxh7', 'Rh5'], 'difficulty': 'medium', 'description': 'Двойной удар ладьями'},

            {'fen': '8/1r6/8/3R4/k7/p1K5/4r3/R7 w - - 0 1',
             'solution': ['Rxa3', 'Kxa3', 'Ra5'], 'difficulty': 'medium', 'description': 'Жертва ладьи'},

            {'fen': '6k1/8/6K1/8/8/3r4/4r3/5R1R w - - 0 1',
             'solution': ['Rh8', 'Kxh8', 'Rf8'], 'difficulty': 'medium', 'description': 'Мат двумя ладьями'},

            {'fen': '2rkr3/2ppp3/2n1n3/R2R4/8/8/3K4/8 w - - 0 1',
             'solution': ['Rxd7', 'Kxd7', 'Rd5'], 'difficulty': 'medium', 'description': 'Разрушение прикрытия'},

            {'fen': '2k5/1q4b1/3K4/8/7R/8/7R/8 w - - 0 1',
             'solution': ['Rh8', 'Bxh8', 'Rxh8'], 'difficulty': 'medium', 'description': 'Жертва на h8'},

            {'fen': 'kb6/p4q2/2K5/8/8/8/8/1R1R4 w - - 0 1',
             'solution': ['Rxb8', 'Kxb8', 'Rd8'], 'difficulty': 'medium', 'description': 'Мат двумя ладьями 2'},

            {'fen': '6rk/6n1/1R1Q4/7r/8/8/8/3K4 w - - 0 1',
             'solution': ['Qh6', 'Rxh6', 'Rxh6'], 'difficulty': 'medium', 'description': 'Атака на короля'},

            {'fen': 'r7/kp6/pR1Q4/5q2/8/8/8/3K4 w - - 0 1',
             'solution': ['Rxa6', 'bxa6', 'Qc7'], 'difficulty': 'medium', 'description': 'Жертва ладьи 2'},

            {'fen': '4Q3/kr6/pp6/8/8/8/6q1/R2K4 w - - 0 1',
             'solution': ['Rxa6', 'Kxa6', 'Qa4'], 'difficulty': 'medium', 'description': 'Мат ферзём и ладьёй'},

            {'fen': '8/6p1/6rk/6np/R6R/6K1/8/8 w - - 0 1',
             'solution': ['Rxh5', 'Kxh5', 'Rh4'], 'difficulty': 'medium', 'description': 'Арабский мат'},

            {'fen': 'k7/8/1K6/4R3/8/8/8/8 w - - 0 1',
             'solution': ['Re8', 'Ka7', 'Ra8'], 'difficulty': 'hard', 'description': 'Мат в 3 хода'},

            {'fen': '6k1/5ppp/8/4R3/8/8/5PPP/6K1 w - - 0 1',
             'solution': ['Re8', 'Kh7', 'Rh8'], 'difficulty': 'hard', 'description': 'Мат ладьёй в 3'},

            {'fen': 'k7/3b4/1K6/8/8/5q2/2R1R3/8 w - - 0 1',
             'solution': ['Re8', 'Bxe8', 'Rc8'], 'difficulty': 'hard', 'description': 'Жертва ладьи'},

            {'fen': 'kr6/1p6/8/1p5R/6R1/8/1r6/5K2 w - - 0 1',
             'solution': ['Ra4', 'bxa4', 'Ra5'], 'difficulty': 'hard', 'description': 'Двойная жертва'},

            {'fen': 'kn1R4/ppp5/2q5/8/8/8/8/3RK3 w - - 0 1',
             'solution': ['Rxb8', 'Kxb8', 'Rd8'], 'difficulty': 'hard', 'description': 'Мат двумя ладьями 3'},

            {'fen': '1kb4R/1npp4/8/8/8/8/8/R5K1 w - - 0 1',
             'solution': ['Rxc8', 'Kxc8', 'Ra8'], 'difficulty': 'hard', 'description': 'Мат по горизонтали'},

            {'fen': '1k4r1/ppp5/8/8/2q5/8/5Q2/3K1R2 w - - 0 1',
             'solution': ['Qf8', 'Rxf8', 'Rxf8'], 'difficulty': 'hard', 'description': 'Атака на короля 2'},

            {'fen': '3R4/2q5/8/rpn5/kp5Q/2n5/1K6/8 w - - 0 1',
             'solution': ['Qxb4', 'Kxb4', 'Rd4'], 'difficulty': 'hard', 'description': 'Жертва ферзя'},

            {'fen': '6B1/p1K5/k7/pp6/8/8/8/R7 w - - 0 1',
             'solution': ['Ra4', 'bxa4', 'Bc4'], 'difficulty': 'hard', 'description': 'Слон и ладья'},

            {'fen': '8/8/7p/5K1k/6pp/1R6/B4n1r/8 w - - 0 1',
             'solution': ['Rh3', 'gxh3', 'Bf7'], 'difficulty': 'hard', 'description': 'Слон на финале'},
        ]

        count = 0
        for p in puzzles:
            _, created = Puzzle.objects.get_or_create(
                fen=p['fen'],
                difficulty=p['difficulty'],
                defaults={
                    'solution': p['solution'],
                    'description': p['description']
                }
            )
            if created:
                count += 1
        self.stdout.write(self.style.SUCCESS(f'{count} новых задач добавлено!'))