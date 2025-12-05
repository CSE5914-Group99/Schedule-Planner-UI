import { CommonModule } from '@angular/common';
import { Component, Input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Course, DayOfWeek, Schedule } from '../../models/schedule.model';

@Component({
  selector: 'app-weekly-schedule',
  imports: [FormsModule, CommonModule],
  templateUrl: './weekly-schedule.component.html',
  styleUrls: ['./weekly-schedule.component.scss'],
})
export class WeeklyScheduleComponent {
  readonly days: DayOfWeek[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  readonly times: string[] = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
  ];

  @Input({ required: true }) schedule!: Schedule;

  /** Emitted when user clicks "More Details" on a course */
  courseDetailsRequested = output<{
    courseId: string;
    teacherName?: string;
    courseTitle?: string;
  }>();

  getDayIndex(day: DayOfWeek): number {
    return this.days.indexOf(day);
  }

  getRowStart(startTime: string): number {
    const startMin = this.parseTime(startTime);
    const index = this.lastSlotIndexAtOrBefore(startMin);

    return (index >= 0 ? index : 0) + 2;
  }

  getRowEnd(endTime: string): number {
    const endMin = this.parseTime(endTime);
    const index = this.firstSlotIndexAtOrAfter(endMin);

    return (index >= 0 ? index : this.times.length) + 2;
  }

  private lastSlotIndexAtOrBefore(minutes: number): number {
    let idx = -1;
    for (let i = 0; i < this.times.length; i++) {
      const t = this.parseTime(this.times[i]);
      if (t <= minutes) {
        idx = i;
      } else break;
    }
    return idx;
  }

  private firstSlotIndexAtOrAfter(minutes: number): number {
    for (let i = 0; i < this.times.length; i++) {
      const t = this.parseTime(this.times[i]);
      if (t >= minutes) return i;
    }
    return -1;
  }

  parseTime(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  onCourseDetailsClick(course: Course, event: MouseEvent) {
    event.stopPropagation();
    this.courseDetailsRequested.emit({
      courseId: course.courseId,
      teacherName: course.instructor,
      courseTitle: course.title,
    });
  }

  getDifficultyClass(score: number | undefined): string {
    if (score === undefined || score === null) return '';
    // Unified: <65 green, 65-70 yellow, 71-75 orange, 76-80 light red, 81-100 bright red
    if (score >= 81) return 'difficulty-bright-red';
    if (score >= 76) return 'difficulty-light-red';
    if (score >= 71) return 'difficulty-orange';
    if (score >= 65) return 'difficulty-yellow';
    return 'difficulty-green';
  }
}
