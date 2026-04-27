"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CONDITION_LABELS, CardiacCondition, CallSlot } from "@/lib/types";
import { savePatient } from "./actions";

const SLOT_LABELS: Record<CallSlot, string> = {
  morning: "Morning check-in",
  medication: "Medication check",
  exercise: "Exercise check",
  evening: "Evening wrap-up",
};

const TASK_TEMPLATES: Record<CardiacCondition, Array<{ task_name: string; task_type: string; frequency: string; is_alert_trigger: boolean; threshold_value: string; call_slot: CallSlot }>> = {
  cabg: [
    { task_name: "Sleep quality check", task_type: "symptom_check", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "morning" },
    { task_name: "Chest pain check", task_type: "symptom_check", frequency: "daily", is_alert_trigger: true, threshold_value: "", call_slot: "morning" },
    { task_name: "Resting heart rate", task_type: "vitals", frequency: "daily", is_alert_trigger: true, threshold_value: "100", call_slot: "morning" },
    { task_name: "Take Metoprolol", task_type: "medication", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "medication" },
    { task_name: "Take Aspirin 75mg", task_type: "medication", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "medication" },
    { task_name: "Take Atorvastatin", task_type: "medication", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "medication" },
    { task_name: "Take Lisinopril", task_type: "medication", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "medication" },
    { task_name: "15-minute walk", task_type: "exercise", frequency: "twice_daily", is_alert_trigger: false, threshold_value: "", call_slot: "exercise" },
    { task_name: "Post-exercise symptoms", task_type: "symptom_check", frequency: "daily", is_alert_trigger: true, threshold_value: "", call_slot: "exercise" },
    { task_name: "Overall wellbeing", task_type: "symptom_check", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "evening" },
    { task_name: "Diet adherence (low sodium)", task_type: "diet", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "evening" },
    { task_name: "Ankle/leg swelling check", task_type: "symptom_check", frequency: "daily", is_alert_trigger: true, threshold_value: "", call_slot: "evening" },
  ],
  mi: [
    { task_name: "Sleep quality check", task_type: "symptom_check", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "morning" },
    { task_name: "Chest pain check", task_type: "symptom_check", frequency: "daily", is_alert_trigger: true, threshold_value: "", call_slot: "morning" },
    { task_name: "Resting heart rate", task_type: "vitals", frequency: "daily", is_alert_trigger: true, threshold_value: "100", call_slot: "morning" },
    { task_name: "Take Metoprolol", task_type: "medication", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "medication" },
    { task_name: "Take Aspirin 75mg", task_type: "medication", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "medication" },
    { task_name: "Take Clopidogrel", task_type: "medication", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "medication" },
    { task_name: "Take Ramipril", task_type: "medication", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "medication" },
    { task_name: "10-minute walk", task_type: "exercise", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "exercise" },
    { task_name: "Post-exercise symptoms", task_type: "symptom_check", frequency: "daily", is_alert_trigger: true, threshold_value: "", call_slot: "exercise" },
    { task_name: "Overall wellbeing", task_type: "symptom_check", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "evening" },
    { task_name: "Diet adherence (low sodium)", task_type: "diet", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "evening" },
    { task_name: "Ankle/leg swelling check", task_type: "symptom_check", frequency: "daily", is_alert_trigger: true, threshold_value: "", call_slot: "evening" },
  ],
  stent: [
    { task_name: "Chest pain check", task_type: "symptom_check", frequency: "daily", is_alert_trigger: true, threshold_value: "", call_slot: "morning" },
    { task_name: "Resting heart rate", task_type: "vitals", frequency: "daily", is_alert_trigger: true, threshold_value: "100", call_slot: "morning" },
    { task_name: "Take Aspirin 75mg", task_type: "medication", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "medication" },
    { task_name: "Take Clopidogrel", task_type: "medication", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "medication" },
    { task_name: "10-minute walk", task_type: "exercise", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "exercise" },
    { task_name: "Post-exercise symptoms", task_type: "symptom_check", frequency: "daily", is_alert_trigger: true, threshold_value: "", call_slot: "exercise" },
    { task_name: "Overall wellbeing", task_type: "symptom_check", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "evening" },
  ],
  valve: [
    { task_name: "Breathlessness at rest", task_type: "symptom_check", frequency: "daily", is_alert_trigger: true, threshold_value: "", call_slot: "morning" },
    { task_name: "Resting heart rate", task_type: "vitals", frequency: "daily", is_alert_trigger: true, threshold_value: "100", call_slot: "morning" },
    { task_name: "Take Warfarin", task_type: "medication", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "medication" },
    { task_name: "Take Furosemide", task_type: "medication", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "medication" },
    { task_name: "5–10 minute gentle walk", task_type: "exercise", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "exercise" },
    { task_name: "Breathlessness during activity", task_type: "symptom_check", frequency: "daily", is_alert_trigger: true, threshold_value: "", call_slot: "exercise" },
    { task_name: "Ankle swelling", task_type: "symptom_check", frequency: "daily", is_alert_trigger: true, threshold_value: "", call_slot: "evening" },
    { task_name: "Fatigue level", task_type: "symptom_check", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "evening" },
  ],
  heart_failure: [
    { task_name: "Breathlessness at rest", task_type: "symptom_check", frequency: "daily", is_alert_trigger: true, threshold_value: "", call_slot: "morning" },
    { task_name: "Weight check (fluid retention)", task_type: "vitals", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "morning" },
    { task_name: "Take ACE inhibitor", task_type: "medication", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "medication" },
    { task_name: "Take Beta-blocker", task_type: "medication", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "medication" },
    { task_name: "Take Diuretic", task_type: "medication", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "medication" },
    { task_name: "Gentle walking", task_type: "exercise", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "exercise" },
    { task_name: "Breathlessness when lying flat", task_type: "symptom_check", frequency: "daily", is_alert_trigger: true, threshold_value: "", call_slot: "evening" },
    { task_name: "Ankle/leg swelling", task_type: "symptom_check", frequency: "daily", is_alert_trigger: true, threshold_value: "", call_slot: "evening" },
    { task_name: "Fluid intake check", task_type: "diet", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "evening" },
  ],
};

