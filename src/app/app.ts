import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App {
  protected readonly title = signal('Schedule Planner');

  private router = inject(Router);
  private auth = inject(Auth);

  constructor() {
    // Redirect based on auth state: if not signed in -> login, otherwise -> landing
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        // if logged in and currently on login, go to landing
        if (this.router.url === '/' || this.router.url === '/login') {
          this.router.navigate(['/landing']);
        }
      } else {
        // not signed in -> always go to login
        if (this.router.url !== '/login') {
          this.router.navigate(['/login']);
        }
      }
    });
  }
}
