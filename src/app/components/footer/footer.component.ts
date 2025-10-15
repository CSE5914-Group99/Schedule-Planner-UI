import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent {
  homeClicked() {
    console.log('Home button clicked');
  }
  savedSchedulesClicked() {
    console.log('Saved Schedules button clicked');
  }
  signInClicked() {
    console.log('Sign in button clicked');
  }
  addClassClicked() {
    console.log('Add Class button clicked');
  }
  addEventClicked() {
    console.log('Add Event button clicked');
  }
}
