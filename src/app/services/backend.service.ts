import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class BackendService {
  readonly base_url: string = 'http://g99project.ue.r.appspot.com';
  http: HttpClient = inject(HttpClient);

  getUser(uid: string): Observable<User> {
    return this.http.get<User>(this.base_url + '/users/' + uid);
  }

  deleteAccount(uid: string) {
    return this.http.delete<User>(this.base_url + '/users/' + uid);
  }
}
