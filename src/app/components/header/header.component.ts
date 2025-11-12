import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  inject,
  NgZone,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Auth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, User as FirebaseUser } from '@angular/fire/auth';
import { BackendService } from '../../services/backend.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { isPlatformBrowser } from '@angular/common';
import { ProfileDialogComponent } from '../profile-dialog/profile-dialog.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
})
export class HeaderComponent implements OnInit, AfterViewInit {
  router: Router = inject(Router);
  dialogRef: MatDialog = inject(MatDialog);
  auth: Auth = inject(Auth);
  cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);
  zone: NgZone = inject(NgZone);
  backendService: BackendService = inject(BackendService);
  authService: AuthService = inject(AuthService);
  platformId: object = inject(PLATFORM_ID);

  currentUser: User = {};

  // Expose auth signal to template without duplicating state
  get signedIn(): boolean {
    return !!this.authService.currentUser();
  }

  get appUser(): User | null {
    return this.authService.currentUser() as any;
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      const header = document.querySelector('.header');
      if (header) {
        const height = header.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      }
    }
  }

  ngOnInit() {
    onAuthStateChanged(this.auth, (user) => {
      this.zone.run(() => {
        if (!user) {
          // No firebase user -> clear state
          this.currentUser = {} as any;
          try { this.authService.clear(); } catch {}
          this.cdRef.markForCheck();
          return;
        }

        // There is a Firebase user. Do not treat them as fully signed-in to the app
        // until the backend confirms a corresponding user record exists.
        this.currentUser = {
          google_uid: user?.uid,
          email: user?.email,
        } as any;

        // Do not auto-login or navigate on init; only reflect local state. Users will click
        // explicit buttons on the landing page to sign in or create account.
        this.cdRef.markForCheck();
      });
    });
  }

  homeClicked() {
    console.log('Home button clicked');
    this.router.navigate(['/landing']);
  }

  savedSchedulesClicked() {
    console.log('Saved Schedules button clicked');
  }

  async signIn() {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(this.auth, provider);
      const fbUser = result.user;
      if (!fbUser || !fbUser.uid) {
        throw new Error('No Firebase user returned from Google sign-in');
      }

      const backendUser = await this.ensureBackendUser(fbUser);
      this.finalizeLogin(backendUser, fbUser);
      this.cdRef.detectChanges();
      this.router.navigate(['/landing']);
    } catch (error) {
      console.error('Google sign-in failed:', error);
    }
  }

  signOut() {
    console.log('Sign out button clicked');
    this.auth.signOut().then(() => {
      try { this.authService.clear(); } catch {}
      this.router.navigate(['/']); // go to welcome (login / signup)
    });
  }

  viewProfile() {
    const user = this.authService.currentUser();
    this.dialogRef.open(ProfileDialogComponent, {
      data: { user: user || this.currentUser },
      backdropClass: 'backdrop',
    });
  }

  deleteAccount() {
    const user = this.authService.currentUser();
    const googleUid = user?.google_uid || this.currentUser?.google_uid;
    if (googleUid) {
      this.backendService.deleteUserById(googleUid as any);
    }
  }

  private async ensureBackendUser(fbUser: FirebaseUser) {
    try {
      return await firstValueFrom(this.backendService.getUserByGoogleUid(fbUser.uid));
    } catch (err: any) {
      if (err?.status !== 404) {
        throw err;
      }
    }

    const payload = this.buildPayload(fbUser);
    try {
      return await firstValueFrom(this.backendService.createUser(payload));
    } catch (createErr: any) {
      if (createErr?.status === 409) {
        return await firstValueFrom(this.backendService.getUserByGoogleUid(fbUser.uid));
      }
      throw createErr;
    }
  }

  private finalizeLogin(user: any, fbUser: FirebaseUser) {
    if (!user) {
      throw new Error('Backend user missing during header login');
    }

    this.currentUser = {
      google_uid: user.google_uid || fbUser.uid,
      email: user.email || fbUser.email,
      username: user.username,
    } as any;

    try {
      this.authService.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
        google_uid: user.google_uid,
        first_name: user.first_name,
        last_name: user.last_name,
        date_of_birth: user.date_of_birth,
      });
    } catch {}

    try { localStorage.removeItem('pendingFirebaseUser'); } catch {}
  }

  private buildPayload(fbUser: FirebaseUser) {
    const display = (fbUser.displayName || '').trim();
    const parts = display ? display.split(/\s+/) : [];
    const first = parts[0] || null;
    const last = parts.slice(1).join(' ') || null;
    const rawEmail = fbUser.email || `${fbUser.uid}@example.com`;
    const cleanedPrefix = (rawEmail.split('@')[0] || '').replace(/[^A-Za-z0-9_]/g, '') || 'user';
    const prefix = cleanedPrefix.slice(0, 20);
    const suffix = (fbUser.uid || Math.random().toString(36).slice(2, 10)).slice(0, 6);
    const username = `${prefix}_${suffix}`.slice(0, 30);

    return {
      google_uid: fbUser.uid,
      username,
      email: rawEmail,
      password: Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 10),
      first_name: first,
      last_name: last,
      preferences: {},
    };
  }
}
