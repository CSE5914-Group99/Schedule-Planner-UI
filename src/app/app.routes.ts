import { Routes } from '@angular/router';
import { LandingPageComponent } from './components/landing-page/landing-page.component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'landing',
        pathMatch: 'full'
    },
    {
        path: 'landing',
        component: LandingPageComponent
    },
    {
        path: '**',
        redirectTo: 'landing',
        pathMatch: 'full'
    }
];
