export interface Course {
  course_id: string;
  score: number;
  credit_hours: number;
  summary: string;
  time_load: number;
  rigor: number;
  assessment_intensity: number;
  project_intensity: number;
  pace: number;
  pre_reqs: string[];
  co_reqs: string[];
  tags: string[];
  evidence_snippets: string[];
  confidence: number;
}

export interface Activity {
  activity_id?: string;
  description: string;
  beginning_time: string;
  ending_time: string;
  days: string[];
}

export interface Schedule {
  schedule_id: string;
  courses?: Course[];
  activities?: Activity[];
  overall_score: number;
  favorited: boolean;
}
