"use server";

import { createServerClient } from "@/lib/supabase";

type TaskDraft = {
  task_name: string;
  task_type: string;
  frequency: string;
  is_alert_trigger: boolean;
  threshold_value: string;
  call_slot: string;
};

type PatientDraft = {
  name: string;
  phone: string;
  date_of_birth: string;
  discharge_date: string;
  cardiac_condition: string;
  language: string;
  family_email: string;
  family_phone: string;
  heart_rate_threshold: number;
  call_start_hour: number;
  timezone: string;
  notes: string;
  phase: number;
};

export async function savePatient(
  patient: PatientDraft,
  tasks: TaskDraft[]
): Promise<{ ok: true; patient_id: string } | { ok: false; error: string }> {
  try {
    const supabase = createServerClient();

    const { data: patientData, error: patientError } = await supabase
      .from("patients")
      .insert({
        name: patient.name,
        phone: patient.phone,
        date_of_birth: patient.date_of_birth || null,
        discharge_date: patient.discharge_date || null,
        cardiac_condition: patient.cardiac_condition,
        language: patient.language ?? "en",
        family_email: patient.family_email || null,
        family_phone: patient.family_phone || null,
        heart_rate_threshold: patient.heart_rate_threshold ?? 100,
        call_start_hour: patient.call_start_hour ?? 8,
        timezone: patient.timezone ?? "UTC",
      })
      .select()
      .single();

    if (patientError) throw new Error(patientError.message);
    const patient_id = patientData.id;

    const { data: planData, error: planError } = await supabase
      .from("recovery_plans")
      .insert({ patient_id, notes: patient.notes || null, phase: patient.phase ?? 3 })
      .select()
      .single();

    if (planError) throw new Error(planError.message);
    const plan_id = planData.id;

    const taskRows = tasks
      .filter((t) => t.task_name.trim())
      .map((t) => ({
        plan_id,
        task_name: t.task_name.trim(),
        task_type: t.task_type,
        frequency: t.frequency,
        is_alert_trigger: t.is_alert_trigger ?? false,
        threshold_value: t.threshold_value || null,
        call_slot: t.call_slot,
      }));

    if (taskRows.length > 0) {
      const { error: tasksError } = await supabase.from("tasks").insert(taskRows);
      if (tasksError) throw new Error(tasksError.message);
    }

    return { ok: true, patient_id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
