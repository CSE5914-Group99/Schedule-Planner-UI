import { Component, input, output, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Course, DayOfWeek } from '../../models/schedule.model';

@Component({
  selector: 'app-course-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './course-dialog.component.html',
  styleUrls: ['./course-dialog.component.scss'],
})
export class CourseDialogComponent implements OnInit {
  course = input<Course | null>(null);
  save = output<Course>();
  delete = output<string>();
  cancel = output<void>();

  // Form state
  title = signal('');
  courseId = signal('');
  instructor = signal('');
  startTime = signal('08:00');
  endTime = signal('09:00');
  selectedDays = signal<Set<DayOfWeek>>(new Set());

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
  currentCourseId = signal<string | undefined>(undefined);

  ngOnInit() {
    const courseData = this.course();
    if (courseData) {
      this.isEdit.set(true);
      this.currentCourseId.set(courseData.id);
      this.title.set(courseData.title || '');
      this.courseId.set(courseData.courseId);
      this.instructor.set(courseData.instructor || '');
      this.startTime.set(courseData.startTime || '08:00');
      this.endTime.set(courseData.endTime || '09:00');
      this.selectedDays.set(new Set(courseData.repeatDays || []));
    }
  }

  toggleDay(day: DayOfWeek) {
    const days = new Set(this.selectedDays());
    if (days.has(day)) {
      days.delete(day);
    } else {
      days.add(day);
    }
    this.selectedDays.set(days);
  }

  isDaySelected(day: DayOfWeek): boolean {
    return this.selectedDays().has(day);
  }

  onSave() {
    if (!this.courseId().trim()) {
      alert('Please enter a course ID');
      return;
    }

    if (this.selectedDays().size === 0) {
      alert('Please select at least one day');
      return;
    }

    const course: Course = {
      id: this.currentCourseId(),
      title: this.title().trim() || this.courseId().trim(),
      courseId: this.courseId().trim(),
      instructor: this.instructor().trim() || undefined,
      startTime: this.startTime(),
      endTime: this.endTime(),
      repeatDays: Array.from(this.selectedDays()),
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
