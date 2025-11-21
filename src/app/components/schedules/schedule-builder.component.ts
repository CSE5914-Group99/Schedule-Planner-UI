import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ScheduleService } from '../../services/schedule.service';
import { AuthService } from '../../services/auth.service';
import {
  Course,
  Event,
  DayOfWeek,
  ScheduleItem,
  Term,
  Campus,
  Schedule,
} from '../../models/schedule.model';
import { CourseDialogComponent } from './course-dialog.component';
import { EventDialogComponent } from './event-dialog.component';
import { ScheduleAnalyzerComponent } from './schedule-analyzer/schedule-analyzer.component';
import { BackendService } from '../../services/backend.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-schedule-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CourseDialogComponent,
    EventDialogComponent,
    ScheduleAnalyzerComponent,
  ],
  templateUrl: './schedule-builder.component.html',
  styleUrls: ['./schedule-builder.component.scss'],
})
export class ScheduleBuilderComponent implements OnInit {
  private scheduleService = inject(ScheduleService);
  private authService = inject(AuthService);
  private backendService = inject(BackendService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  schedule = this.scheduleService.currentSchedule;
  hasUnsavedChanges = this.scheduleService.hasUnsavedChanges;

  // Dialog state
  showCourseDialog = signal(false);
  showEventDialog = signal(false);
  showAnalyzer = signal(false);
  editingCourse = signal<Course | null>(null);
  editingEvent = signal<Event | null>(null);
  // Calendar configuration
  days: DayOfWeek[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  timeSlots = signal<string[]>([]);

  // View configuration
  startHour = signal(8);
  endHour = signal(20);
  showWeekend = signal(false);

  // Computed properties
  visibleDays = computed(() => (this.showWeekend() ? this.days : this.days.slice(0, 5)));

  // All schedule items (courses + events) for display
  allItems = computed(() => {
    const sched = this.schedule();
    if (!sched) return [];

    const items: ScheduleItem[] = [];

    // Add courses
    sched.courses.forEach((course) => {
      // Combine instructor and section for display
      let details = course.instructor || '';
      if (course.session) {
        details += details ? ` • Sec ${course.session}` : `Sec ${course.session}`;
      }

      items.push({
        id: course.id || '',
        title: course.courseId,
        type: 'course',
        courseId: course.courseId,
        instructor: details,
        startTime: course.startTime || '',
        endTime: course.endTime || '',
        repeatDays: course.repeatDays || [],
      });
    });

    // Add events
    sched.events.forEach((event) => {
      items.push({
        id: event.id || '',
        title: event.title,
        type: 'event',
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        repeatDays: event.repeatDays,
      });
    });

    return items;
  });

  saving = signal(false);
  generating = signal(false);
  analyzing = signal(false);
  errorMessage = signal<string | null>(null);
  showSuccessMessage = signal(false);

  // Generated schedules state
  generatedSchedules = signal<Schedule[]>([]);
  originalSchedule = signal<Schedule | null>(null);
  isGeneratedMode = signal(false);
  selectedGeneratedIndex = signal(0);

  //Campus/term
  campuses: Campus[] = ['Columbus', 'Lima', 'Mansfield', 'Marion', 'Newark', 'Wooster'];
  terms: Term[] = ['Summer 2025', 'Autumn 2025', 'Spring 2026'];

  selectedCampus = signal<Campus>('Columbus');
  selectedTerm = signal<Term>('Summer 2025');

  ngOnInit() {
    this.generateTimeSlots();
    this.loadSchedule();
    this.scheduleService.refreshSchedules();
  }

  loadSchedule() {
    const user = this.authService.getUser();
    if (!user || !user.google_uid) {
      this.router.navigate(['/login']);
      return;
    }

    const scheduleId = this.route.snapshot.paramMap.get('id');

    if (scheduleId && scheduleId !== 'new') {
      // Load existing schedule
      this.scheduleService.loadSchedule(Number(scheduleId));

      if (!this.schedule()) {
        // Schedule not found, redirect to list
        this.router.navigate(['/schedules']);
      }
    } else {
      // Create new schedule - the service will use 'My New Schedule' as default
      this.scheduleService.createNewSchedule();
    }
  }

  generateTimeSlots() {
    const slots: string[] = [];
    for (let hour = this.startHour(); hour <= this.endHour(); hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    this.timeSlots.set(slots);
  }

  updateTimeRange() {
    this.generateTimeSlots();
  }

  toggleWeekend() {
    this.showWeekend.set(!this.showWeekend());
  }

  // Check if an item appears in a specific time slot and day
  getItemsInSlot(day: DayOfWeek, timeSlot: string): ScheduleItem[] {
    console.log(this.schedule);
    const items = this.allItems();
    const [slotHour, slotMinute] = timeSlot.split(':').map(Number);
    const slotStart = slotHour * 60 + slotMinute;
    const slotEnd = slotStart + 60; // Assuming 1 hour slots

    return items.filter((item) => {
      // Check if item occurs on this day
      if (!item.repeatDays.includes(day)) return false;

      // Parse item times
      if (!item.startTime || !item.endTime) return false;

      const [startHour, startMinute] = item.startTime.split(':').map(Number);

      const itemStart = startHour * 60 + startMinute;

      // Check if item starts in this slot
      return itemStart >= slotStart && itemStart < slotEnd;
    });
  }

  // Calculate span of item across time slots
  calculateItemSpan(item: ScheduleItem): number {
    const [startHour, startMinute] = item.startTime.split(':').map(Number);
    const [endHour, endMinute] = item.endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const durationMinutes = endMinutes - startMinutes;

    return Math.ceil(durationMinutes / 60);
  }

  // Calendar item click handlers
  onItemClick(item: ScheduleItem, event: MouseEvent) {
    event.stopPropagation();

    if (item.type === 'course') {
      const course = this.schedule()?.courses.find((c) => c.id === item.id);
      if (course) {
        this.editCourse(course);
      }
    } else {
      const evt = this.schedule()?.events.find((e) => e.id === item.id);
      if (evt) {
        this.editEvent(evt);
      }
    }
  }

  onSlotClick(day: DayOfWeek, timeSlot: string) {
    // Quick add dialog could be implemented here
    console.log('Slot clicked:', day, timeSlot);
  }

  // Course management
  openCourseDialog() {
    this.editingCourse.set(null);
    this.showCourseDialog.set(true);
  }

  editCourse(course: Course) {
    this.editingCourse.set({ ...course });
    this.showCourseDialog.set(true);
  }

  closeCourseDialog() {
    this.showCourseDialog.set(false);
    this.editingCourse.set(null);
  }

  saveCourse(course: Course) {
    if (course.id) {
      this.scheduleService.updateCourse(course.id, course);
    } else {
      this.scheduleService.addCourse(course);
    }
    this.closeCourseDialog();
  }

  deleteCourse(courseId: string) {
    if (confirm('Are you sure you want to delete this course?')) {
      this.scheduleService.deleteCourse(courseId);
      this.closeCourseDialog();
    }
  }

  // Event management
  openEventDialog() {
    this.editingEvent.set(null);
    this.showEventDialog.set(true);
  }

  editEvent(event: Event) {
    this.editingEvent.set({ ...event });
    this.showEventDialog.set(true);
  }

  closeEventDialog() {
    this.showEventDialog.set(false);
    this.editingEvent.set(null);
  }

  saveEvent(event: Event) {
    if (event.id) {
      this.scheduleService.updateEvent(event.id, event);
    } else {
      this.scheduleService.addEvent(event);
    }
    this.closeEventDialog();
  }

  deleteEvent(eventId: string) {
    if (confirm('Are you sure you want to delete this event?')) {
      this.scheduleService.deleteEvent(eventId);
      this.closeEventDialog();
    }
  }

  getCourseDifficulty(itemId: string): number | null {
    const sched = this.schedule();
    if (!sched) return null;
    const course = sched.courses.find((c) => c.id === itemId);
    return course?.difficultyRating || null;
  }

  getDifficultyClass(score: number): string {
    if (score >= 80) return 'difficulty-very-hard';
    if (score >= 60) return 'difficulty-hard';
    if (score >= 40) return 'difficulty-moderate';
    return 'difficulty-easy';
  }

  // Analyzer
  openAnalyzer() {
    if (this.isGeneratedMode()) {
      const schedules = this.generatedSchedules();
      // Check if any schedule needs analysis (heuristic: score is 0)
      const needsAnalysis = schedules.some((s) => !s.difficultyScore || s.difficultyScore === 0);

      if (needsAnalysis) {
        this.analyzing.set(true);
        this.showAnalyzer.set(true); // Show panel immediately

        this.backendService.analyzeSchedules(schedules).subscribe({
          next: (analyzedSchedules) => {
            if (analyzedSchedules && analyzedSchedules.length > 0) {
              // Update the generated schedules with the analyzed versions
              this.generatedSchedules.set(analyzedSchedules);

              // Refresh the current view with the analyzed version of the selected schedule
              this.selectGeneratedSchedule(this.selectedGeneratedIndex());
            }
            this.analyzing.set(false);
          },
          error: (err) => {
            console.error('Analysis failed', err);
            this.analyzing.set(false);
            this.errorMessage.set('Failed to analyze schedules.');
          },
        });
      } else {
        this.showAnalyzer.set(true);
      }
    } else {
      const current = this.schedule();
      if (!current) return;

      // Check if analysis is needed (e.g. difficultyScore is 0 or missing)
      if (
        (!current.difficultyScore || current.difficultyScore === 0) &&
        current.courses.length > 0
      ) {
        this.analyzing.set(true);
        this.showAnalyzer.set(true); // Show panel immediately

        this.backendService.analyzeSchedules([current]).subscribe({
          next: (analyzedSchedules) => {
            if (analyzedSchedules && analyzedSchedules.length > 0) {
              const analyzed = analyzedSchedules[0];
              this.scheduleService.setCurrentSchedule(analyzed);
            }
            this.analyzing.set(false);
          },
          error: (err) => {
            console.error('Analysis failed', err);
            this.analyzing.set(false);
            this.errorMessage.set('Failed to analyze schedule.');
          },
        });
      } else {
        this.showAnalyzer.set(true);
      }
    }
  }

  // Schedule management
  updateScheduleName(name: string) {
    this.scheduleService.updateScheduleName(name);
  }

  generateSchedule() {
    const sched = this.schedule();
    if (!sched) return;

    this.generating.set(true);
    this.errorMessage.set(null);

    // Backup current schedule
    this.originalSchedule.set(JSON.parse(JSON.stringify(sched)));

    // Prepare payload
    // We keep the course details as-is. If a course has specific times/section,
    // the backend will treat it as "locked". If it only has an ID, it will be optimized.
    const courses = sched.courses.map((c) => ({
      ...c,
      campus: this.selectedCampus(),
      term: this.selectedTerm(),
    }));

    const events = sched.events;
    const term = this.selectedTerm();
    const campus = this.selectedCampus();

    this.backendService.generateSchedules(courses, term, campus, events).subscribe({
      next: (response) => {
        this.generating.set(false);
        if (response.schedules && response.schedules.length > 0) {
          this.generatedSchedules.set(response.schedules);
          this.isGeneratedMode.set(true);
          this.selectGeneratedSchedule(0);

          // Automatically open analyzer to show scores
          // this.openAnalyzer();

          this.showSuccessMessage.set(true);
          setTimeout(() => this.showSuccessMessage.set(false), 3000);
        } else {
          this.errorMessage.set(
            'No valid schedules could be generated with the given constraints.',
          );
        }
      },
      error: (err) => {
        this.generating.set(false);
        this.errorMessage.set('Failed to generate schedule. Please try again.');
        console.error('Generation error:', err);
      },
    });
  }

  selectGeneratedSchedule(index: number) {
    console.log(`Switching to generated schedule option ${index + 1}`);
    this.selectedGeneratedIndex.set(index);
    const genSched = this.generatedSchedules()[index];
    console.log('Selected schedule data:', genSched);

    const original = this.originalSchedule();

    if (!original) return;

    // Merge generated courses with original metadata (name, etc)
    const updatedSchedule = {
      ...original, // Keep original ID, Name, etc.
      courses: genSched.courses,
      events: genSched.events,
      difficultyScore: genSched.difficultyScore,
      weeklyHours: genSched.weeklyHours,
      creditHours: genSched.creditHours,
    };

    // Assign IDs and colors to new courses
    updatedSchedule.courses = updatedSchedule.courses.map((c: any, i: number) => ({
      ...c,
      id: `${Date.now()}-${i}`,
      color: this.generateColor('course', i),
    }));

    // Force a new object reference for the signal to detect change
    this.scheduleService.setCurrentSchedule({ ...updatedSchedule });
  }

  acceptGeneratedSchedule() {
    this.isGeneratedMode.set(false);
    this.generatedSchedules.set([]);
    this.originalSchedule.set(null);
    this.hasUnsavedChanges.set(true);
  }

  discardGeneratedSchedule() {
    const original = this.originalSchedule();
    if (original) {
      this.scheduleService.setCurrentSchedule(original);
    }
    this.isGeneratedMode.set(false);
    this.generatedSchedules.set([]);
    this.originalSchedule.set(null);
  }

  private generateColor(type: 'course' | 'event', index: number): string {
    const courseColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
    const eventColors = ['#06b6d4', '#6366f1', '#a855f7', '#f97316', '#14b8a6'];
    const colors = type === 'course' ? courseColors : eventColors;
    return colors[index % colors.length];
  }

  saveSchedule() {
    const sched = this.schedule();
    if (!sched) return;

    // Validate schedule name
    const trimmedName = sched.name?.trim();
    if (!trimmedName || trimmedName === '') {
      this.errorMessage.set('Please enter a schedule name before saving');

      // Focus on the name input
      setTimeout(() => {
        const nameInput = document.querySelector('.schedule-name-input') as HTMLInputElement;
        if (nameInput) {
          nameInput.focus();
          nameInput.select();
        }
      }, 100);

      return;
    }

    // Check for name conflicts
    const existingSchedules = this.scheduleService.schedules();
    const isDuplicate = existingSchedules.some(
      (s) => s.name.trim().toLowerCase() === trimmedName.toLowerCase() && s.id !== sched.id,
    );

    if (isDuplicate) {
      this.errorMessage.set(
        `A schedule with the name "${trimmedName}" already exists. Please choose a different name.`,
      );
      setTimeout(() => {
        const nameInput = document.querySelector('.schedule-name-input') as HTMLInputElement;
        if (nameInput) {
          nameInput.focus();
          nameInput.select();
        }
      }, 100);
      return;
    }

    // Warn about generic names but allow them
    const genericNames = ['untitled schedule', 'my new schedule', 'new schedule', 'schedule'];
    if (genericNames.includes(trimmedName.toLowerCase())) {
      const confirmSave = confirm(
        `The schedule name "${trimmedName}" is quite generic. Are you sure you want to use this name?`,
      );
      if (!confirmSave) {
        const nameInput = document.querySelector('.schedule-name-input') as HTMLInputElement;
        if (nameInput) {
          nameInput.focus();
          nameInput.select();
        }
        return;
      }
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    // Clone the schedule to avoid mutating the live state
    const scheduleToSave = JSON.parse(JSON.stringify(sched));

    // Manually set campus and term before saving
    scheduleToSave.campus = this.selectedCampus();
    scheduleToSave.term = this.selectedTerm();

    //also delete the id
    for (const course of scheduleToSave.courses) {
      course.campus = this.selectedCampus();
      course.term = this.selectedTerm();
      delete course.id;
    }
    for (const event of scheduleToSave.events) {
      event.campus = this.selectedCampus();
      event.term = this.selectedTerm();
      delete event.id;
    }

    scheduleToSave.createdAt = new Date().toDateString();
    scheduleToSave.updatedAt = new Date().toDateString();

    console.log('Final schedule data to save:', scheduleToSave);
    let user: User = this.authService.getUser();

    const request = scheduleToSave.id
      ? this.backendService.saveSchedule(user.google_uid, scheduleToSave)
      : this.backendService.addSchedule(user.google_uid, scheduleToSave);

    request.subscribe({
      next: (savedSchedule) => {
        this.saving.set(false);
        this.showSuccessMessage.set(true);

        // Update local schedule with saved details (ID, campus, term)
        const current = this.schedule();
        if (current) {
          const updated = {
            ...current,
            id: savedSchedule.id || current.id,
            campus: this.selectedCampus(),
            term: this.selectedTerm(),
          };
          this.scheduleService.setCurrentSchedule(updated);
        }

        // Explicitly mark as saved
        this.scheduleService.hasUnsavedChanges.set(false);

        // Hide success message after 3 seconds
        setTimeout(() => {
          this.showSuccessMessage.set(false);
        }, 3000);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set('Failed to save schedule. Please try again.');
        console.error('Save error:', err);
      },
    });

    // this.scheduleService.saveCurrentSchedule().subscribe({
    //   next: () => {
    //     this.saving.set(false);
    //     this.showSuccessMessage.set(true);

    //     // Hide success message after 3 seconds
    //     setTimeout(() => {
    //       this.showSuccessMessage.set(false);
    //     }, 3000);
    //   },
    //   error: (err) => {
    //     this.saving.set(false);
    //     this.errorMessage.set('Failed to save schedule. Please try again.');
    //     console.error('Save error:', err);
    //   },
    // });
  }

  goBack() {
    if (this.hasUnsavedChanges()) {
      const confirmLeave = confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmLeave) return;
    }
    this.router.navigate(['/schedules']);
  }

  goToList() {
    this.router.navigate(['/schedules']);
  }

  getUntimedCourses(): Course[] {
    const sched = this.schedule();
    if (!sched) return [];
    return sched.courses.filter((course) => !course.startTime || !course.endTime);
  }
}
