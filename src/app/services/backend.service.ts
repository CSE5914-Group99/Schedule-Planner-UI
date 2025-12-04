import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../environment';
import { User } from '../models/user.model';
import {
  Campus,
  ClassScore,
  Course,
  Event,
  ModificationRequests,
  Schedule,
  ScheduleAlterations,
  Term,
} from '../models/schedule.model';

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
    modification_requests: ModificationRequests,
  ): Observable<ScheduleAlterations> {
    return this.http.post<ScheduleAlterations>(`${this.base_url}/courses/class-recommendations`, {
      schedule,
      modification_requests,
    });
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
    return this.http.get<ClassScore>(url).pipe(
      tap((result) => this.courseRatingsCache.set(cacheKey, result))
    );
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
