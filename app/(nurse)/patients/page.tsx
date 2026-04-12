import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { Patient, CONDITION_LABELS } from "@/lib/types";

export const revalidate = 0;

async function getPatients(): Promise<Patient[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getCallStats(): Promise<Record<string, { completed: number; total: number; flag: string }>> {
  const supabase = createServerClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("call_logs")
    .select("patient_id, status, severity_flag, called_at")
    .gte("called_at", weekAgo);

  const stats: Record<string, { completed: number; total: number; flag: string }> = {};
  for (const log of data ?? []) {
    if (!stats[log.patient_id]) stats[log.patient_id] = { completed: 0, total: 0, flag: "normal" };
    stats[log.patient_id].total++;
    if (log.status === "completed") stats[log.patient_id].completed++;
    if (log.severity_flag === "urgent") stats[log.patient_id].flag = "urgent";
    else if (log.severity_flag === "watch" && stats[log.patient_id].flag !== "urgent") stats[log.patient_id].flag = "watch";
  }
  return stats;
}

function CompliancePill({ completed, total }: { completed: number; total: number }) {
  if (total === 0) return <span className="text-xs text-slate-400">No calls yet</span>;
  const pct = Math.round((completed / total) * 100);
  const color = pct >= 80 ? "text-green-600 bg-green-50" : pct >= 50 ? "text-yellow-600 bg-yellow-50" : "text-red-600 bg-red-50";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {pct}% compliant
    </span>
  );
}

export default async function PatientsPage() {
  let patients: Patient[] = [];
  let stats: Record<string, { completed: number; total: number; flag: string }> = {};
  let error = "";

  try {
    [patients, stats] = await Promise.all([getPatients(), getCallStats()]);
  } catch {
    error = "Could not load patients. Check your Supabase connection.";
  }

  const urgentCount = Object.values(stats).filter((s) => s.flag === "urgent").length;
  const watchCount = Object.values(stats).filter((s) => s.flag === "watch").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {patients.length} patient{patients.length !== 1 ? "s" : ""} · 7-day compliance view
          </p>
        </div>
        <Link
          href="/plan-builder"
          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors shadow-sm shadow-red-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add patient
        </Link>
      </div>

      {/* Alert banners */}
      {urgentCount > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {urgentCount} patient{urgentCount > 1 ? "s" : ""} with urgent alerts this week — review immediately
          </p>
        </div>
      )}
      {watchCount > 0 && urgentCount === 0 && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0" />
          <p className="text-sm text-yellow-700 font-medium">
            {watchCount} patient{watchCount > 1 ? "s" : ""} flagged for attention this week
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      {patients.length === 0 && !error && (
        <div className="text-center py-20 text-slate-400">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="font-medium text-slate-600 mb-1">No patients yet</p>
          <p className="text-sm mb-4">Add your first patient to get started</p>
          <Link href="/plan-builder" className="text-sm text-red-500 font-medium hover:underline">Add first patient →</Link>
        </div>
      )}

      <div className="grid gap-3">
        {patients.map((p) => {
          const s = stats[p.id] ?? { completed: 0, total: 0, flag: "normal" };
          const age = p.date_of_birth
            ? new Date().getFullYear() - new Date(p.date_of_birth).getFullYear()
            : null;

          return (
            <Link
              key={p.id}
              href={`/patients/${p.id}`}
              className="block bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${s.flag === "urgent" ? "bg-red-500" : s.flag === "watch" ? "bg-yellow-500" : "bg-slate-700"}`}>
                    {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      {s.flag === "urgent" && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Urgent</span>
                      )}
                      {s.flag === "watch" && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Watch</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {age ? `${age} yrs · ` : ""}
                      {p.cardiac_condition ? CONDITION_LABELS[p.cardiac_condition as keyof typeof CONDITION_LABELS] : "Cardiac patient"}
                      {" · "}
                      {p.language === "hi" ? "Hindi" : "English"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-400 mb-1">7-day</p>
                    <CompliancePill completed={s.completed} total={s.total} />
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-400 mb-1">Calls</p>
                    <p className="text-sm font-semibold text-slate-700">{s.completed}/{s.total}</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
