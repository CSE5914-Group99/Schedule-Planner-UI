import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ScheduleService } from '../../services/schedule.service';
import { AuthService } from '../../services/auth.service';
import { Schedule } from '../../models/schedule.model';

@Component({
  selector: 'app-schedule-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule-list.component.html',
  styleUrls: ['./schedule-list.component.scss'],
})
export class ScheduleListComponent implements OnInit {
  private scheduleService = inject(ScheduleService);
  private authService = inject(AuthService);
  private router = inject(Router);

  schedules = this.scheduleService.schedules;
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  ngOnInit() {
    this.loadSchedules();
  }

  loadSchedules() {
    const user = this.authService.currentUser();
    if (!user) {
      this.router.navigate(['/']);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.scheduleService.refreshSchedules();

    // Small delay to show loading state
    setTimeout(() => {
      this.loading.set(false);
    }, 500);
  }

  createNew() {
    this.router.navigate(['/schedule/new']);
  }

  editSchedule(schedule: Schedule, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    console.log('Edit clicked for schedule:', schedule);

    if (schedule.id) {
      this.router.navigate(['/schedule/edit', schedule.id]);
    }
  }

  viewSchedule(schedule: Schedule) {
    console.log('Card clicked for schedule:', schedule);
    this.scheduleService.setCurrentSchedule(schedule);
    if (schedule.id) {
      this.router.navigate(['/schedule/edit', schedule.id]);
    }
  }

  deleteSchedule(schedule: Schedule, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    console.log('Delete clicked for schedule:', schedule);

    if (!schedule.id) return;

    const confirmDelete = confirm(`Are you sure you want to delete "${schedule.name}"?`);
    if (!confirmDelete) return;

    this.loading.set(true);
    this.scheduleService.deleteSchedule(schedule.id).subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Failed to delete schedule');
        this.loading.set(false);
        console.error('Delete error:', err);
      },
    });
  }

  toggleFavorite(schedule: Schedule, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    if (!schedule.id) {
      console.error('No schedule ID found');
      return;
    }

    console.log('Toggling favorite for schedule:', schedule);
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.scheduleService.setFavorite(schedule.id).subscribe({
      next: (response) => {
        console.log('Favorite set successfully:', response);
        this.loading.set(false);
        this.successMessage.set(`"${schedule.name}" is now your favorite schedule!`);

        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage.set(null);
        }, 3000);
      },
      error: (err) => {
        console.error('Favorite error details:', err);
        this.errorMessage.set('Failed to set favorite. Please try again.');
        this.loading.set(false);

        // Clear error message after 5 seconds
        setTimeout(() => {
          this.errorMessage.set(null);
        }, 5000);
      },
    });
  }

  getScheduleSummary(schedule: Schedule): string {
    const courseCount = schedule.courses.length;
    const eventCount = schedule.events.length;
    const parts: string[] = [];

    if (courseCount > 0) {
      parts.push(`${courseCount} course${courseCount !== 1 ? 's' : ''}`);
    }
    if (eventCount > 0) {
      parts.push(`${eventCount} event${eventCount !== 1 ? 's' : ''}`);
    }

    return parts.length > 0 ? parts.join(', ') : 'Empty schedule';
  }

  hasUnsavedSchedules(): boolean {
    return this.schedules().some((s) => !s.id);
  }

  goBack() {
    this.router.navigate(['/landing']);
  }
}