type TaskDraft = typeof TASK_TEMPLATES.cabg[0];

export default function PlanBuilderPage() {
  const router = useRouter();
  const [step, setStep] = useState<"patient" | "tasks">("patient");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [patient, setPatient] = useState({
    name: "",
    phone: "",
    date_of_birth: "",
    discharge_date: "",
    cardiac_condition: "" as CardiacCondition | "",
    language: "en",
    family_email: "",
    family_phone: "",
    heart_rate_threshold: 100,
    call_start_hour: 8,
    timezone: "UTC",
    notes: "",
    phase: 3,
  });

  const [tasks, setTasks] = useState<TaskDraft[]>([]);

  function loadTemplate(condition: CardiacCondition) {
    setPatient((p) => ({ ...p, cardiac_condition: condition }));
    setTasks(TASK_TEMPLATES[condition].map((t) => ({ ...t })));
  }

  function updateTask(index: number, field: keyof TaskDraft, value: string | boolean) {
    setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  }

  function removeTask(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  function addTask() {
    setTasks((prev) => [...prev, { task_name: "", task_type: "symptom_check", frequency: "daily", is_alert_trigger: false, threshold_value: "", call_slot: "morning" }]);
  }

  async function handleSave() {
    if (!patient.name || !patient.phone || !patient.cardiac_condition) {
      setError("Name, phone, and condition are required.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await savePatient(patient, tasks);
    if (res.ok) {
      router.push(`/patients/${res.patient_id}`);
    } else {
      setError(res.error);
      setSaving(false);
    }
  }

  const slots: CallSlot[] = ["morning", "medication", "exercise", "evening"];

  const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:border-[#006d8f] focus:ring-2 focus:ring-[#006d8f]/15 transition-colors placeholder:text-slate-400";

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Add New Patient</h1>
        <p className="text-sm text-slate-400 mt-1">Set up a patient profile and recovery plan</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-6">
        {(["patient", "tasks"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s || (s === "patient" && step === "tasks") ? "grad-bg text-white" : "bg-slate-100 text-slate-400"}`}>
              {i + 1}
            </div>
            <span className={`text-sm font-medium ${step === s ? "text-slate-900" : "text-slate-400"}`}>
              {s === "patient" ? "Patient details" : "Review tasks"}
            </span>
            {i === 0 && <span className="text-slate-300 mx-1">→</span>}
          </div>
        ))}
      </div>

      {step === "patient" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full name *</label>
              <input className={inputCls} value={patient.name} onChange={(e) => setPatient((p) => ({ ...p, name: e.target.value }))} placeholder="Margaret Chen" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Phone *</label>
              <input className={inputCls} value={patient.phone} onChange={(e) => setPatient((p) => ({ ...p, phone: e.target.value }))} placeholder="+91XXXXXXXXXX" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Language</label>
              <select className={inputCls} value={patient.language} onChange={(e) => setPatient((p) => ({ ...p, language: e.target.value }))}>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date of birth</label>
              <input type="date" className={inputCls} value={patient.date_of_birth} onChange={(e) => setPatient((p) => ({ ...p, date_of_birth: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Discharge date</label>
              <input type="date" className={inputCls} value={patient.discharge_date} onChange={(e) => setPatient((p) => ({ ...p, discharge_date: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Cardiac condition *</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(CONDITION_LABELS) as [CardiacCondition, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => loadTemplate(key)}
                  className={`text-left px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${patient.cardiac_condition === key ? "border-[#006d8f] bg-[#e0f4fa] text-[#006d8f]" : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {patient.cardiac_condition && (
              <p className="text-xs text-emerald-600 font-medium mt-2">✓ Template loaded - {tasks.length} tasks pre-filled</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">HR alert threshold (bpm)</label>
              <input type="number" className={inputCls} value={patient.heart_rate_threshold} onChange={(e) => setPatient((p) => ({ ...p, heart_rate_threshold: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Call start hour</label>
              <input type="number" min={7} max={12} className={inputCls} value={patient.call_start_hour} onChange={(e) => setPatient((p) => ({ ...p, call_start_hour: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Family email</label>
              <input type="email" className={inputCls} value={patient.family_email} onChange={(e) => setPatient((p) => ({ ...p, family_email: e.target.value }))} placeholder="family@example.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Family phone</label>
              <input className={inputCls} value={patient.family_phone} onChange={(e) => setPatient((p) => ({ ...p, family_phone: e.target.value }))} placeholder="+91XXXXXXXXXX" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes for care team</label>
              <textarea rows={2} className={inputCls} value={patient.notes} onChange={(e) => setPatient((p) => ({ ...p, notes: e.target.value }))} placeholder="Any relevant clinical notes…" />
            </div>
          </div>

          <button
            onClick={() => setStep("tasks")}
            disabled={!patient.name || !patient.phone || !patient.cardiac_condition}
            className="w-full py-3 grad-bg text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Next: Review tasks →
          </button>
        </div>
      )}

      {step === "tasks" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recovery Plan Tasks</h2>
              <button onClick={() => setStep("patient")} className="text-sm text-[#006d8f] font-medium hover:text-[#005570] transition-colors">← Back</button>
            </div>

            {slots.map((slot) => {
              const slotTasks = tasks.map((t, i) => ({ ...t, _index: i })).filter((t) => t.call_slot === slot);
              return (
                <div key={slot} className="mb-5">
                  <p className="text-[10px] font-bold text-[#006d8f] uppercase tracking-widest mb-2.5">{SLOT_LABELS[slot]}</p>
                  <div className="space-y-2">
                    {slotTasks.map((t) => (
                      <div key={t._index} className="flex items-center gap-2">
                        <input
                          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#006d8f] focus:ring-2 focus:ring-[#006d8f]/15 transition-colors"
                          value={t.task_name}
                          onChange={(e) => updateTask(t._index, "task_name", e.target.value)}
                        />
                        <label className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap cursor-pointer">
                          <input
                            type="checkbox"
                            checked={t.is_alert_trigger}
                            onChange={(e) => updateTask(t._index, "is_alert_trigger", e.target.checked)}
                            className="accent-[#006d8f]"
                          />
                          alert
                        </label>
                        <button onClick={() => removeTask(t._index)} className="text-slate-300 hover:text-rose-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <button onClick={addTask} className="text-sm text-[#006d8f] font-semibold hover:text-[#005570] transition-colors">+ Add task</button>
          </div>

          {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 grad-bg text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {saving ? "Saving…" : "Save patient & plan"}
          </button>
        </div>
      )}
    </div>
  );
}
