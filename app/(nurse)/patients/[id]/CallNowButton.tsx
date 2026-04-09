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
      setResult(`Call placed (${data.call_sid})`);
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
        className="text-sm border border-slate-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        disabled={loading}
      >
        {SLOTS.map((s) => (
          <option key={s} value={s}>{SLOT_LABELS[s]}</option>
        ))}
      </select>
      <button
        onClick={handleCall}
        disabled={loading}
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {loading ? "Calling…" : "Call now"}
      </button>
      {result && (
        <span className={`text-xs ${result.startsWith("Call placed") ? "text-green-600" : "text-red-600"}`}>
          {result}
        </span>
      )}
    </div>
  );
}
