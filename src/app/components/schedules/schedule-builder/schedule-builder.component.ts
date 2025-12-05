import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ScheduleService } from '../../../services/schedule.service';
import { AuthService } from '../../../services/auth.service';
import {
  Course,
  Event,
  DayOfWeek,
  ScheduleItem,
  Term,
  Campus,
  Schedule,
  ClassScore,
  ModificationRequests,
  ScheduleAlterations,
  Alteration,
} from '../../../models/schedule.model';
import { CourseDialogComponent } from '../course-dialog/course-dialog.component';
import { EventDialogComponent } from '../event-dialog/event-dialog.component';
import { ScheduleAnalyzerComponent } from '../schedule-analyzer/schedule-analyzer.component';
import { CourseRatingDialogComponent } from '../../course-rating-dialog/course-rating-dialog.component';
import { BackendService } from '../../../services/backend.service';
import { User } from '../../../models/user.model';
import { WeeklyScheduleComponent } from '../../weekly-schedule/weekly-schedule.component';
import { of } from 'rxjs';

@Component({
  selector: 'app-schedule-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CourseDialogComponent,
    EventDialogComponent,
    ScheduleAnalyzerComponent,
    CourseRatingDialogComponent,
    WeeklyScheduleComponent,
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
  showCourseRatingDialog = signal(false);
  editingCourse = signal<Course | null>(null);
  editingEvent = signal<Event | null>(null);
  ratingCourseId = signal<string | null>(null);
  ratingTeacherName = signal<string | undefined>(undefined);
  ratingCourseTitle = signal<string | undefined>(undefined);
  alterDialogVisible = signal(false);
  selectedAlterClasses = signal<Course[]>([]);
  criteriaText = signal<string>('');
  showAlterationPreview = signal(false);
  alterationOptions = signal<ScheduleAlterations | null>(null);
  selectedAlterationIndex = signal<number>(0);
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
        instructorName: course.instructor, // Original instructor name for API calls
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

  // NEW: Track if user has accepted/selected a generated schedule
  hasAcceptedSchedule = signal(false);

  // NEW: Computed property to determine if Analyze button should be enabled
  canAnalyze = computed(() => {
    // If in generated mode, user must have accepted a schedule first
    if (this.isGeneratedMode()) {
      return this.hasAcceptedSchedule();
    }
    
    // If not in generated mode, can analyze if there are courses
    const sched = this.schedule();
    return sched && sched.courses && sched.courses.length > 0;
  });

  // NEW: Helper method for tooltip text
  getAnalyzeTooltip(): string {
    if (this.analyzing()) {
      return 'Analyzing schedule...';
    }
    if (this.isGeneratedMode() && !this.hasAcceptedSchedule()) {
      return 'Please click "Keep This Schedule" first to analyze';
    }
    if (!this.schedule() || this.schedule()!.courses.length === 0) {
      return 'Add courses to analyze schedule';
    }
    return 'Analyze schedule difficulty and workload';
  }

  //Campus/term
  campuses: Campus[] = ['Columbus', 'Lima', 'Mansfield', 'Marion', 'Newark', 'Wooster'];
  terms: Term[] = ['Autumn 2025', 'Spring 2026', 'Summer 2025'];

  selectedCampus = signal<Campus>('Columbus');
  selectedTerm = signal<Term>('Autumn 2025');

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

    if (this.alterDialogVisible()) {
      if (item.type === 'course') {
        const course = this.schedule()?.courses.find((c) => c.id === item.id);
        if (course) {
          const current = this.selectedAlterClasses();
          if (!current.find((c) => c.id === course.id)) {
            this.selectedAlterClasses.set([...current, course]);
          }
        }
      }
      return;
    }

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
    // Unified color scheme: <65 green, 65-70 yellow, 71-75 orange, 76-80 light red, 81-100 bright red
    if (score >= 81) return 'difficulty-bright-red';
    if (score >= 76) return 'difficulty-light-red';
    if (score >= 71) return 'difficulty-orange';
    if (score >= 65) return 'difficulty-yellow';
    return 'difficulty-green';
  }

  // Course Rating Dialog
  openCourseRatingDialog(courseId: string, teacherName?: string, courseTitle?: string) {
    this.ratingCourseId.set(courseId);
    this.ratingTeacherName.set(teacherName);
    this.ratingCourseTitle.set(courseTitle);
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
    this.scheduleService.updateCourse(event.courseId, {
      difficultyRating: event.score,
    });
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
    this.hasAcceptedSchedule.set(false); // 🆕 NEW: Reset when generating new schedules

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

  alterSchedule() {
    this.selectedAlterClasses.set([]);
    this.criteriaText.set('');
    this.alterDialogVisible.set(true);
  }

  submitAlterRequest() {
    const sched = this.schedule();
    if (!sched) return;

    const requests: ModificationRequests[] = this.selectedAlterClasses().map((course) => ({
      classToReplace: course.courseId,
      reason: this.authService.getUser().preferences ?? '',
      criteria: this.criteriaText(),
    }));

    this.backendService.getClassRecommendations(sched, requests).subscribe({
      next: (response) => {
        console.log('Alteration submitted successfully', response);
        this.alterDialogVisible.set(false);
        this.showSuccessMessage.set(true);
        setTimeout(() => this.showSuccessMessage.set(false), 3000);
        const alterations: ScheduleAlterations = this.translateToScheduleAlterations(
          response,
          this.selectedTerm(),
          this.selectedCampus(),
        );
        this.alterationOptions.set(alterations);
        this.showAlterationPreview.set(true);
      },
      error: (err) => {
        console.error('Alteration failed', err);
        this.errorMessage.set('Failed to submit alteration request.');
      },
    });
  }

  translateToScheduleAlterations(
    backendResponse: any,
    defaultTerm: string = 'Autumn 2025',
    defaultCampus: string = 'Columbus',
  ): ScheduleAlterations {
    const alterations: Alteration[] = backendResponse.alterations.map((alt: any) => {
      // Map backend classes_to_add into Course[]
      const classesToAdd: Course[] = (alt.classes_to_add || []).map((cls: any) => {
        return {
          courseId: cls.class_id,
          id: 0,
          title: cls.class_id,
          instructor: cls.teacher,
          startTime: cls.time_slots?.[0]?.start_time ?? undefined,
          endTime: cls.time_slots?.[0]?.end_time ?? undefined,
          repeatDays: (cls.time_slots?.[0]?.repeat_days as DayOfWeek[]) ?? [],
          difficultyRating: cls.class_score?.score,
          creditHours: cls.class_score?.ch,
          ratingDetails: cls.class_score,
          term: defaultTerm as any,
          campus: defaultCampus as any,
        };
      });

      return {
        alteration_name: alt.alteration_name,
        description: alt.description,
        classes_to_remove: alt.classes_to_remove || [],
        classes_to_add: classesToAdd,
        estimated_difficulty_change: alt.estimated_difficulty_change,
        estimated_time_change: alt.estimated_time_change,
        confidence: alt.confidence,
        warnings: alt.warnings || [],
        why_recommended: alt.classes_to_add?.[0]?.why_recommended ?? '',
      };
    });

    return {
      alterations,
      overallSummary: backendResponse.overall_summary,
      confidence: backendResponse.confidence,
    };
  }

  applyAlteration(original: Schedule, alteration: any): Schedule {
    const altered = JSON.parse(JSON.stringify(original));

    // Remove classes
    altered.courses = altered.courses.filter(
    (c: any) => !alteration.classes_to_remove.some((removedId: string) => {
      const courseId = removedId.split('(')[0].split('—')[0].trim();
      return c.courseId.trim() === courseId;
    })
  );


    // Add new classes
    alteration.classes_to_add.forEach((newClass: any) => {
      altered.courses.push({
        ...newClass,
      });
    });

    return altered;
  }

  acceptAlteration() {
    const index = this.selectedAlterationIndex();
    if (index === null) {
      this.errorMessage.set('Please select an alteration option first.');
      return;
    }

    const alteration = this.alterationOptions()?.alterations[index];
    if (alteration === undefined) {
      return;
    }
    const current = this.schedule();
    if (!current) return;

    // Apply alteration: remove and add classes
    const updated = JSON.parse(JSON.stringify(current));

    // Remove classes
    if (alteration.classes_to_remove) {
      updated.courses = updated.courses.filter(
        (c: any) =>
          !alteration.classes_to_remove.some((removed: string) => removed.includes(c.courseId)),
      );
    }

    // Add classes
    if (alteration.classes_to_add) {
      alteration.classes_to_add.forEach((newClass: any, i: number) => {
        updated.courses.push({
          ...newClass,
          id: `${Date.now()}-${i}`,
          color: this.generateColor('course', i),
        });
      });
    }

    // Update current schedule
    this.scheduleService.setCurrentSchedule(updated);

    // Close preview popup
    this.showAlterationPreview.set(false);

    // Mark unsaved changes
    this.hasUnsavedChanges.set(true);

    // Show success toast
    this.showSuccessMessage.set(true);
    setTimeout(() => this.showSuccessMessage.set(false), 3000);
  }

  selectGeneratedSchedule(index: number) {
    this.selectedGeneratedIndex.set(index);
    const genSched = this.generatedSchedules()[index];

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
    this.hasAcceptedSchedule.set(true); // 🆕 NEW: Mark as accepted
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
    this.hasAcceptedSchedule.set(false); // 🆕 NEW: Reset flag
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

    if (!scheduleToSave.createdAt) {
      scheduleToSave.createdAt = new Date().toDateString();
    }
    scheduleToSave.updatedAt = new Date().toDateString();

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