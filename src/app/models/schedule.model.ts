export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface Course {
  courseId: string; // e.g., "CSE2331"
  id?: string;
  title?: string;
  instructor?: string;
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
  type?: string; // e.g., "Lecture", "Lab", "Recitation"
  difficultyRating?: number;
  mode?: string; // e.g., "In-person", "Online", "Hybrid"
  session?: number; // e.g., 1, 2, 3 for different sections
  repeatDays?: DayOfWeek[]; // Days this course repeats
}

export interface Event {
  id?: string;
  title: string;
  description?: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  repeatDays: DayOfWeek[]; // Days this event repeats
}

export interface Schedule {
  id?: number;
  name: string;
  favorite: boolean;
  courses: Course[];
  events: Event[];
  difficultyScore?: number;
  weeklyHours?: number;
  creditHours?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Backend API payload format for creating/updating schedules
// Try to avoid
export interface SchedulePayload {
  scheduleId?: number; // Only for updates
  name: string;
  favorite: boolean; // Backend API expects 'favorite' (converts to is_starred internally)
  items: CoursePayload[];
  activities: EventPayload[];
}

// Try to avoid
export interface CoursePayload {
  courseId: string;
  sectionId?: string | null;
  timesDays: string; // Format: "Monday, Wednesday 10:00-11:30"
  teacherName?: string;
}

// Try to avoid
export interface EventPayload {
  description: string;
  timesDays: string; // Format: "Tuesday, Thursday 14:00-15:00"
}

// Schedule item for internal use (unified type for display)
// Try to avoid
export interface ScheduleItem {
  id: string;
  title: string;
  type: 'course' | 'event';
  courseId?: string;
  instructor?: string;
  description?: string;
  startTime: string;
  endTime: string;
  repeatDays: DayOfWeek[];
  color?: string;
}

export interface ModificationRequests {
  classToReplace: string; // CSE2331
  reason: string; // e.g., "time conflict", "too difficult"
  criteria: string; // e.g., "easier CSE class, morning classes only"
}

export interface ScheduleAlterations {
  alterations: Alteration[];
  overallSummary: string; // "This alteration reduces your estimated difficulty by 2 points and saves you 2.5 hours per week."
  confidence: number; // 0.9
}

export interface Alteration {
  alterationName: string; // "Easiest Option"
  description: string; // "Replaces CSE2331 with CSE2200"
  classesToRemove: string[]; // ["CSE2331"]
  classesToAdd: Course[]; // ["CSE2200"]
  estimatedDifficultyChange: number; // -2
  estimatedTimeChange: number; // -2.5
  confidence: number; // 0.85
  warnings: string[]; // ["CSE2200 may have a time conflict with MATH2115"]
}
