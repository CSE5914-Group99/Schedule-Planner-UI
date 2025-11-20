import { inject, Injectable } from '@angular/core';
import { User } from '../models/user.model';
import { BackendService } from './backend.service';
import { MatDialog } from '@angular/material/dialog';
import { UserDialogComponent } from '../components/user-dialog/user-dialog.component';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser: User = { id: 0 };
  private readonly backendService = inject(BackendService);
  private readonly dialog = inject(MatDialog);

  setUser(user: User) {
    this.currentUser = user;
  }

  getUser(): User {
    return this.currentUser;
  }

  checkIfExists(): boolean {
    const response = this.backendService.getUserByGoogleUid(this.currentUser.google_uid || '');
    response.subscribe({
      next: (user: User) => {
        this.currentUser = user;
        console.log('User found:', user);
        return true;
      },
      error: () => {
        return false;
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
            this.currentUser = created;
          },
          error: (err) => {
            console.error('Error creating user:', err);
          },
        });
      }
    });
    return this.currentUser;
  }
}
