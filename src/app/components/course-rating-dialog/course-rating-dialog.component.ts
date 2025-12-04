import {
  Component,
  input,
  output,
  inject,
  signal,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackendService } from '../../services/backend.service';
import { ClassScore } from '../../models/schedule.model';

@Component({
  selector: 'app-course-rating-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './course-rating-dialog.component.html',
  styleUrls: ['./course-rating-dialog.component.scss'],
})
export class CourseRatingDialogComponent implements OnInit {
  /** The course ID to fetch ratings for (e.g., "CSE2331") */
  courseId = input.required<string>();

  /** Optional instructor name for instructor-specific ratings */
  teacherName = input<string | undefined>(undefined);

  /** Optional course title to display in the header */
  courseTitle = input<string | undefined>(undefined);

  /** Emitted when the user closes the dialog */
  close = output<void>();

  private backendService = inject(BackendService);

  // Component state
  loading = signal(true);
  error = signal<string | null>(null);
  ratings = signal<ClassScore | null>(null);

  ngOnInit() {
    this.fetchRatings();
  }

  fetchRatings() {
    this.loading.set(true);
    this.error.set(null);

    const courseIdValue = this.courseId();
    const teacherNameValue = this.teacherName();

    this.backendService.getCourseRatings(courseIdValue, teacherNameValue).subscribe({
      next: (data) => {
        this.ratings.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch course ratings:', err);
        this.error.set('Unable to load course ratings. Please try again later.');
        this.loading.set(false);
      },
    });
  }

  onClose() {
    this.close.emit();
  }

  /**
   * Returns a CSS class based on the score value for color coding
   */
  getScoreClass(score: number): string {
    if (score >= 80) return 'score-very-hard';
    if (score >= 60) return 'score-hard';
    if (score >= 40) return 'score-moderate';
    return 'score-easy';
  }

  /**
   * Returns a human-readable label for the difficulty score
   */
  getDifficultyLabel(score: number): string {
    if (score >= 80) return 'Very Challenging';
    if (score >= 60) return 'Challenging';
    if (score >= 40) return 'Moderate';
    return 'Manageable';
  }

  /**
   * Formats the confidence value as a percentage
   */
  formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }

  /**
   * Returns a description for the time load value
   */
  getTimeLoadDescription(timeLoad: number): string {
    if (timeLoad <= 2) return 'Light workload';
    if (timeLoad <= 4) return 'Moderate workload';
    if (timeLoad <= 6) return 'Heavy workload';
    return 'Very heavy workload';
  }
}
