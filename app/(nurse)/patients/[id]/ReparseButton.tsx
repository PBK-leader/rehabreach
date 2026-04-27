"use client";

import { useState } from "react";
import { reparseLog } from "./actions";

export default function ReparseButton({ logId, patientId }: { logId: string; patientId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handle() {
    setState("loading");
    const res = await reparseLog(logId, patientId);
    setState(res.ok ? "done" : "error");
  }

  if (state === "done") return <span className="text-[10px] text-emerald-500 font-medium">Parsed</span>;

  return (
    <button
      onClick={handle}
      disabled={state === "loading"}
      className="text-[10px] text-[#006d8f] hover:underline disabled:opacity-50 font-medium"
    >
      {state === "loading" ? "Parsing…" : state === "error" ? "Retry parse" : "Re-parse"}
    </button>
  );
}
