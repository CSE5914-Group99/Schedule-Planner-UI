import { Component, input, output, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Course, DayOfWeek } from '../../models/schedule.model';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-course-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCheckboxModule],
  templateUrl: './course-dialog.component.html',
  styleUrls: ['./course-dialog.component.scss'],
})
export class CourseDialogComponent implements OnInit {
  course = input<Course | null>(null);
  save = output<Course>();
  delete = output<string>();
  cancel = output<void>();

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

    const course: Course = {
      id: this.currentCourseId(),
      courseId: this.courseId().trim(),
      instructor: this.instructor().trim() || undefined,
      session: this.sectionNumber().valueOf() || undefined,
    };

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
