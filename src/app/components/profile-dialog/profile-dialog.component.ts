import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Auth } from '@angular/fire/auth';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { User } from '../../models/user.model';

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
  private sanitizer: DomSanitizer = inject(DomSanitizer);

  form!: FormGroup;
  url: string = this.auth.currentUser?.photoURL || '';
  image: SafeUrl = this.auth.currentUser?.photoURL || '';

  ngOnInit(): void {
    this.image = this.sanitizer.bypassSecurityTrustUrl(this.url);
    console.log('image: ', this.image);
    this.form = this.fb.group({
      firstName: [this.data.user.first_name, Validators.required],
      lastName: [this.data.user.last_name, Validators.required],
      email: [this.data.user.email, [Validators.required, Validators.email]],
      preferences: [this.data.user.preferences],
    });
  }

  save(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
