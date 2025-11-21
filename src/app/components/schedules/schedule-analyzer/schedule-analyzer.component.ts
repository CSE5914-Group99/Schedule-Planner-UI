import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Schedule, Course } from '../../../models/schedule.model';

@Component({
  selector: 'app-schedule-analyzer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule-analyzer.component.html',
  styleUrls: ['./schedule-analyzer.component.scss'],
})
export class ScheduleAnalyzerComponent {
  @Input({ required: true }) schedule!: Schedule;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  formatTime(course: Course): string {
    if (!course.startTime || !course.endTime) return 'Untimed';

    const days = course.repeatDays?.map((d) => d.substring(0, 3)).join(', ') || '';
    return `${days} ${course.startTime} - ${course.endTime}`;
  }
}
