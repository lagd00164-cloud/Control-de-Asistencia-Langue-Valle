export interface Employee {
  dni: string;
  full_name: string;
  position: string;
  photo_path?: string | null;
  photo_url?: string | null;
  enrolled_at?: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  id: string;
  dni: string;
  full_name: string;
  position?: string;
  timestamp: string;
  punctuality: string;
  in_observation: boolean;
  message?: string;
}

export interface CheckInResponse {
  status: 'success' | 'failed';
  dni?: string;
  full_name?: string;
  position?: string;
  photo_url?: string | null;
  timestamp?: string;
  timezone?: string;
  punctuality?: string;
  in_observation?: boolean;
  message: string;
  error?: string;
}

export interface HondurasTimeResponse {
  timestamp: string;
  hours: number;
  minutes: number;
  seconds: number;
  timezone: string;
  status_at_moment: string;
  in_observation_at_moment: boolean;
  thresholds: {
    very_punctual: string;
    punctual: string;
    overdue_observation: string;
    too_late: string;
  };
}

export interface ExcelEmployeeRow {
  dni: string;
  full_name: string;
  position: string;
  valid: boolean;
  error?: string;
  isExisting?: boolean;
}

export interface ExcelImportResult {
  totalParsed: number;
  validCount: number;
  invalidCount: number;
  newEmployees: number;
  updatedEmployees: number;
  rows: ExcelEmployeeRow[];
}
