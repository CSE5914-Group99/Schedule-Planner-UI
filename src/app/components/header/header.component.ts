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
import { Auth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from '@angular/fire/auth';
import { BackendService } from '../../services/backend.service';
import { User } from '../../models/user.model';
import { isPlatformBrowser } from '@angular/common';
import { ProfileDialogComponent } from '../profile-dialog/profile-dialog.component';

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
  platformId: object = inject(PLATFORM_ID);

  signedIn: boolean = false;
  currentUser: User = {};

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
        this.signedIn = !!user;
        this.currentUser = {
          uid: user?.uid,
          email: user?.email,
          displayName: user?.displayName,
        };

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

  signIn() {
    signInWithPopup(this.auth, new GoogleAuthProvider())
      .then((result) => {
        console.log('User:', result.user);
        this.currentUser = {
          uid: result?.user?.uid,
          email: result?.user?.email,
          displayName: result?.user?.displayName,
        };
        console.log('Current user: ', this.currentUser);
        // this.backendService.getUser(currentUser.uid).subscribe(
        //   (response: User) => {
        //     currentUser = response;
        //   },
        //   (error) => {
        //     console.log("Error fetching the user info: ", error)
        //   }
        // );

        this.cdRef.detectChanges();
        this.router.navigate(['/landing']);
      })
      .catch((error) => {
        console.error('Google sign-in failed:', error);
      });
  }

  signOut() {
    console.log('Sign out button clicked');
    this.auth.signOut().then(() => {
      this.router.navigate(['/landing']);
    });
  }

  viewProfile() {
    this.dialogRef.open(ProfileDialogComponent, {
      data: { user: this.currentUser },
      backdropClass: 'backdrop',
    });
  }

  deleteAccount() {
    this.backendService.deleteAccount(this.currentUser.uid);
  }
}
