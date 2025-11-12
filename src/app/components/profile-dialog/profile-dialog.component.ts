import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Auth } from '@angular/fire/auth';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { User } from '../../models/user.model';
import { BackendService } from '../../services/backend.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './profile-dialog.component.html',
  styleUrls: ['./profile-dialog.component.scss'],
})
export class ProfileDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<ProfileDialogComponent>);
  private data = inject<{ user: User }>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private auth: Auth = inject(Auth);
  private backend = inject(BackendService);
  private authService = inject(AuthService);
  private sanitizer: DomSanitizer = inject(DomSanitizer);

  form!: FormGroup;
  url: string = this.auth.currentUser?.photoURL || '';
  image: SafeUrl = this.auth.currentUser?.photoURL || '';

  ngOnInit(): void {
    this.image = this.sanitizer.bypassSecurityTrustUrl(this.url);
    const u = this.data?.user || ({} as any);
    this.form = this.fb.group({
      firstName: [u.first_name || '', Validators.required],
      lastName: [u.last_name || '', Validators.required],
      username: [u.username || '', Validators.required],
      email: [u.email || '', [Validators.email]],
      // Show preferences as JSON in the textarea for readability
      preferences: [u?.preferences ? JSON.stringify(u.preferences, null, 2) : ''],
    });
  }

  save(): void {
    if (this.form.valid) {
      const v = this.form.value;
      const appUser = this.authService.currentUser();
      if (!appUser?.id) { this.dialogRef.close(); return; }

      const payload: any = {
        first_name: (v.firstName ?? '').toString().trim(),
        last_name: (v.lastName ?? '').toString().trim(),
        username: (v.username ?? '').toString().trim(),
      };

      // Only include email if provided (avoid sending empty string which causes 422)
      const emailVal = (v.email ?? '').toString().trim();
      if (emailVal) payload.email = emailVal;

      // Preferences comes from a textarea; try to parse JSON if non-empty
      const prefText = (v.preferences ?? '').toString().trim();
      if (prefText) {
        try {
          payload.preferences = JSON.parse(prefText);
        } catch (e) {
          console.warn('Invalid JSON in preferences, not sending field');
        }
      }

      this.backend.updateUser(appUser.id, payload).subscribe({
        next: (updated: any) => {
          try {
            this.authService.setUser({
              id: updated.id,
              email: updated.email,
              username: updated.username,
              google_uid: updated.google_uid,
              first_name: updated.first_name,
              last_name: updated.last_name,
              date_of_birth: updated.date_of_birth,
            });
          } catch {}
          this.dialogRef.close(updated);
        },
        error: (err) => {
          console.warn('Failed to update user profile', err);
          this.dialogRef.close();
        },
      });
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
