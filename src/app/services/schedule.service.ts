import { Injectable, signal, computed, inject } from '@angular/core';
import { BackendService } from './backend.service';
import { AuthService } from './auth.service';
import {
  Schedule,
  Course,
  Event,
  SchedulePayload,
  CoursePayload,
  EventPayload,
  DayOfWeek,
} from '../models/schedule.model';
import { Observable, map, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private backend = inject(BackendService);
  private auth = inject(AuthService);

  // Current schedule being edited
  currentSchedule = signal<Schedule | null>(null);

  // All user schedules
  schedules = signal<Schedule[]>([]);

  // Computed properties
  favoriteSchedule = computed(() => this.schedules().find((s) => s.favorite) || null);

  hasUnsavedChanges = signal<boolean>(false);

  // Create a new empty schedule
  createNewSchedule(name: string = 'My New Schedule'): Schedule {
    const schedule: Schedule = {
      name,
      favorite: false,
      courses: [],
      events: [],
      //difficultyScore: null
    };
    this.currentSchedule.set(schedule);
    this.hasUnsavedChanges.set(false);
    return schedule;
  }

  // Load schedule by ID
  loadSchedule(scheduleId: number): void {
    const schedule = this.schedules().find((s) => s.id === scheduleId);
    if (schedule) {
      this.currentSchedule.set(JSON.parse(JSON.stringify(schedule))); // Deep clone
      this.hasUnsavedChanges.set(false);
    }
  }

  // Set current schedule for editing
  setCurrentSchedule(schedule: Schedule): void {
    this.currentSchedule.set(JSON.parse(JSON.stringify(schedule))); // Deep clone
    this.hasUnsavedChanges.set(false);
  }

  // Add course to current schedule
  addCourse(course: Course): void {
    const current = this.currentSchedule();
    if (!current) return;

    course.id = this.generateId();
    // Assign color if not provided
    if (!course.color) {
      course.color = this.generateColor('course', current.courses.length);
    }
    current.courses.push(course);
    this.currentSchedule.set({ ...current });
    this.hasUnsavedChanges.set(true);
  }

  // Update course
  updateCourse(courseId: string, updates: Partial<Course>): void {
    const current = this.currentSchedule();
    if (!current) return;

    const index = current.courses.findIndex((c) => c.id === courseId);
    if (index >= 0) {
      current.courses[index] = { ...current.courses[index], ...updates };
      this.currentSchedule.set({ ...current });
      this.hasUnsavedChanges.set(true);
    }
  }

  // Delete course
  deleteCourse(courseId: string): void {
    const current = this.currentSchedule();
    if (!current) return;

    current.courses = current.courses.filter((c) => c.id !== courseId);
    this.currentSchedule.set({ ...current });
    this.hasUnsavedChanges.set(true);
  }

  // Add event to current schedule
  addEvent(event: Event): void {
    const current = this.currentSchedule();
    if (!current) return;

    event.id = this.generateId();
    // Assign color if not provided
    if (!event.color) {
      event.color = this.generateColor('event', current.events.length);
    }
    current.events.push(event);
    this.currentSchedule.set({ ...current });
    this.hasUnsavedChanges.set(true);
  }

  // Update event
  updateEvent(eventId: string, updates: Partial<Event>): void {
    const current = this.currentSchedule();
    if (!current) return;

    const index = current.events.findIndex((e) => e.id === eventId);
    if (index >= 0) {
      current.events[index] = { ...current.events[index], ...updates };
      this.currentSchedule.set({ ...current });
      this.hasUnsavedChanges.set(true);
    }
  }

  // Delete event
  deleteEvent(eventId: string): void {
    const current = this.currentSchedule();
    if (!current) return;

    current.events = current.events.filter((e) => e.id !== eventId);
    this.currentSchedule.set({ ...current });
    this.hasUnsavedChanges.set(true);
  }

  // Update schedule name
  updateScheduleName(name: string): void {
    const current = this.currentSchedule();
    if (!current) return;

    current.name = name;
    this.currentSchedule.set({ ...current });
    this.hasUnsavedChanges.set(true);
  }

  // Save current schedule to backend
  saveCurrentSchedule(): Observable<any> {
    const user = this.auth.currentUser();
    const schedule = this.currentSchedule();

    if (!user || !schedule) {
      throw new Error('No user or schedule to save');
    }

    const payload = this.scheduleToPayload(schedule);

    if (schedule.id) {
      // Update existing schedule - include scheduleId in payload
      const updatePayload = {
        ...payload,
        scheduleId: schedule.id,
      };
      return this.backend.saveSchedule(user.id, updatePayload).pipe(
        tap((response) => {
          console.log('Schedule updated:', response);
          this.hasUnsavedChanges.set(false);
          this.refreshSchedules();
        }),
      );
    } else {
      // Create new schedule
      return this.backend.addSchedule(user.id, payload).pipe(
        tap((response) => {
          console.log('Schedule created:', response);
          if (response.id || response.scheduleId) {
            schedule.id = response.id || response.scheduleId;
            this.currentSchedule.set({ ...schedule });
          }
          this.hasUnsavedChanges.set(false);
          this.refreshSchedules();
        }),
      );
    }
  }

  // Delete schedule
  deleteSchedule(scheduleId: number): Observable<any> {
    const user = this.auth.currentUser();
    if (!user) {
      throw new Error('No user logged in');
    }

    return this.backend.deleteSchedule(user.id, scheduleId).pipe(
      tap(() => {
        this.schedules.set(this.schedules().filter((s) => s.id !== scheduleId));

        // Clear current schedule if it was deleted
        const current = this.currentSchedule();
        if (current && current.id === scheduleId) {
          this.currentSchedule.set(null);
        }
      }),
    );
  }

  // Set schedule as favorite
  setFavorite(scheduleId: number): Observable<any> {
    const user = this.auth.currentUser();
    if (!user) {
      console.error('No user logged in');
      throw new Error('No user logged in');
    }

    console.log('Setting favorite for schedule ID:', scheduleId, 'User ID:', user.id);
    console.log('Current schedules:', this.schedules());

    // First, get the schedule to update
    const schedule = this.schedules().find((s) => s.id === scheduleId);
    if (!schedule) {
      console.error('Schedule not found in schedules array. Looking for ID:', scheduleId);
      console.log('Available schedules:', this.schedules());
      throw new Error('Schedule not found');
    }

    console.log('Found schedule to favorite:', schedule);

    // Create payload with favorite set to true
    const payload = this.scheduleToPayload(schedule);
    payload.favorite = true;

    // Include scheduleId in payload for update
    const updatePayload = {
      ...payload,
      scheduleId: scheduleId,
    };

    console.log('Sending payload to backend:', updatePayload);

    // Update the schedule with favorite flag using saveSchedule endpoint
    return this.backend.saveSchedule(user.id, updatePayload).pipe(
      tap((response) => {
        console.log('Backend response:', response);
        // Update local state: unfavorite all others and favorite this one
        const updatedSchedules = this.schedules().map((s) => ({
          ...s,
          favorite: s.id === scheduleId,
        }));
        console.log('Updated schedules:', updatedSchedules);
        this.schedules.set(updatedSchedules);
      }),
    );
  }

  // Load all schedules from backend
  refreshSchedules(): void {
    const user = this.auth.currentUser();
    if (!user) {
      console.error('No user logged in, cannot refresh schedules');
      return;
    }

    console.log('Refreshing schedules for user:', user.id);

    this.backend.getSchedules(user.id).subscribe({
      next: (data: any[]) => {
        console.log('Received schedules from backend:', data);
        const schedules = data.map((item) => this.backendToSchedule(item));
        console.log('Parsed schedules:', schedules);
        this.schedules.set(schedules);
        console.log('Favorite schedule after refresh:', this.favoriteSchedule());
      },
      error: (err) => {
        console.error('Failed to load schedules:', err);
      },
    });
  }

  // Helper: Convert Schedule to backend payload
  private scheduleToPayload(schedule: Schedule): SchedulePayload {
    const items: CoursePayload[] = schedule.courses.map((course) => ({
      courseId: course.courseId,
      sectionId: null,
      timesDays: this.formatTimesDays(course.repeatDays, course.startTime, course.endTime),
      teacherName: course.instructor,
    }));

    const activities: EventPayload[] = schedule.events.map((event) => ({
      description: event.title,
      timesDays: this.formatTimesDays(event.repeatDays, event.startTime, event.endTime),
    }));

    return {
      name: schedule.name,
      favorite: schedule.favorite, // Backend API expects 'favorite'
      items,
      activities,
    };
  }

  // Helper: Format repeatDays and times for backend
  private formatTimesDays(days: DayOfWeek[], startTime: string, endTime: string): string {
    if (!days.length) return `${startTime}-${endTime}`;
    return `${days.join(', ')} ${startTime}-${endTime}`;
  }

  // Helper: Convert backend data to Schedule
  private backendToSchedule(data: any): Schedule {
    console.log('Converting backend data to schedule:', data);

    const courses: Course[] = (data.items || []).map((item: any, index: number) => {
      const parsed = this.parseTimesDays(item.timesDays || item.times_days || '');
      return {
        id: `course-${data.scheduleId || data.id}-${index}`,
        title: item.courseId || 'Untitled Course',
        courseId: item.courseId || '',
        instructor: item.teacherName || item.teacher_name,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        repeatDays: parsed.repeatDays,
        color: this.generateColor('course', index),
      };
    });

    const events: Event[] = (data.activities || []).map((activity: any, index: number) => {
      const parsed = this.parseTimesDays(activity.timesDays || activity.times_days || '');
      return {
        id: `event-${data.scheduleId || data.id}-${index}`,
        title: activity.description || 'Untitled Event',
        description: activity.description,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        repeatDays: parsed.repeatDays,
        color: this.generateColor('event', index),
      };
    });

    const schedule: Schedule = {
      id: data.scheduleId || data.id, // Backend uses scheduleId
      name: data.name || 'Untitled',
      favorite: data.is_starred || data.favorite || false, // Backend uses is_starred
      courses,
      events,
      //: data.difficultyScore || data.difficulty_score,
      createdAt: data.createdAt || data.created_at,
      updatedAt: data.updatedAt || data.updated_at,
    };

    console.log('Converted schedule:', schedule);
    return schedule;
  }

  // Helper: Parse backend timesDays string
  private parseTimesDays(timesDays: string): {
    repeatDays: DayOfWeek[];
    startTime: string;
    endTime: string;
  } {
    const result: { repeatDays: DayOfWeek[]; startTime: string; endTime: string } = {
      repeatDays: [],
      startTime: '08:00',
      endTime: '09:00',
    };

    if (!timesDays) return result;

    // Extract time range (HH:mm-HH:mm)
    const timeMatch = timesDays.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
    if (timeMatch) {
      result.startTime = timeMatch[1].padStart(5, '0');
      result.endTime = timeMatch[2].padStart(5, '0');
    }

    // Extract days
    const daysStr = timesDays.split(/\d{1,2}:\d{2}-\d{1,2}:\d{2}/)[0].trim();
    if (daysStr) {
      const dayNames: DayOfWeek[] = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ];
      dayNames.forEach((day) => {
        if (daysStr.includes(day)) {
          result.repeatDays.push(day);
        }
      });
    }

    return result;
  }

  // Helper: Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // Helper: Generate color for items
  private generateColor(type: 'course' | 'event', index: number): string {
    const courseColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
    const eventColors = ['#06b6d4', '#6366f1', '#a855f7', '#f97316', '#14b8a6'];
    const colors = type === 'course' ? courseColors : eventColors;
    return colors[index % colors.length];
  }
}
