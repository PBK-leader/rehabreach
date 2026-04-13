import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { Patient, CallLog, CONDITION_LABELS } from "@/lib/types";

export const revalidate = 0;

interface PatientRow extends Patient {
  logs: CallLog[];
}

async function getData(): Promise<PatientRow[]> {
  const supabase = createServerClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: patients, error } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows: PatientRow[] = await Promise.all(
    (patients ?? []).map(async (p) => {
      const { data: logs } = await supabase
        .from("call_logs")
        .select("status, severity_flag, called_at, call_type")
        .eq("patient_id", p.id)
        .gte("called_at", weekAgo)
        .order("called_at", { ascending: false });
      return { ...p, logs: (logs ?? []) as CallLog[] };
    })
  );
  return rows;
}

// Build a 7-day × 4-slot heatmap: each cell = one call slot per day
function buildHeatmap(logs: CallLog[]) {
  const slots = ["morning", "medication", "exercise", "evening"];
  const days: { date: string; label: string; slots: Record<string, string> }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = i === 0 ? "Today" : d.toLocaleDateString("en-GB", { weekday: "short" });
    const slotMap: Record<string, string> = {};
    for (const slot of slots) {
      const match = logs.find(
        (l) => l.called_at?.slice(0, 10) === dateStr && l.call_type === slot
      );
      if (!match) slotMap[slot] = "none";
      else if (match.status === "completed" && match.severity_flag === "urgent") slotMap[slot] = "urgent";
      else if (match.status === "completed" && match.severity_flag === "watch") slotMap[slot] = "watch";
      else if (match.status === "completed") slotMap[slot] = "ok";
      else slotMap[slot] = "missed";
    }
    days.push({ date: dateStr, label, slots: slotMap });
  }
  return days;
}

function HeatmapCell({ state }: { state: string }) {
  const map: Record<string, string> = {
    ok: "bg-emerald-400",
    urgent: "bg-rose-500",
    watch: "bg-amber-400",
    missed: "bg-slate-300",
    none: "bg-slate-100",
  };
  return <div className={`w-5 h-5 rounded-sm ${map[state] ?? "bg-slate-100"}`} title={state} />;
}

export default async function PatientsPage() {
  let rows: PatientRow[] = [];
  let error = "";

  try {
    rows = await getData();
  } catch {
    error = "Could not load patients.";
  }

  const urgentCount = rows.filter((r) => r.logs.some((l) => l.severity_flag === "urgent")).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patients</h1>
          <p className="text-sm text-slate-400 mt-0.5">{rows.length} enrolled · 7-day activity heatmap</p>
        </div>
        <Link
          href="/plan-builder"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0f1117] text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add patient
        </Link>
      </div>

      {urgentCount > 0 && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <span className="pulse-dot w-2 h-2 bg-rose-500 rounded-full flex-shrink-0" />
          <p className="text-sm text-rose-700 font-medium">
            {urgentCount} patient{urgentCount > 1 ? "s" : ""} with urgent alerts — review immediately
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      {rows.length === 0 && !error && (
        <div className="text-center py-24 bg-white rounded-2xl border border-slate-200">
          <p className="text-4xl mb-4">🫀</p>
          <p className="font-semibold text-slate-700 mb-1">No patients yet</p>
          <p className="text-sm text-slate-400 mb-6">Add a patient to start automated monitoring</p>
          <Link href="/plan-builder" className="text-sm text-rose-500 font-semibold hover:underline">Add first patient →</Link>
        </div>
      )}

      {/* Legend */}
      {rows.length > 0 && (
        <div className="flex items-center gap-5 text-xs text-slate-400">
          {[
            { color: "bg-emerald-400", label: "Completed" },
            { color: "bg-amber-400", label: "Watch flag" },
            { color: "bg-rose-500", label: "Urgent" },
            { color: "bg-slate-300", label: "Missed" },
            { color: "bg-slate-100 border border-slate-200", label: "No call" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${color}`} />
              {label}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {rows.map((p) => {
          const heatmap = buildHeatmap(p.logs);
          const completedCount = p.logs.filter((l) => l.status === "completed").length;
          const pct = p.logs.length ? Math.round((completedCount / p.logs.length) * 100) : null;
          const hasUrgent = p.logs.some((l) => l.severity_flag === "urgent");
          const hasWatch = !hasUrgent && p.logs.some((l) => l.severity_flag === "watch");
          const age = p.date_of_birth ? new Date().getFullYear() - new Date(p.date_of_birth).getFullYear() : null;

          return (
            <Link
              key={p.id}
              href={`/patients/${p.id}`}
              className={`block bg-white rounded-2xl border hover:shadow-md transition-all p-5 ${hasUrgent ? "border-rose-300" : "border-slate-200 hover:border-slate-300"}`}
            >
              <div className="flex items-start justify-between gap-6">
                {/* Patient info */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${hasUrgent ? "bg-rose-500" : hasWatch ? "bg-amber-500" : "bg-[#0f1117]"}`}>
                    {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      {hasUrgent && <span className="text-[11px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-semibold">Urgent</span>}
                      {hasWatch && <span className="text-[11px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-semibold">Watch</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {age ? `${age} yrs · ` : ""}
                      {p.cardiac_condition ? CONDITION_LABELS[p.cardiac_condition as keyof typeof CONDITION_LABELS] : "Cardiac"}
                      {" · "}
                      {p.language === "hi" ? "Hindi" : "English"}
                    </p>
                  </div>
                </div>

                {/* Heatmap */}
                <div className="flex-shrink-0">
                  <div className="flex items-end gap-1.5">
                    {heatmap.map((day) => (
                      <div key={day.date} className="flex flex-col items-center gap-1">
                        <div className="flex flex-col gap-1">
                          {["morning", "medication", "exercise", "evening"].map((slot) => (
                            <HeatmapCell key={slot} state={day.slots[slot]} />
                          ))}
                        </div>
                        <span className="text-[9px] text-slate-400 mt-0.5">{day.label.slice(0, 2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compliance */}
                <div className="text-right flex-shrink-0 hidden md:block">
                  {pct !== null ? (
                    <>
                      <p className={`text-2xl font-black ${pct >= 80 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-rose-500"}`}>{pct}%</p>
                      <p className="text-xs text-slate-400">compliance</p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400">No data</p>
                  )}
                </div>

                <svg className="w-4 h-4 text-slate-300 flex-shrink-0 mt-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
