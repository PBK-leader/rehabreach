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

function SeverityBadge({ condition }: { condition: string | null }) {
  if (!condition) return null;
  const label = CONDITION_LABELS[condition as keyof typeof CONDITION_LABELS] ?? condition;
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{label}</span>
  );
}

export default async function PatientsPage() {
  let patients: Patient[] = [];
  let error = "";

  try {
    patients = await getPatients();
  } catch (e) {
    error = "Could not load patients. Check your Supabase connection.";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
        <Link
          href="/plan-builder"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add patient
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">{error}</div>
      )}

      {patients.length === 0 && !error && (
        <div className="text-center py-16 text-slate-400">
          <p className="mb-2">No patients yet.</p>
          <Link href="/plan-builder" className="text-blue-600 hover:underline text-sm">Add your first patient</Link>
        </div>
      )}

      <div className="grid gap-3">
        {patients.map((p) => (
          <Link
            key={p.id}
            href={`/patients/${p.id}`}
            className="block bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-sm">
                  {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {p.date_of_birth
                      ? `Age ${new Date().getFullYear() - new Date(p.date_of_birth).getFullYear()}`
                      : "Age unknown"}{" "}
                    &middot; {p.language === "hi" ? "Hindi" : "English"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SeverityBadge condition={p.cardiac_condition} />
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
