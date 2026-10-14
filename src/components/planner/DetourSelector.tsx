"use client";
import { usePlannerStore } from "@/stores/planner-store";
import { DetourLimit } from "@/lib/schemas";
import clsx from "clsx";

const PRESETS: { value: DetourLimit; label: string; description: string }[] = [
  {
    value: "strict",
    label: "Strict",
    description: "≤15% longer",
  },
  {
    value: "standard",
    label: "Standard",
    description: "≤30% longer",
  },
  {
    value: "flexible",
    label: "Flexible",
    description: "≤50% longer",
  },
];

export function DetourSelector() {
  const { detourLimit, setDetourLimit } = usePlannerStore();

  return (
    <fieldset>
      <legend className="text-xs font-semibold text-slate-600 mb-2">
        Max clean-air detour
      </legend>
      <div role="radiogroup" aria-label="Detour limit" className="grid grid-cols-3 gap-2">
        {PRESETS.map((preset) => {
          const isSelected = detourLimit === preset.value;
          return (
            <label
              key={preset.value}
              className={clsx(
                "flex flex-col items-center gap-0.5 p-2.5 rounded-xl border text-center cursor-pointer transition-all select-none",
                isSelected
                  ? "border-teal-500 bg-teal-50 text-teal-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <input
                type="radio"
                name="detourLimit"
                value={preset.value}
                checked={isSelected}
                onChange={() => setDetourLimit(preset.value)}
                className="sr-only"
              />
              <span className="font-semibold text-xs">{preset.label}</span>
              <span className="text-[10px] text-slate-400">{preset.description}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
