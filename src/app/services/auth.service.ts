import { Injectable, signal } from '@angular/core';

export interface CurrentUser {
  id: number;
  email?: string | null;
  username?: string | null;
  google_uid?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<CurrentUser | null>(null);

  setUser(user: CurrentUser) {
    this.currentUser.set(user);
    try {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } catch {}
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem('currentUser');
      if (raw) this.currentUser.set(JSON.parse(raw));
    } catch {}
  }

  clear() {
    this.currentUser.set(null);
    try {
      localStorage.removeItem('currentUser');
    } catch {}
  }
}
