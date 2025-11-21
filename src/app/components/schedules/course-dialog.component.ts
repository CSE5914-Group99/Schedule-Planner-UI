import { Component, input, output, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Campus, Course, DayOfWeek, Term } from '../../models/schedule.model';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BackendService } from '../../services/backend.service';
import { MatDialog } from '@angular/material/dialog';
import { CourseChooserDialogComponent } from '../section-chooser-dialog/section-chooser-dialog.component';

@Component({
  selector: 'app-course-dialog',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatCheckboxModule, 
    MatSelectModule, 
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './course-dialog.component.html',
  styleUrls: ['./course-dialog.component.scss'],
})
export class CourseDialogComponent implements OnInit {
  course = input<Course | null>(null);
  campus = input<Campus | null>(null);
  term = input<Term | null>(null);
  save = output<Course>();
  delete = output<string>();
  cancel = output<void>();
  backendService = inject(BackendService);
  dialog = inject(MatDialog);

  // Form state
  instructor = signal('');
  sectionNumber = signal(0);
  courseId = signal('');
  uniqueId = signal<string | undefined>(undefined);
  
  // Search state
  sections = signal<any[]>([]);
  isSearching = signal(false);
  searchError = signal<string | null>(null);

  allDays: DayOfWeek[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  isEdit = signal(false);
  manualEntry: boolean = false;
  currentCourseId = signal<string | undefined>(undefined);

  ngOnInit() {
    const courseData = this.course();
    if (courseData) {
      this.isEdit.set(true);
      this.currentCourseId.set(courseData.courseId);
      this.uniqueId.set(courseData.id);
      this.courseId.set(courseData.courseId);
      this.sectionNumber.set(courseData.session || 0);
      this.instructor.set(courseData.instructor || '');
    }
    if (this.sectionNumber() != 0) {
      this.manualEntry = true;
    }
  }

  searchCourses() {
    const cid = this.courseId().trim();
    if (!cid) {
      this.searchError.set('Please enter a course ID first');
      return;
    }

    const currentCampus = this.campus();
    const currentTerm = this.term();

    if (!currentCampus || !currentTerm) {
      this.searchError.set('Campus and Term are required for search');
      return;
    }

    this.isSearching.set(true);
    this.searchError.set(null);
    this.sections.set([]);

    // Create a temporary course object for the service call
    const tempCourse: Course = { courseId: cid };

    this.backendService.getCoursesFromUserInput(tempCourse, currentCampus, currentTerm).subscribe({
      next: (response) => {
        this.isSearching.set(false);
        if (response && response.sections) {
          this.sections.set(response.sections);
          if (response.sections.length === 0) {
            this.searchError.set('No sections found for this course');
          }
        } else {
          this.sections.set([]);
          this.searchError.set('Invalid response from server');
        }
      },
      error: (err) => {
        this.isSearching.set(false);
        console.error('Search error:', err);
        this.searchError.set('Failed to search courses. Please check the ID and try again.');
      }
    });
  }

  selectSection(section: any) {
    // Populate form with section details
    if (section.instructor) this.instructor.set(section.instructor);
    if (section.session) this.sectionNumber.set(section.session);
    
    // We might want to store other details like time/days if the Course model supports it
    // The Course model has startTime, endTime, repeatDays.
    // But the dialog doesn't expose inputs for them yet (except implicitly via manual entry maybe?)
    // The user request says "drop down sections for me to choose".
    // And "if the user choose a section then save the section's json to memory".
    
    // We should probably store the whole section object or merge it into the course being saved.
    // For now, let's just populate what we have inputs for, and maybe store the rest in a hidden way 
    // or update the onSave to use the selected section data.
    
    // Let's store the selected section in a signal or property
    this.selectedSectionData = section;
  }
  
  selectedSectionData: any = null;

  onSectionSelect(session: number) {
    const section = this.sections().find(s => s.session === session);
    if (section) {
      this.selectSection(section);
    } else {
      this.selectedSectionData = null;
      // Reset fields if needed
    }
  }

  onSave() {
    if (!this.courseId().trim()) {
      alert('Please enter a course ID');
      return;
    }

    let course: Course;

    if (this.selectedSectionData && !this.manualEntry) {
      // Use selected section data
      course = {
        id: this.uniqueId(), // Keep original ID if editing
        courseId: this.courseId().trim(),
        title: this.selectedSectionData.title, // Include title
        instructor: this.selectedSectionData.instructor,
        session: this.selectedSectionData.session,
        startTime: this.selectedSectionData.startTime,
        endTime: this.selectedSectionData.endTime,
        repeatDays: this.selectedSectionData.repeatDays,
        type: this.selectedSectionData.type,
        mode: this.selectedSectionData.mode,
        status: this.selectedSectionData.status,
        campus: this.selectedSectionData.campus,
        term: this.selectedSectionData.semester // API returns 'semester', model uses 'term' (or we map it)
      };
    } else {
      // Manual entry or no section selected
      course = {
        id: this.uniqueId(),
        courseId: this.courseId().trim(),
        title: this.courseId().trim(), // Default title to course ID for manual entry
        instructor: this.instructor().trim() || undefined,
        session: this.sectionNumber().valueOf() || undefined,
      };
    }

    // this.backendService.getCoursesFromUserInput(course, campus)

    this.save.emit(course);
  }

  onDelete() {
    const id = this.uniqueId();
    if (id) {
      this.delete.emit(id);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
