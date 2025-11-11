// Legacy ScheduleItem interface for backward compatibility
// This is used by the landing component currently
export interface ScheduleItem {
  id: string;
  title: string;
  courseId?: string;
  instructor?: string;
  date?: string;
  startDate?: string;
  start: string;
  end: string;
  repeats?: boolean;
  repeatDays?: string[];
  type: 'class' | 'event';
  location?: string;
  description?: string;
}
