export enum ActivityType {
  CLASS = '課業',
  STUDY = '讀書',
  CLUB = '社團',
  WORK = '打工',
  REST = '休息',
  COMMUTE = '通勤',
  OTHER = '其他',
}

export enum DayOfWeek {
  MON = 'Mon',
  TUE = 'Tue',
  WED = 'Wed',
  THU = 'Thu',
  FRI = 'Fri',
  SAT = 'Sat',
  SUN = 'Sun',
}

export interface ScheduleItem {
  id: string;
  name: string;
  day: DayOfWeek;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  type: ActivityType;
  note?: string;
  durationMinutes: number;
}

export interface ImportantEvent {
  date: string; // e.g., "Mon"
  time: string;
  title: string;
}

export interface AIAnalysisResult {
  // Existing Stress Analysis
  stressScore: number;
  peakStressDay: string;
  riskFactors: string[];
  suggestions: string[];
  encouragement: string;
  
  // New Smart Assistant Features
  weeklySummary: string;
  importantEvents: ImportantEvent[];
  todoList: string[];
  reminders: string[];
}

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  [ActivityType.CLASS]: '#6366f1', // Indigo
  [ActivityType.STUDY]: '#3b82f6', // Blue
  [ActivityType.CLUB]: '#f59e0b',  // Amber
  [ActivityType.WORK]: '#ef4444',  // Red
  [ActivityType.REST]: '#10b981',  // Emerald
  [ActivityType.COMMUTE]: '#64748b', // Slate
  [ActivityType.OTHER]: '#8b5cf6', // Violet
};