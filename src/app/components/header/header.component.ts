import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  inject,
  NgZone,
  OnInit,
  PLATFORM_ID,
  OnDestroy,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Auth, authState, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';
import { BackendService } from '../../services/backend.service';
import { User } from '../../models/user.model';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { UserDialogComponent } from '../user-dialog/user-dialog.component';
import { firstValueFrom, Subscription } from 'rxjs';

function randomPassword() {
  return Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8);
}

export interface CurrentUser {
  id: number;
  email?: string;
  username?: string;
  google_uid?: string;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
})
export class HeaderComponent implements OnInit, AfterViewInit, OnDestroy {
  router: Router = inject(Router);
  dialogRef: MatDialog = inject(MatDialog);
  auth: Auth = inject(Auth);
  authService: AuthService = inject(AuthService);
  cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);
  zone: NgZone = inject(NgZone);
  backendService: BackendService = inject(BackendService);
  platformId: object = inject(PLATFORM_ID);

  signedIn: boolean = false;
  currentUser: User = { google_uid: '' };
  private userSubscription: Subscription | null = null;

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        const header = document.querySelector('.header');
        if (header) {
          const height = header.getBoundingClientRect().height;
          document.documentElement.style.setProperty('--header-height', `${height}px`);
        }
      });
    }
  }

  async ngOnInit() {
    // Subscribe to AuthService user changes
    this.userSubscription = this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.signedIn = !!(user && user.google_uid);
      this.cdRef.markForCheck(); // Ensure UI updates
    });

    const user = await firstValueFrom(authState(this.auth));
    if (user) {
      // If firebase says we are logged in but AuthService doesn't know yet (e.g. refresh),
      // AuthService constructor should have loaded from localStorage.
      // If not, we might need to fetch from backend, but usually localStorage is enough.
      // The subscription above handles the update.
    }
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  homeClicked() {
    console.log('Home button clicked');
    this.router.navigate(['/landing']);
  }

  savedSchedulesClicked() {
    this.router.navigate(['/schedules']);
  }

  async signIn() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      const fbUser = result.user;

      if (!fbUser.email) {
        console.error('Login failed: No email provided by Google account.');
        return;
      }

      const payload: any = {
        google_uid: fbUser.uid,
        username: fbUser.uid,
        email: fbUser.email,
        password: randomPassword(),
      };

      this.backendService.getUserByGoogleUid(fbUser.uid).subscribe({
        next: (user: any) => {
          this.authService.setUser({
            email: user.email,
            google_uid: user.google_uid,
            first_name: user.first_name,
            last_name: user.last_name,
            preferences: user.preferences,
          });
          this.router.navigate(['/landing']);
        },
        error: (err) => {
          if (err?.status === 404) {
            this.backendService.createUser(payload).subscribe({
              next: (created: any) => {
                this.authService.setUser({
                  email: created.email,
                  google_uid: created.google_uid,
                  first_name: created.first_name,
                  last_name: created.last_name,
                  preferences: created.preferences,
                });
                this.router.navigate(['/landing']);
              },
              error: (createErr) => {
                if (createErr?.status === 409) {
                  // Race condition, try fetching again
                  this.backendService.getUserByGoogleUid(fbUser.uid).subscribe({
                    next: (user2: any) => {
                      this.authService.setUser({
                        email: user2.email,
                        google_uid: user2.google_uid,
                        first_name: user2.first_name,
                        last_name: user2.last_name,
                        preferences: user2.preferences,
                      });
                      this.router.navigate(['/landing']);
                    },
                  });
                } else {
                  console.error('Backend createUser error', createErr);
                }
              },
            });
          } else {
            console.error('Error checking user by google_uid', err);
          }
        },
      });
    } catch (error) {
      console.error('Google sign-in failed:', error);
    }
  }

  signOut() {
    console.log('Sign out button clicked');
    this.authService.setUser({ google_uid: '' });
    this.signedIn = false;
    this.currentUser = { google_uid: '' };
    this.auth.signOut().then(() => {
      this.router.navigate(['/landing']);
    });
  }

  viewProfile() {
    if (!this.signedIn || !this.currentUser.google_uid) {
      console.warn('User not ready yet');
      return;
    }

    this.dialogRef
      .open(UserDialogComponent, {
        data: { mode: 'edit', user: this.authService.getUser() },
        backdropClass: 'backdrop',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.backendService.updateUser(this.currentUser.google_uid || '', result).subscribe({
            next: (updatedUser: User) => {
              this.authService.setUser(updatedUser);
            },
            error: (err) => console.error('Error updating user:', err),
          });
        }
      });
  }

  deleteAccount() {
    let user: User = this.authService.getUser();
    this.backendService.deleteUserById(user.google_uid || '').subscribe({
      next: () => {
        this.authService.setUser({ google_uid: '' });
        this.signedIn = false;
        this.currentUser = { google_uid: '' };
        this.auth.signOut().then(() => {
          this.router.navigate(['/landing']);
        });
      },
      error: (err) => {
        console.error('Error deleting user:', err);
      },
    });
  }
}
