import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Course, DayOfWeek, Schedule, Event } from '../../models/schedule.model';

@Component({
  selector: 'app-weekly-schedule',
  standalone: true,
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

  constructor() {
    const course1: Course = {
      id: '1',
      title: 'Introduction to Computer Science',
      courseId: 'CSE101',
      instructor: 'Dr. Smith',
      startTime: '09:00',
      endTime: '10:30',
      repeatDays: ['Monday', 'Wednesday', 'Friday'],
    };
    const course2: Course = {
      id: '2',
      title: 'Calculus I',
      courseId: 'MATH101',
      instructor: 'Prof. Johnson',
      startTime: '10:30',
      endTime: '12:00',
      repeatDays: ['Tuesday', 'Thursday'],
    };
    const course3: Course = {
      id: '3',
      title: 'English Literature',
      courseId: 'ENG201',
      instructor: 'Dr. Brown',
      startTime: '13:00',
      endTime: '14:30',
      repeatDays: ['Monday', 'Wednesday'],
    };
    const course4: Course = {
      id: '4',
      title: 'Physics II',
      courseId: 'PHY202',
      instructor: 'Dr. Taylor',
      startTime: '15:00',
      endTime: '16:30',
      repeatDays: ['Tuesday', 'Thursday'],
    };
    const course5: Course = {
      id: '5',
      title: 'World History',
      courseId: 'HIS150',
      instructor: 'Prof. Davis',
      startTime: '11:00',
      endTime: '12:30',
      repeatDays: ['Friday'],
    };

    const event1: Event = {
      id: '1',
      title: 'Study Group',
      description: 'Group study session for upcoming exams',
      startTime: '17:00',
      endTime: '18:00',
      repeatDays: ['Wednesday'],
    };

    const event2: Event = {
      id: '2',
      title: 'Team Meeting',
      description: 'Weekly project team sync-up',
      startTime: '09:00',
      endTime: '10:00',
      repeatDays: ['Monday'],
    };

    const event3: Event = {
      id: '3',
      title: 'Guest Lecture',
      description: 'Special talk on modern AI trends',
      startTime: '14:00',
      endTime: '15:30',
      repeatDays: ['Thursday'],
    };

    const event4: Event = {
      id: '4',
      title: 'Workshop',
      description: 'Hands-on coding workshop',
      startTime: '11:00',
      endTime: '12:30',
      repeatDays: ['Saturday'],
    };

    const event5: Event = {
      id: '5',
      title: 'Club Social',
      description: 'Casual gathering for student club members',
      startTime: '16:00',
      endTime: '17:30',
      repeatDays: ['Friday'],
    };

    this.schedule = {
      id: 0,
      name: 'Sample Schedule',
      favorite: true,
      courses: [course1, course2, course3, course4, course5],
      events: [event1, event2, event3, event4, event5],
      difficultyScore: 0,
      createdAt: '',
      updatedAt: '',
    };
  }

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
}
