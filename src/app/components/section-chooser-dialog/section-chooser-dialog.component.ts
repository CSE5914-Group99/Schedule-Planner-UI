import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { Campus, Course, DayOfWeek, Term } from '../../models/schedule.model';

export interface Section {
  id: number | null;
  title: string;
  instructor: string;
  startTime: string;
  endTime: string;
  repeatDays: string[];
  campus: string;
  semester: string;
}

export interface Course2 {
  subject: string;
  course_number: string;
  term: string;
  campus: string;
  open_only: boolean;
  sections: Section[];
}

@Component({
  selector: 'app-course-chooser-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatCardModule, MatButtonModule],
  templateUrl: './section-chooser-dialog.component.html'
})
export class CourseChooserDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<CourseChooserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public course: Course2
  ) {}

  choose(section: Section) {
    // Return a Course object containing only the chosen section
    const chosenCourse: Course = this.mapSectionToCourse(section);
    this.dialogRef.close(chosenCourse);
  }

  mapSectionToCourse(section: any): Course {
  return {
    courseId: section.courseId.replace(/\s+/g, ''),
    id: section.id ?? undefined,
    title: section.title,
    instructor: section.instructor,
    startTime: section.startTime,
    endTime: section.endTime,
    type: section.type,
    difficultyRating: section.difficultyRating ?? undefined,
    mode: section.mode,
    session: section.session,
    term: section.semester as Term,
    campus: section.campus as Campus,
    repeatDays: section.repeatDays as DayOfWeek[],
  };
}
}
