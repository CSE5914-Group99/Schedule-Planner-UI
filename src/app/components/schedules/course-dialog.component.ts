import { Component, input, output, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Campus, Course, DayOfWeek, Term } from '../../models/schedule.model';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { BackendService } from '../../services/backend.service';
import { MatDialog } from '@angular/material/dialog';
import { CourseChooserDialogComponent } from '../section-chooser-dialog/section-chooser-dialog.component';

@Component({
  selector: 'app-course-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCheckboxModule],
  templateUrl: './course-dialog.component.html',
  styleUrls: ['./course-dialog.component.scss'],
})
export class CourseDialogComponent implements OnInit {
  course = input<Course | null>(null);
  campus = input<Campus | null>(null);
  term = input<Term | null>(null);
  save = output<Course>();
  delete = output<string>();
  cancel = output<void>();
  backendService = inject(BackendService);
  dialog = inject(MatDialog);

  // Form state
  instructor = signal('');
  sectionNumber = signal(0);
  courseId = signal('');

  allDays: DayOfWeek[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  isEdit = signal(false);
  manualEntry: boolean = false;
  currentCourseId = signal<string | undefined>(undefined);

  ngOnInit() {
    const courseData = this.course();
    if (courseData) {
      this.isEdit.set(true);
      this.currentCourseId.set(courseData.courseId);
      this.courseId.set(courseData.courseId);
      this.sectionNumber.set(courseData.session || 0);
      this.instructor.set(courseData.instructor || '');
    }
    if (this.sectionNumber() != 0) {
      this.manualEntry = true;
    }
  }

  onSave() {
    if (!this.courseId().trim()) {
      alert('Please enter a course ID');
      return;
    }

    let course: Course = {
      id: this.currentCourseId(),
      courseId: this.courseId().trim(),
      instructor: this.instructor().trim() || undefined,
      session: this.sectionNumber().valueOf() || undefined,
    };
    let c = this.campus() || 'Columbus';
    let t = this.term() || 'Autumn 2025';
    this.backendService.getCoursesFromUserInput(course, c, t).subscribe({
      next: (cs: Course[]) => {
        console.log(cs);

        const dialogRef = this.dialog.open(CourseChooserDialogComponent, {
          width: '600px',
          data: cs,
        });
        console.log("jere");

        dialogRef.afterClosed().subscribe((chosen: Course | undefined) => {
          if (chosen) {
            console.log('User chose course:', chosen);
            course = chosen;
          }
        });
      },
      error: (err) => console.error(err),
    });

    this.save.emit(course);
  }

  onDelete() {
    const id = this.currentCourseId();
    if (id) {
      this.delete.emit(id);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
