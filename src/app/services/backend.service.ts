import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../environment';
import { User } from '../models/user.model';
import {
  Alteration,
  Campus,
  ClassScore,
  Course,
  DayOfWeek,
  Event,
  ModificationRequests,
  Schedule,
  ScheduleAlterations,
  Term,
} from '../models/schedule.model';
import { mock } from 'node:test';

@Injectable({
  providedIn: 'root',
})
export class BackendService {
  readonly base_url = environment.apiBaseUrl;
  http: HttpClient = inject(HttpClient);

  // Cache for course ratings to avoid repeated API calls
  private courseRatingsCache = new Map<string, ClassScore>();

  testEndpoint(): Observable<any> {
    return this.http.get<any>(`${this.base_url}/health`);
  }

  /**
   * Create a user on the backend. Expects the backend /users/ POST route to accept
   * an object matching UserCreate on the backend. For OAuth signups we generate a
   * random password client-side so the backend model's `password` field can be satisfied.
   */
  createUser(payload: User): Observable<User> {
    return this.http.post<User>(`${this.base_url}/users/`, payload);
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.base_url}/users/${id}`);
  }

  updateUser(id: string, payload: User): Observable<User> {
    return this.http.put<User>(`${this.base_url}/users/${id}`, payload);
  }

  deleteUserById(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base_url}/users/${id}`);
  }

  /**
   * Fetch a user by their Google UID. Backend should implement an endpoint like
   * GET /users/google/{google_uid} that returns 200 + user when found or 404 when not.
   */
  getUserByGoogleUid(googleUid: string): Observable<User> {
    return this.http.get<User>(`${this.base_url}/users/google/${encodeURIComponent(googleUid)}`);
  }

  // --- Schedule endpoints -------------------------------------------------
  getSchedules(userId: string): Observable<Schedule[]> {
    return this.http.get<Schedule[]>(`${this.base_url}/schedule/${userId}`);
  }

  addSchedule(userId: string, payload: Schedule): Observable<Schedule> {
    console.log('userID', userId);
    return this.http.post<Schedule>(`${this.base_url}/schedule/add/${userId}`, payload);
  }

  updateSchedule(userId: string, scheduleId: number, payload: Schedule): Observable<Schedule> {
    return this.http.put<Schedule>(`${this.base_url}/schedule/${userId}/${scheduleId}`, payload);
  }

  saveSchedule(userId: string, payload: Schedule): Observable<Schedule> {
    return this.http.put<Schedule>(`${this.base_url}/schedule/save/${userId}`, payload);
  }

  deleteSchedule(userId: string, scheduleId: number): Observable<void> {
    return this.http.delete<void>(`${this.base_url}/schedule/${userId}/${scheduleId}`);
  }

  // I don't think this is used anywhere?
  setFavoriteSchedule(userId: string, scheduleId: number): Observable<any> {
    return this.http.put<any>(`${this.base_url}/schedule/${userId}/${scheduleId}/favorite`, {});
  }

  getFavoriteSchedule(userId: string): Observable<Schedule> {
    return this.http.get<Schedule>(`${this.base_url}/schedule/favorite/${userId}`);
  }

  // --- Course endpoints ---------------------------------------------------
  //I think these are unused too?
  addCourseToSchedule(userId: string, scheduleId: number, course: Course): Observable<any> {
    return this.http.post<any>(`${this.base_url}/schedule/${userId}/${scheduleId}/course`, course);
  }

  getCoursesFromUserInput(course: Course, campus: string, term: Term): Observable<any> {
    let subject = course.courseId.replace(/[^A-Z]/gi, '').toUpperCase();
    let number = course.courseId.replace(/[^0-9]/g, '');

    // Construct query parameters correctly
    const params = new URLSearchParams({
      subject: subject,
      course_number: number,
      campus: campus,
      term: term,
    });

    return this.http.get<any>(`${this.base_url}/course-search?${params.toString()}`);
  }

  //I think these are unused too?
  updateCourse(
    userId: string,
    scheduleId: number,
    courseId: string,
    course: Course,
  ): Observable<any> {
    return this.http.put<any>(
      `${this.base_url}/schedule/${userId}/${scheduleId}/course/${courseId}`,
      course,
    );
  }

  //I think these are unused too?
  deleteCourse(userId: number, scheduleId: number, courseId: string): Observable<any> {
    return this.http.delete<any>(
      `${this.base_url}/schedule/${userId}/${scheduleId}/course/${courseId}`,
    );
  }

  getClassRecommendations(
    schedule: Schedule,
    modification_requests: ModificationRequests[],
  ): Observable<any> {
    const payload = this.toClassRecommendationRequest(schedule, modification_requests);
    return this.http.post<any>(`${this.base_url}/courses/class-recommendations`, payload);
  }

  toClassRecommendationRequest(
    schedule: Schedule,
    modificationRequests: ModificationRequests[],
  ): any {
    const scheduleClasses = schedule.courses.map((c) => ({
      class_id: c.courseId,
      teacher: c.instructor ?? 'Unknown',
      time_slots: [
        {
          start_time: c.startTime ?? '00:00',
          end_time: c.endTime ?? '00:00',
          repeat_days: c.repeatDays ?? [],
        },
      ],
    }));

    const classScores = schedule.courses.map((c) => ({
      class_id: c.courseId,
      teacher: c.instructor ?? 'Unknown',
      score: Math.max(c.difficultyRating ?? 1, 1),
      ch: c.creditHours ?? 3,
      summary: c.title ?? `${c.courseId} — ${c.instructor ?? 'Unknown'}`,
      time_load: schedule.weeklyHours ?? 0,
      rigor: 0,
      assessment_intensity: 0,
      project_intensity: 0,
      pace: 50,
      pre_reqs: [],
      co_reqs: [],
      tags: [],
      evidence_snippets: [],
      confidence: 0.6,
    }));

    const scheduleScore = {
      difficulty: schedule.difficultyScore ?? 1,
      hours_per_week: schedule.weeklyHours ?? 0,
      credits: schedule.creditHours ?? 0,
      class_scores: classScores, // <-- array now
      total_credit_hours: schedule.creditHours ?? 0,
      num_classes: schedule.courses.length,
      summary: `${schedule.courses.length} classes, ${schedule.creditHours ?? 0} credits`,
      adjusted_difficulty: Math.max(schedule.difficultyScore ?? 1, 1),
      adjusted_assessment_intensity: 0,
      adjusted_project_intensity: 0,
      adjusted_rigor: 0,
      time_load: schedule.weeklyHours ?? 0,
      constraints: '',
      confidence: 0.6,
    };

    return {
      schedule: scheduleClasses,
      schedule_score: scheduleScore,
      modification_requests: modificationRequests.map((m) => ({
        class_to_replace: m.classToReplace ?? null,
        reason: m.reason,
        criteria: m.criteria,
      })),
    };
  }

  /**
   * Fetch detailed course ratings and difficulty analysis.
   * Results are cached to avoid repeated API calls.
   * @param courseId - The course ID (e.g., "CSE2331")
   * @param teacherName - Optional instructor name for instructor-specific ratings
   */
  getCourseRatings(courseId: string, teacherName?: string): Observable<ClassScore> {
    // Create a cache key based on courseId and teacherName
    const cacheKey = teacherName ? `${courseId}__${teacherName}` : courseId;

    // Return cached value if available
    const cached = this.courseRatingsCache.get(cacheKey);
    if (cached) {
      return of(cached);
    }

    // Otherwise fetch from API and cache the result
    let url = `${this.base_url}/courses/ratings/${encodeURIComponent(courseId)}`;
    if (teacherName) {
      const params = new URLSearchParams({ teacher_name: teacherName });
      url += `?${params.toString()}`;
    }
    return this.http
      .get<ClassScore>(url)
      .pipe(tap((result) => this.courseRatingsCache.set(cacheKey, result)));
  }

  generateSchedules(
    courses: Course[],
    term: string,
    campus: string,
    events: Event[],
    preferences: any = null,
  ): Observable<any> {
    const payload = {
      courses,
      term,
      campus,
      events,
      preferences,
    };
    return this.http.post<any>(`${this.base_url}/generate-schedule/`, payload);
  }

  analyzeSchedules(schedules: Schedule[], preferences: any = null): Observable<Schedule[]> {
    return this.http.post<Schedule[]>(`${this.base_url}/generate-schedule/analyze`, {
      schedules,
      preferences,
    });
  }

  // --- Event endpoints ----------------------------------------------------

  //I think all 3 of these are unused too?
  addEventToSchedule(userId: number, scheduleId: number, event: any): Observable<any> {
    return this.http.post<any>(`${this.base_url}/schedule/${userId}/${scheduleId}/event`, event);
  }

  updateEvent(userId: number, scheduleId: number, eventId: string, event: any): Observable<any> {
    return this.http.put<any>(
      `${this.base_url}/schedule/${userId}/${scheduleId}/event/${eventId}`,
      event,
    );
  }

  deleteEvent(userId: number, scheduleId: number, eventId: string): Observable<any> {
    return this.http.delete<any>(
      `${this.base_url}/schedule/${userId}/${scheduleId}/event/${eventId}`,
    );
  }
}
