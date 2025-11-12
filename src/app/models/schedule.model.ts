export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface Course {
  id?: string;
  title: string;
  courseId: string; // e.g., "CSE2331"
  instructor?: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  repeatDays: DayOfWeek[]; // Days this course repeats
  color?: string;
}

export interface Event {
  id?: string;
  title: string;
  description?: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  repeatDays: DayOfWeek[]; // Days this event repeats
  color?: string;
}

export interface Schedule {
  id?: number;
  name: string;
  favorite: boolean;
  courses: Course[];
  events: Event[];
  difficultyScore?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

// Backend API payload format for creating/updating schedules
export interface SchedulePayload {
  scheduleId?: number; // Only for updates
  name: string;
  favorite: boolean; // Backend API expects 'favorite' (converts to is_starred internally)
  items: CoursePayload[];
  activities: EventPayload[];
}

export interface CoursePayload {
  courseId: string;
  sectionId?: string | null;
  timesDays: string; // Format: "Monday, Wednesday 10:00-11:30"
  teacherName?: string;
}

export interface EventPayload {
  description: string;
  timesDays: string; // Format: "Tuesday, Thursday 14:00-15:00"
}

// Schedule item for internal use (unified type for display)
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
