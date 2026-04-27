export type CardiacCondition = "cabg" | "mi" | "stent" | "valve" | "heart_failure";
export type Language = "en" | "hi";
export type CallSlot = "morning" | "medication" | "exercise" | "evening";
export type CallStatus = "initiated" | "completed" | "no_answer" | "missed" | "alert_fired";
export type SeverityFlag = "normal" | "watch" | "urgent";
export type TaskType = "medication" | "exercise" | "symptom_check" | "diet" | "vitals";

export interface Patient {
  id: string;
  name: string;
  phone: string;
  date_of_birth: string | null;
  discharge_date: string | null;
  cardiac_condition: CardiacCondition | null;
  language: Language;
  nurse_id: string | null;
  family_email: string | null;
  family_phone: string | null;
  heart_rate_threshold: number;
  call_start_hour: number;
  timezone: string;
  created_at: string;
}

export interface RecoveryPlan {
  id: string;
  patient_id: string;
  created_at: string;
  notes: string | null;
  phase: 3 | 4 | null;
}

export interface Task {
  id: string;
  plan_id: string;
  task_name: string;
  task_type: TaskType | null;
  frequency: "daily" | "twice_daily" | "as_needed" | null;
  is_alert_trigger: boolean;
  threshold_value: string | null;
  call_slot: CallSlot | null;
}

export interface ParsedResult {
  task_name: string;
  completed: boolean | null;
  notes: string;
  value_reported: string | null;
  rating: number | null;
  conclusion: string | null;
  alert_flag: SeverityFlag;
}

export interface CallLog {
  id: string;
  patient_id: string;
  call_type: CallSlot | null;
  call_slot_scheduled: string | null;
  called_at: string | null;
  status: CallStatus | null;
  language: Language | null;
  transcript: string | null;
  parsed_results: ParsedResult[] | null;
  severity_flag: SeverityFlag;
  retry_of: string | null;
}

export const CONDITION_LABELS: Record<CardiacCondition, string> = {
  cabg: "Bypass surgery (CABG)",
  mi: "Heart attack (MI)",
  stent: "Stent placement",
  valve: "Valve surgery",
  heart_failure: "Heart failure",
};

export const SLOT_LABELS: Record<CallSlot, string> = {
  morning: "Morning check-in",
  medication: "Medication check",
  exercise: "Exercise check",
  evening: "Evening wrap-up",
};
