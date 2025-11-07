import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, inject, PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent implements AfterViewInit {
  private platformId: object = inject(PLATFORM_ID);

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      const header = document.querySelector('.header');
      if (header) {
        const height = header.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      }
    }
  }
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
