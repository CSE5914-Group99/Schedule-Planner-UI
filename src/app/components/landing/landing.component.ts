import { Component, inject, OnInit, effect, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BackendService } from '../../services/backend.service';
import { AuthService } from '../../services/auth.service';
import { ScheduleService } from '../../services/schedule.service';
import { ScheduleItem } from '../../models/schedule-item.model';
import { WeeklyScheduleComponent } from '../weekly-schedule/weekly-schedule.component';
import { Schedule } from '../../models/schedule.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [FormsModule, CommonModule, WeeklyScheduleComponent],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements OnInit {
  schedule: Schedule = {
    id: 0,
    name: 'New Schedule',
    favorite: false,
    courses: [],
    events: [],
    difficultyScore: 0,
    createdAt: '',
    updatedAt: '',
  };

  upcoming: ScheduleItem[] = [];

  // Backend health state
  health: string | null = null;
  healthLoading = false;
  user: User;

  // inject services
  private backend = inject(BackendService);
  private auth = inject(AuthService);
  private scheduleService = inject(ScheduleService);
  public router = inject(Router);
  private cdRef = inject(ChangeDetectorRef);

  // Use computed signal from service
  favoriteSchedule = this.scheduleService.favoriteSchedule;

  constructor() {
    this.user = this.auth.getUser();
    this.backend.getFavoriteSchedule(this.user.id).subscribe({
      next: (s: Schedule) => {
        console.log('Favorite schedule loaded:', s);
        this.schedule = s;
        console.log(this.schedule);
      },
      error: (err) => {
        console.error('Error loading favorite schedule:', err);
      },
    });
    this.cdRef.markForCheck();
    // Use effect to react to favorite schedule changes
    effect(() => {
      const favorite = this.favoriteSchedule();
      console.log('Favorite schedule changed:', favorite);
      if (favorite) {
        this.mapScheduleToItems(favorite);
      } else {
        console.log('No favorite schedule found');
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
    this.calculateUpcoming();
  }

  calculateUpcoming() {
    const nowKey = new Date().toISOString().slice(0, 16);
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
