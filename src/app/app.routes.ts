import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { LoginComponent } from './components/login/login.component';
import { ScheduleListComponent } from './components/schedules/schedule-list.component';
import { ScheduleBuilderComponent } from './components/schedules/schedule-builder.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'landing', component: LandingComponent },
  { path: 'schedules', component: ScheduleListComponent },
  { path: 'schedule/new', component: ScheduleBuilderComponent },
  { path: 'schedule/edit/:id', component: ScheduleBuilderComponent },
  { path: '**', redirectTo: 'login', pathMatch: 'full' },
];
