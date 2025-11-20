import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environment';
import { User } from '../models/user.model';
import { ModificationRequests, Schedule, ScheduleAlterations } from '../models/schedule.model';

@Injectable({
  providedIn: 'root',
})
export class BackendService {
  readonly base_url = environment.apiBaseUrl;
  http: HttpClient = inject(HttpClient);

  testEndpoint(): Observable<any> {
    return this.http.get<any>(`${this.base_url}/health`);
  }

  /**
   * Create a user on the backend. Expects the backend /users/ POST route to accept
   * an object matching UserCreate on the backend. For OAuth signups we generate a
   * random password client-side so the backend model's `password` field can be satisfied.
   */
  createUser(payload: User): Observable<any> {
    return this.http.post<any>(`${this.base_url}/users/`, payload);
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<any>(`${this.base_url}/users/${id}`);
  }

  updateUser(id: number, payload: Partial<User>): Observable<User> {
    return this.http.put<any>(`${this.base_url}/users/${id}`, payload);
  }

  deleteUserById(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base_url}/users/${id}`);
  }

  /**
   * Fetch a user by their Google UID. Backend should implement an endpoint like
   * GET /users/google/{google_uid} that returns 200 + user when found or 404 when not.
   */
  getUserByGoogleUid(googleUid: string): Observable<any> {
    return this.http.get<any>(`${this.base_url}/users/google/${encodeURIComponent(googleUid)}`);
  }

  // --- Schedule endpoints -------------------------------------------------
  getSchedules(userId: number): Observable<any> {
    return this.http.get<any>(`${this.base_url}/schedule/${userId}`);
  }

  addSchedule(userId: number, payload: any): Observable<any> {
    return this.http.post<any>(`${this.base_url}/schedule/add/${userId}`, payload);
  }

  updateSchedule(userId: number, scheduleId: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.base_url}/schedule/${userId}/${scheduleId}`, payload);
  }

  saveSchedule(userId: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.base_url}/schedule/save/${userId}`, payload);
  }

  deleteSchedule(userId: number, scheduleId: number): Observable<any> {
    return this.http.delete<any>(`${this.base_url}/schedule/${userId}/${scheduleId}`);
  }

  setFavoriteSchedule(userId: number, scheduleId: number): Observable<any> {
    return this.http.put<any>(`${this.base_url}/schedule/${userId}/${scheduleId}/favorite`, {});
  }

  // --- Course endpoints ---------------------------------------------------
  addCourseToSchedule(userId: number, scheduleId: number, course: any): Observable<any> {
    return this.http.post<any>(`${this.base_url}/schedule/${userId}/${scheduleId}/course`, course);
  }

  updateCourse(userId: number, scheduleId: number, courseId: string, course: any): Observable<any> {
    return this.http.put<any>(
      `${this.base_url}/schedule/${userId}/${scheduleId}/course/${courseId}`,
      course,
    );
  }

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

  // --- Event endpoints ----------------------------------------------------
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
