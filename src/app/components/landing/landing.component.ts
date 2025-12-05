import { Component, inject, OnInit, effect, ChangeDetectorRef, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ScheduleService } from '../../services/schedule.service';
import { ScheduleItem } from '../../models/schedule-item.model';
import { WeeklyScheduleComponent } from '../weekly-schedule/weekly-schedule.component';
import { CourseRatingDialogComponent } from '../course-rating-dialog/course-rating-dialog.component';
import { Schedule, ClassScore } from '../../models/schedule.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-landing',
  imports: [FormsModule, CommonModule, WeeklyScheduleComponent, CourseRatingDialogComponent],
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

  user: User;

  // inject services
  private auth = inject(AuthService);
  private scheduleService = inject(ScheduleService);
  public router = inject(Router);
  private cdRef = inject(ChangeDetectorRef);

  // Use computed signal from service
  favoriteSchedule = this.scheduleService.favoriteSchedule;

  // Store flattened items for upcoming calculation
  allItems: ScheduleItem[] = [];

  // Course rating dialog state
  showCourseRatingDialog = signal(false);
  ratingCourseId = signal<string | null>(null);
  ratingTeacherName = signal<string | undefined>(undefined);
  ratingCourseTitle = signal<string | undefined>(undefined);

  constructor() {
    this.user = this.auth.getUser();

    // Use effect to react to favorite schedule changes
    effect(() => {
      const favorite = this.favoriteSchedule();
      console.log('Favorite schedule changed:', favorite);
      if (favorite) {
        this.schedule = favorite;
        this.mapScheduleToItems(favorite);
      } else {
        console.log('No favorite schedule found');
        this.upcoming = [];
        this.allItems = [];
        // Reset schedule to empty/default
        this.schedule = {
          id: 0,
          name: 'New Schedule',
          favorite: false,
          courses: [],
          events: [],
          difficultyScore: 0,
          createdAt: '',
          updatedAt: '',
        };
      }
      this.cdRef.markForCheck();
    });
  }

  ngOnInit() {
    console.log('Landing component initialized');
    if (!this.user || !this.user.google_uid) {
      this.router.navigate(['/login']);
      return;
    }
    // Load schedules from backend
    this.scheduleService.refreshSchedules();
  }

  mapScheduleToItems(schedule: any) {
    console.log('Mapping schedule to items:', schedule);
    this.allItems = [];

    // Map courses
    schedule.courses?.forEach((course: any) => {
      course.repeatDays?.forEach((day: string) => {
        this.allItems.push({
          id: course.id || `course-${course.courseId}`,
          title: course.courseId,
          courseId: course.courseId,
          instructor: course.instructor,
          date: day, // Store day name in date field for now
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
      event.repeatDays?.forEach((day: string) => {
        this.allItems.push({
          id: event.id || `event-${event.title}`,
          title: event.title,
          description: event.description,
          date: day, // Store day name in date field for now
          start: event.startTime,
          end: event.endTime,
          repeats: true,
          repeatDays: [day],
          type: 'event',
        });
      });
    });

    console.log('Mapped items:', this.allItems);
    this.calculateUpcoming();
  }

  calculateUpcoming() {
    if (this.allItems.length === 0) {
      this.upcoming = [];
      return;
    }

    const daysMap: { [key: string]: number } = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    const now = new Date();
    const currentDayIndex = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Calculate minutes until next occurrence for each item
    const itemsWithDiff = this.allItems.map((item) => {
      const itemDayIndex = daysMap[item.date || ''] ?? -1;
      if (itemDayIndex === -1 || !item.start) return { item, diff: Infinity };

      const [startH, startM] = item.start.split(':').map(Number);
      const itemStartMinutes = startH * 60 + startM;

      let dayDiff = itemDayIndex - currentDayIndex;

      // If it's today but earlier, or a past day, move to next week
      if (dayDiff < 0 || (dayDiff === 0 && itemStartMinutes < currentMinutes)) {
        dayDiff += 7;
      }

      const totalMinutesDiff = dayDiff * 24 * 60 + (itemStartMinutes - currentMinutes);
      return { item, diff: totalMinutesDiff };
    });

    // Sort by time difference and take top 5
    this.upcoming = itemsWithDiff
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 5)
      .map((x) => x.item);

    this.cdRef.markForCheck();
  }

  // Course rating dialog methods
  onCourseDetailsRequested(event: {
    courseId: string;
    teacherName?: string;
    courseTitle?: string;
  }) {
    this.ratingCourseId.set(event.courseId);
    this.ratingTeacherName.set(event.teacherName);
    this.ratingCourseTitle.set(event.courseTitle);
    this.showCourseRatingDialog.set(true);
  }

  closeCourseRatingDialog() {
    this.showCourseRatingDialog.set(false);
    this.ratingCourseId.set(null);
    this.ratingTeacherName.set(undefined);
    this.ratingCourseTitle.set(undefined);
  }

  onRatingLoaded(event: { courseId: string; score: number; classScore: ClassScore }) {
    // Update the course's difficultyRating in the schedule so the color persists on calendar
    const courseIndex = this.schedule.courses.findIndex((c) => c.id === event.courseId);
    if (courseIndex !== -1) {
      this.schedule.courses[courseIndex].difficultyRating = event.score;
      // Trigger change detection
      this.schedule = { ...this.schedule };
    }
  }
}
