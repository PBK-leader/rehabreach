import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { patient, tasks } = await req.json();

    if (!patient.name || !patient.phone || !patient.cardiac_condition) {
      return NextResponse.json({ error: "name, phone, and cardiac_condition are required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Insert patient
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

    if (patientError) throw patientError;
    const patient_id = patientData.id;

    // Insert recovery plan
    const { data: planData, error: planError } = await supabase
      .from("recovery_plans")
      .insert({
        patient_id,
        notes: patient.notes || null,
        phase: patient.phase ?? 3,
      })
      .select()
      .single();

    if (planError) throw planError;
    const plan_id = planData.id;

    // Insert tasks
    if (tasks && tasks.length > 0) {
      const taskRows = tasks
        .filter((t: { task_name: string }) => t.task_name.trim())
        .map((t: { task_name: string; task_type: string; frequency: string; is_alert_trigger: boolean; threshold_value: string; call_slot: string }) => ({
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
        if (tasksError) throw tasksError;
      }
    }

    return NextResponse.json({ patient_id, plan_id });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
