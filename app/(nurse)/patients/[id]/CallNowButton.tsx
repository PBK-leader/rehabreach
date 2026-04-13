"use client";

import { useState } from "react";
import { CallSlot, SLOT_LABELS } from "@/lib/types";

const SLOTS: CallSlot[] = ["morning", "medication", "exercise", "evening"];

export default function CallNowButton({ patientId }: { patientId: string }) {
  const [slot, setSlot] = useState<CallSlot>("morning");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleCall() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/make-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId, call_slot: slot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Call failed");
      setResult(`Call placed ✓`);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Error placing call");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={slot}
        onChange={(e) => setSlot(e.target.value as CallSlot)}
        className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-[#006d8f] focus:ring-2 focus:ring-[#006d8f]/20 transition-colors"
        disabled={loading}
      >
        {SLOTS.map((s) => (
          <option key={s} value={s}>{SLOT_LABELS[s]}</option>
        ))}
      </select>
      <button
        onClick={handleCall}
        disabled={loading}
        className="px-4 py-2 text-sm grad-bg text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {loading ? "Calling…" : "Call now"}
      </button>
      {result && (
        <span className={`text-xs font-medium ${result.startsWith("Call placed") ? "text-emerald-600" : "text-rose-600"}`}>
          {result}
        </span>
      )}
    </div>
  );
}
