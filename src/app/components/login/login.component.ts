import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BackendService } from '../../services/backend.service';
import { AuthService } from '../../services/auth.service';
// Use AngularFire Auth (the project already provides Auth in app.config)
import { Auth, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';

function randomPassword() {
  return Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8);
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private backend = inject(BackendService);
  private router = inject(Router);
  private auth = inject(Auth);
  private authService = inject(AuthService);

  // simple state
  loading = signal(false);
  message = signal<string | null>(null);

  constructor() {}

  async signInWithGoogle() {
    this.loading.set(true);
    this.message.set(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      const fbUser = result.user;
      // Build a payload to create the user on the backend. We include:
      // - id: the Google UID (as requested)
      // - username: also set to the Google UID to ensure uniqueness
      // - email: the Google email
      // - password: a generated value to satisfy the backend's required field
      const payload: any = {
        // Don't send numeric `id` (backend expects an integer id). Send google_uid instead.
        google_uid: fbUser.uid,
        username: fbUser.uid,
        email: fbUser.email || '',
        password: randomPassword(),
      };

      // First check whether the backend already has a user for this google_uid.
      // If the backend returns 200 we assume user exists and continue. If it
      // returns 404 we create the user. Any other error will fall back to
      // attempting create and/or proceeding to the app depending on status.
      this.backend.getUserByGoogleUid(fbUser.uid).subscribe({
        next: (user: any) => {
          // user exists -> set authService and continue
          try {
            this.authService.setUser({
              id: user.id,
              email: user.email,
              username: user.username,
              google_uid: user.google_uid,
            });
          } catch {}
          this.message.set('Signed in. Redirecting...');
          this.loading.set(false);
          this.router.navigate(['/landing']);
        },
        error: (err) => {
          const status = err?.status;
          if (status === 404) {
            // user not found -> create
            this.backend.createUser(payload).subscribe({
              next: (created: any) => {
                try {
                  const u = created || {};
                  this.authService.setUser({
                    id: u.id,
                    email: u.email,
                    username: u.username,
                    google_uid: u.google_uid,
                  });
                } catch {}
                this.message.set('Signed in. Redirecting...');
                this.loading.set(false);
                this.router.navigate(['/landing']);
              },
              error: (createErr) => {
                const createStatus = createErr?.status;
                if (createStatus === 409) {
                  // race / already created by another process; try to fetch user and proceed
                  this.backend.getUserByGoogleUid(fbUser.uid).subscribe({
                    next: (user2: any) => {
                      try {
                        this.authService.setUser({
                          id: user2.id,
                          email: user2.email,
                          username: user2.username,
                          google_uid: user2.google_uid,
                        });
                      } catch {}
                      this.message.set('Signed in. Redirecting...');
                      this.loading.set(false);
                      this.router.navigate(['/landing']);
                    },
                    error: () => {
                      this.message.set('Signed in. Redirecting...');
                      this.loading.set(false);
                      this.router.navigate(['/landing']);
                    },
                  });
                  return;
                }
                console.warn('Backend createUser error', createErr);
                // proceed to app but show a warning
                this.message.set('Signed in (backend create may have failed). Redirecting...');
                this.loading.set(false);
                this.router.navigate(['/landing']);
              },
            });
            return;
          }
          // Unexpected error when checking existence; attempt create anyway as a fallback.
          console.warn('Error checking user by google_uid', err);
          this.backend.createUser(payload).subscribe({
            next: (created: any) => {
              try {
                this.authService.setUser({
                  id: created.id,
                  email: created.email,
                  username: created.username,
                  google_uid: created.google_uid,
                });
              } catch {}
              this.message.set('Signed in. Redirecting...');
              this.loading.set(false);
              this.router.navigate(['/landing']);
            },
            error: (createErr) => {
              console.warn('Backend createUser error after fallback check', createErr);
              this.message.set('Signed in (backend create may have failed). Redirecting...');
              this.loading.set(false);
              this.router.navigate(['/landing']);
            },
          });
        },
      });
    } catch (err: any) {
      console.error('Google sign-in error', err);
      this.message.set(err?.message || String(err));
      this.loading.set(false);
    }
  }
}
