import { Component, inject, OnInit, effect } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BackendService } from '../../services/backend.service';
import { AuthService } from '../../services/auth.service';
import { ScheduleService } from '../../services/schedule.service';
import { ByDayTimePipe } from '../../pipes/by-day-time.pipe';
import { ScheduleItem } from '../../models/schedule-item.model';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [FormsModule, CommonModule, ByDayTimePipe],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements OnInit {
  days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  times = [
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
  ];

  items: ScheduleItem[] = [];
  upcoming: ScheduleItem[] = [];

  // Backend health state
  health: string | null = null;
  healthLoading = false;

  // inject services
  private backend = inject(BackendService);
  private auth = inject(AuthService);
  private scheduleService = inject(ScheduleService);
  public router = inject(Router);

  // Use computed signal from service
  favoriteSchedule = this.scheduleService.favoriteSchedule;

  constructor() {
    // Use effect to react to favorite schedule changes
    effect(() => {
      const favorite = this.favoriteSchedule();
      console.log('Favorite schedule changed:', favorite);
      if (favorite) {
        this.mapScheduleToItems(favorite);
      } else {
        console.log('No favorite schedule found');
        this.items = [];
        this.upcoming = [];
      }
    });
  }

  ngOnInit() {
    console.log('Landing component initialized');
    // Load schedules from backend
    this.scheduleService.refreshSchedules();
  }

  mapScheduleToItems(schedule: any) {
    console.log('Mapping schedule to items:', schedule);
    const mapped: ScheduleItem[] = [];

    // Map courses
    schedule.courses?.forEach((course: any) => {
      console.log('Processing course:', course);
      course.repeatDays?.forEach((day: string) => {
        mapped.push({
          id: course.id || `course-${course.courseId}`,
          title: course.courseId,
          courseId: course.courseId,
          instructor: course.instructor,
          date: undefined,
          start: course.startTime,
          end: course.endTime,
          repeats: true,
          repeatDays: [day],
          type: 'class',
        });
      });
    });

    // Map events
    schedule.events?.forEach((event: any) => {
      console.log('Processing event:', event);
      event.repeatDays?.forEach((day: string) => {
        mapped.push({
          id: event.id || `event-${event.title}`,
          title: event.title,
          description: event.description,
          date: undefined,
          start: event.startTime,
          end: event.endTime,
          repeats: true,
          repeatDays: [day],
          type: 'event',
        });
      });
    });

    console.log('Mapped items:', mapped);
    this.items = mapped;
    this.calculateUpcoming();
  }

  calculateUpcoming() {
    const nowKey = new Date().toISOString().slice(0, 16);
    this.upcoming = this.items
      .filter((x) => (x.date || '') + 'T' + (x.start || '') >= nowKey)
      .sort((a, b) =>
        ((a.date || '') + (a.start || '')).localeCompare((b.date || '') + (b.start || '')),
      )
      .slice(0, 5);
  }

  // call backend health endpoint and show result
  checkBackend() {
    this.healthLoading = true;
    this.health = null;
    this.backend.testEndpoint().subscribe({
      next: (res) => {
        this.health = res.status;
        this.healthLoading = false;
      },
      error: (err) => {
        this.health = err?.message ? `Error: ${err.message}` : `Error: ${JSON.stringify(err)}`;
        this.healthLoading = false;
        console.error('Backend testEndpoint error:', err);
      },
    });
  }

  recalc() {
    /* Placeholder for future difficulty calculation */
  }
}
