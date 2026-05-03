import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Leaderboard } from './pages/leaderboard/leaderboard';
import { Profile } from './pages/profile/profile';
import { Puzzle } from './pages/puzzle/puzzle';
import { Play } from './pages/play/play';
import { Multiplayer } from './pages/multiplayer/multiplayer';
import { Pricing } from './pages/pricing/pricing';
import { Coach } from './pages/coach/coach';
import { Learn } from './pages/learn/learn';
import { Shop } from './pages/shop/shop';



export const routes: Routes = [
  { path: '', component: Home },
  { path: 'play', component: Play },
  { path: 'play/multiplayer', component: Multiplayer },
  { path: 'play/multiplayer/:room_code', component: Multiplayer },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'leaderboard', component: Leaderboard },
  { path: 'profile', component: Profile },
  { path: 'puzzle', component: Puzzle },
  { path: 'pricing', component: Pricing },
  { path: 'coach', component: Coach },
  { path: 'learn', component: Learn },
  { path: 'shop',  component: Shop },

  { path: '**', redirectTo: '' },

];
