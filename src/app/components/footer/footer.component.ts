import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent implements AfterViewInit {
  private platformId: object = inject(PLATFORM_ID);
  private router: Router = inject(Router);

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
    this.router.navigate(['/landing']);
  }
  savedSchedulesClicked() {
    console.log('Saved Schedules button clicked');
  }
  addClassClicked() {
    console.log('Add Class button clicked');
  }
  addEventClicked() {
    console.log('Add Event button clicked');
  }
}
