import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';
import { BackendService } from '../../services/backend.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent {
  private firebaseAuth = inject(Auth);
  private backend = inject(BackendService);
  private auth = inject(AuthService);
  private router = inject(Router);

  async signInExisting() {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(this.firebaseAuth, provider);
      const fbUser = result.user;
      this.backend.getUserByGoogleUid(fbUser.uid).subscribe({
        next: (user: any) => {
          try { this.auth.setUser({ id: user.id, email: user.email, username: user.username, google_uid: user.google_uid, first_name: user.first_name, last_name: user.last_name, date_of_birth: user.date_of_birth }); } catch {}
          this.router.navigate(['/landing']);
        },
        error: () => {
          const pending = { uid: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName };
            try { localStorage.setItem('pendingFirebaseUser', JSON.stringify(pending)); } catch {}
            this.router.navigate(['/signup']);
        }
      });
    } catch (e) {
      console.error('Sign-in failed', e);
    }
  }

  async startSignup() {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(this.firebaseAuth, provider);
      const fbUser = result.user;
      const pending = { uid: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName };
      try { localStorage.setItem('pendingFirebaseUser', JSON.stringify(pending)); } catch {}
      this.router.navigate(['/signup']);
    } catch (e) {
      console.error('Signup start failed', e);
    }
  }
}
