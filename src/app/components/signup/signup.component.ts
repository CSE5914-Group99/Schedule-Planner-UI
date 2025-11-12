import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BackendService } from '../../services/backend.service';
import { AuthService } from '../../services/auth.service';
import { Auth } from '@angular/fire/auth';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
  <div class="signup-shell">
    <mat-card class="signup-card">
      <div class="header">
        <img *ngIf="photoUrl" [src]="photoUrl" class="avatar" alt="profile"/>
        <div class="titles">
          <h2>Create your account</h2>
          <p class="muted" *ngIf="googleEmail">Signed in with {{ googleEmail }}</p>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
        <mat-form-field appearance="fill">
          <mat-label>First name</mat-label>
          <input matInput formControlName="firstName" />
          <mat-error *ngIf="firstNameControl?.hasError('required')">First name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Last name</mat-label>
          <input matInput formControlName="lastName" />
          <mat-error *ngIf="lastNameControl?.hasError('required')">Last name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill" class="col-span-2">
          <mat-label>Username</mat-label>
          <input matInput formControlName="username" />
          <mat-hint>Letters, numbers, underscores; 3–30 chars</mat-hint>
          <mat-error *ngIf="usernameControl?.hasError('required')">Username is required</mat-error>
          <mat-error *ngIf="usernameControl?.hasError('minlength')">Username too short</mat-error>
          <mat-error *ngIf="usernameControl?.hasError('maxlength')">Username too long</mat-error>
          <mat-error *ngIf="usernameControl?.hasError('pattern')">Invalid characters</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill" class="col-span-2">
          <mat-label>Email (optional)</mat-label>
          <input matInput formControlName="email" />
          <mat-error *ngIf="emailControl?.hasError('email')">Enter a valid email</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill" class="col-span-2">
          <mat-label>Birthday</mat-label>
          <input matInput type="date" formControlName="dateOfBirth" />
        </mat-form-field>

        <div class="actions col-span-2">
          <button mat-stroked-button type="button" (click)="cancel()">Cancel</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || loading">
            <mat-spinner *ngIf="loading" diameter="18"></mat-spinner>
            <span *ngIf="!loading">Create account</span>
          </button>
        </div>
      </form>

      <div *ngIf="message" class="message" [class.error]="error">{{ message }}</div>
    </mat-card>
  </div>
  `,
  styles: [
    `
    .signup-shell { display:flex; align-items:center; justify-content:center; min-height:70vh; padding:16px; }
    .signup-card { width:100%; max-width:720px; }
    .header { display:flex; align-items:center; gap:16px; margin-bottom:8px; }
    .avatar { width:48px; height:48px; border-radius:50%; object-fit:cover; }
    .muted { color:#6b7280; margin:0; }
    .form-grid { display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; }
    .col-span-2 { grid-column: span 2; }
    .actions { display:flex; gap:12px; justify-content:flex-end; margin-top:8px; }
    .message { margin-top:12px; color:#16a34a; }
    .message.error { color:#dc2626; }
    @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } .col-span-2 { grid-column: span 1; } }
    `,
  ],
})
export class SignupComponent implements OnInit {
  private fb = inject(FormBuilder);
  private backend = inject(BackendService);
  private router = inject(Router);
  private auth = inject(Auth);
  private authService = inject(AuthService);

  form!: FormGroup;
  message = '';
  error = false;
  loading = false;
  googleEmail: string | null = null;
  photoUrl: string | null = null;

  get firstNameControl() { return this.form.get('firstName'); }
  get lastNameControl() { return this.form.get('lastName'); }
  get usernameControl() { return this.form.get('username'); }
  get emailControl() { return this.form.get('email'); }

  ngOnInit(): void {
    const pending = this._readPendingFirebase();
    this.googleEmail = pending?.email || this.auth.currentUser?.email || null;
    this.photoUrl = this.auth.currentUser?.photoURL || null;

    this.form = this.fb.group({
      firstName: [pending?.displayName?.split(' ')[0] || '', Validators.required],
      lastName: [pending?.displayName?.split(' ').slice(1).join(' ') || '', Validators.required],
      username: [
        pending?.uid || '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(30), Validators.pattern(/^[A-Za-z0-9_]+$/)],
      ],
      email: [pending?.email || '', [Validators.email]],
      dateOfBirth: [null],
    });
  }

  private _readPendingFirebase() {
    try { const raw = localStorage.getItem('pendingFirebaseUser'); if (!raw) return null; return JSON.parse(raw); } catch { return null; }
  }

  submit() {
    if (this.form.invalid) return;
    this.loading = true; this.error = false; this.message = '';
    const val = this.form.value;
    const pending = this._readPendingFirebase();
    const payload: any = {
      username: val.username,
      email: (val.email || '').trim() || undefined,
      first_name: val.firstName || undefined,
      last_name: val.lastName || undefined,
      date_of_birth: val.dateOfBirth ? this._toIsoDate(val.dateOfBirth) : undefined,
      preferences: {},
      password: Math.random().toString(36).slice(2,12) + Math.random().toString(36).slice(2,8),
    };
    if (pending?.uid) payload.google_uid = pending.uid;

    this.backend.createUser(payload).subscribe({
      next: (created:any) => {
        try { this.authService.setUser({ id: created.id, email: created.email, username: created.username, google_uid: created.google_uid, first_name: created.first_name, last_name: created.last_name, date_of_birth: created.date_of_birth }); } catch {}
        this.message = 'Account created';
        this.error = false;
        this.loading = false;
        localStorage.removeItem('pendingFirebaseUser');
        this.router.navigate(['/landing']);
      },
      error: (err) => {
        console.warn('Signup error', err);
        const detail = err?.error?.detail || err?.message || 'Unknown error';
        this.message = 'Error creating account: ' + detail;
        this.error = true;
        this.loading = false;
      }
    });
  }

  cancel() { localStorage.removeItem('pendingFirebaseUser'); this.router.navigate(['/landing']); }

  private _toIsoDate(input: any): string | undefined {
    if (!input) return undefined;
    try {
      const d = new Date(input);
      if (isNaN(d.getTime())) return undefined;
      return d.toISOString().slice(0,10);
    } catch { return undefined; }
  }
}
