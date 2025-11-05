import { ChangeDetectorRef, Component, inject, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Auth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from '@angular/fire/auth';
import { BackendService } from '../../services/backend.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
})
export class HeaderComponent implements OnInit {
  router: Router = inject(Router);
  dialogRef: MatDialog = inject(MatDialog);
  auth: Auth = inject(Auth);
  cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);
  zone: NgZone = inject(NgZone);
  backendService: BackendService = inject(BackendService);

  signedIn: boolean = false;

  ngOnInit() {
    onAuthStateChanged(this.auth, (user) => {
      this.zone.run(() => {
        this.signedIn = !!user;
        console.log('User:', user);

        this.cdRef.markForCheck();
      });
    });
    this.backendService.testEndpoint().subscribe({
      next: (data) => {
        console.log('Backend response:', data);
      },
      error: (error) => {
        console.error('Backend error:', error);
      }
    });
  }

  homeClicked() {
    console.log('Home button clicked');
    this.router.navigate(['/landing']);
  }

  savedSchedulesClicked() {
    console.log('Saved Schedules button clicked');
  }

  signInClicked() {
    console.log('Sign in button clicked');
    signInWithPopup(this.auth, new GoogleAuthProvider())
      .then((result) => {
        console.log('User:', result.user);
        this.cdRef.detectChanges();
        this.router.navigate(['/landing']);
      })
      .catch((error) => {
        console.error('Google sign-in failed:', error);
      });
  }

  signOutClicked() {
    console.log('Sign out button clicked');
    this.auth.signOut().then(() => {
      this.router.navigate(['/landing']);
    });
  }
}
