import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  homeClicked() {
    console.log('Home button clicked');
  }
  savedSchedulesClicked() {
    console.log('Saved Schedules button clicked');
  }
  signInClicked() {
    console.log('Sign in button clicked');
  }
}
