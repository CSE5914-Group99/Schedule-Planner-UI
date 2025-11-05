import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class BackendService {
  readonly base_url: string  = "http://g99project.ue.r.appspot.com"
  http: HttpClient = inject(HttpClient);

  testEndpoint(): Observable<any> {
    return this.http.get<any>(this.base_url);
  }
}
