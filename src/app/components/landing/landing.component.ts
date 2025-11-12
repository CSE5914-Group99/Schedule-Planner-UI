import { Component, inject, OnInit, effect } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BackendService } from '../../services/backend.service';
import { AuthService } from '../../services/auth.service';
import { Auth, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';
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
  private firebaseAuth = inject(Auth);

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

    // When login state changes to a real app user, refresh schedules
    effect(() => {
      const user = this.auth.currentUser();
      if (user?.id) {
        console.log('Auth user detected on landing, refreshing schedules for user', user.id);
        this.scheduleService.refreshSchedules();
      }
    });
  }

  ngOnInit() {
    console.log('Landing component initialized');
    // If user is not signed into the app, redirect to welcome page
    const u = this.auth.currentUser();
    if (!u?.id) {
      this.router.navigate(['/']);
      return;
    }
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

  // convenience for template
  get signedIn(): boolean { return !!this.auth.currentUser(); }

  goToBuilder() { this.router.navigate(['/schedule/new']); }
  goToSchedules() { this.router.navigate(['/schedules']); }

  // Explicit sign-in flow for existing accounts
  async signInExisting() {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(this.firebaseAuth, provider);
      const fbUser = result.user;
      // Check backend; if exists, sign into app; otherwise route to signup
      this.backend.getUserByGoogleUid(fbUser.uid).subscribe({
        next: (user: any) => {
          try { this.auth.setUser({ id: user.id, email: user.email, username: user.username, google_uid: user.google_uid, first_name: user.first_name, last_name: user.last_name, date_of_birth: user.date_of_birth }); } catch {}
          this.router.navigate(['/landing']);
        },
        error: () => {
          const pending = { uid: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName };
          try { localStorage.setItem('pendingFirebaseUser', JSON.stringify(pending)); } catch {}
          this.router.navigate(['/signup']);
        }
      });
    } catch (e) {
      console.error('Sign-in failed', e);
    }
  }

  // Start signup: force account chooser then take user to /signup to fill details
  async startSignup() {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(this.firebaseAuth, provider);
      const fbUser = result.user;
      const pending = { uid: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName };
      try { localStorage.setItem('pendingFirebaseUser', JSON.stringify(pending)); } catch {}
      this.router.navigate(['/signup']);
    } catch (e) {
      console.error('Signup start failed', e);
    }
  }
}
