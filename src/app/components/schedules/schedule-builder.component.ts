import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ScheduleService } from '../../services/schedule.service';
import { AuthService } from '../../services/auth.service';
import { Course, Event, DayOfWeek, ScheduleItem, Term, Campus } from '../../models/schedule.model';
import { CourseDialogComponent } from './course-dialog.component';
import { EventDialogComponent } from './event-dialog.component';
import { BackendService } from '../../services/backend.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-schedule-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, CourseDialogComponent, EventDialogComponent],
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
      items.push({
        id: course.id || '',
        title: course.courseId,
        type: 'course',
        courseId: course.courseId,
        instructor: course.instructor,
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
  errorMessage = signal<string | null>(null);
  showSuccessMessage = signal(false);

  //Campus/term
  campuses: Campus[] = ['Columbus', 'Lima', 'Mansfield', 'Marion', 'Newark', 'Wooster'];
  terms: Term[] = ['Summer 2025', 'Autumn 2025', 'Spring 2026'];

  selectedCampus = signal<Campus>('Columbus');
  selectedTerm = signal<Term>('Summer 2025');

  ngOnInit() {
    this.generateTimeSlots();
    this.loadSchedule();
  }

  loadSchedule() {
    const user = this.authService.getUser();
    if (!user) {
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
    const slotTime = slotHour * 60 + slotMinute;

    return items.filter((item) => {
      // Check if item occurs on this day
      if (!item.repeatDays.includes(day)) return false;

      // Parse item times
      const [startHour, startMinute] = item.startTime.split(':').map(Number);
      const [endHour, endMinute] = item.endTime.split(':').map(Number);

      const itemStart = startHour * 60 + startMinute;
      const itemEnd = endHour * 60 + endMinute;

      // Check if slot falls within item time range
      return slotTime >= itemStart && slotTime < itemEnd;
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

  // Schedule management
  updateScheduleName(name: string) {
    this.scheduleService.updateScheduleName(name);
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

    // Manually set campus and term before saving
    sched.campus = this.selectedCampus();
    sched.term = this.selectedTerm();
    //also delete the id
    for (const course of sched.courses) {
      course.campus = this.selectedCampus();
      course.term = this.selectedTerm();
      delete course.id;
    }
    for (const event of sched.events) {
      event.campus = this.selectedCampus();
      event.term = this.selectedTerm();
      delete event.id;
    }

    sched.createdAt = new Date().toDateString();
    sched.updatedAt = new Date().toDateString();

    console.log('Final schedule data to save:', sched);
    let user: User = this.authService.getUser();
    this.backendService.addSchedule(user.google_uid, sched).subscribe({
      next: () => {
        this.saving.set(false);
        this.showSuccessMessage.set(true);

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
