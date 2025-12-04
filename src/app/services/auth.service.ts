import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { User } from '../models/user.model';
import { BackendService } from './backend.service';
import { MatDialog } from '@angular/material/dialog';
import { UserDialogComponent } from '../components/user-dialog/user-dialog.component';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User>({ google_uid: '' });
  public currentUser$ = this.currentUserSubject.asObservable();

  private readonly backendService = inject(BackendService);
  private readonly dialog = inject(MatDialog);
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          this.currentUserSubject.next(user);
        } catch (e) {
          console.error('Failed to parse stored user', e);
        }
      }
    }
  }

  setUser(user: User) {
    this.currentUserSubject.next(user);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
  }

  getUser(): User {
    return this.currentUserSubject.value;
  }

  checkIfExists(): boolean {
    const currentUser = this.getUser();
    if (currentUser.google_uid === '') {
      console.log('No Google UID found for current user.');
      return false;
    }
    const response = this.backendService.getUserByGoogleUid(currentUser.google_uid || '');
    response.subscribe({
      next: (user: User) => {
        this.setUser(user);
        console.log('User found:', user);
        return true;
      },
      error: () => {
        this.createUser(currentUser);
      },
    });
    return false;
  }

  createUser(user: User): User {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '400px',
      data: { mode: 'create', user },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('User saved:', result);
        const response = this.backendService.createUser(result);
        response.subscribe({
          next: (created: User) => {
            this.setUser(created);
          },
          error: (err) => {
            console.error('Error creating user:', err);
          },
        });
      }
    });
    return this.getUser();
  }
}
