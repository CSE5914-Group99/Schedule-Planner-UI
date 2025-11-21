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
import { Auth, authState, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';
import { BackendService } from '../../services/backend.service';
import { User } from '../../models/user.model';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { UserDialogComponent } from '../user-dialog/user-dialog.component';
import { firstValueFrom } from 'rxjs';

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
export class HeaderComponent implements OnInit, AfterViewInit {
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

  ngAfterViewInit() {
    setTimeout(() => {
      const header = document.querySelector('.header');
      if (header) {
        const height = header.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      }
    });
  }

  async ngOnInit() {
    const user = await firstValueFrom(authState(this.auth));
    if (user) {
      const savedUser = this.authService.getUser();
      setTimeout(() => {
        this.signedIn = true;
        this.currentUser = savedUser;
      });
    }
  }

  homeClicked() {
    console.log('Home button clicked');
    this.router.navigate(['/landing']);
  }

  savedSchedulesClicked() {
    this.router.navigate(['/schedules']);
  }

  signIn() {
    signInWithPopup(this.auth, new GoogleAuthProvider())
      .then((result) => {
        this.saveUserToService(result.user);
        this.router.navigate(['/landing']);
      })
      .catch((error) => console.error('Google sign-in failed:', error));
  }

  saveUserToService(user: any) {
    this.signedIn = !!user;
    this.currentUser = {
      google_uid: user?.uid,
      email: user?.email,
    };
    this.authService.setUser(this.currentUser);
    this.authService.checkIfExists();
    // if (this.authService.checkIfExists()) {
    //   console.log('User exists in backend');
    //   return this.backendService.getUserByGoogleUid(user.uid); // returns Observable<User>
    // } else {
    //   console.log('User does not exist in backend, creating user');
    //   return this.backendService.createUser(this.currentUser); // returns Observable<User>
    // }
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
        data: { mode: 'edit', user: this.currentUser },
        backdropClass: 'backdrop',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.backendService.updateUser(this.currentUser.google_uid || '', result).subscribe({
            next: (updatedUser: User) => {
              this.currentUser = updatedUser;
              this.authService.setUser(this.currentUser);
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
