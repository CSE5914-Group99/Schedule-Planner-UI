import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { WelcomeComponent } from './components/welcome/welcome.component';
import { ScheduleListComponent } from './components/schedules/schedule-list.component';
import { ScheduleBuilderComponent } from './components/schedules/schedule-builder.component';

export const routes: Routes = [
  // New first page for visitors: welcome (sign in / sign up)
  { path: '', component: WelcomeComponent, pathMatch: 'full' },
  // Legacy aliases: redirect /login and /signin to the welcome screen
  { path: 'login', redirectTo: '', pathMatch: 'full' },
  { path: 'signin', redirectTo: '', pathMatch: 'full' },
  { path: 'signup', component: (await import('./components/signup/signup.component')).SignupComponent },
  // Dashboard after login
  { path: 'landing', component: LandingComponent },
  { path: 'schedules', component: ScheduleListComponent },
  { path: 'schedule/new', component: ScheduleBuilderComponent },
  { path: 'schedule/edit/:id', component: ScheduleBuilderComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
