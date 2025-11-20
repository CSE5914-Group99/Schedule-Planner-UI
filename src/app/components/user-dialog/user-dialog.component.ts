import { Component, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { User } from '../../models/user.model';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-user-dialog',
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
})
export class UserDialogComponent {
  userForm: FormGroup;
  data = inject<{ mode: 'create' | 'edit'; user: User }>(MAT_DIALOG_DATA);
  private fb: FormBuilder = inject(FormBuilder);
  private dialogRef: MatDialogRef<UserDialogComponent> = inject(MatDialogRef);

  constructor() {
    this.userForm = this.fb.group({
      first_name: [this.data.user.first_name || '', Validators.required],
      last_name: [this.data.user.last_name || '', Validators.required],
      preferences: [this.data.user.preferences || ''],
    });
  }

  save(): void {
    if (this.userForm.valid) {
      this.dialogRef.close(this.userForm.value);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
