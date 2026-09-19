"use client";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: number;
  decimal?: boolean;
  suffix?: string;
};

export default function NumberStepper({
  label,
  value,
  onChange,
  step = 1,
  decimal = false,
  suffix,
}: Props) {
  function bump(delta: number) {
    const current = parseFloat(value || "0") || 0;
    const next = Math.max(0, current + delta);
    onChange(decimal ? String(round1(next)) : String(Math.round(next)));
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => bump(-step)}
          className="h-12 w-12 shrink-0 rounded-xl bg-slate-800 text-xl font-semibold text-slate-200 active:scale-95"
        >
          −
        </button>
        <div className="relative flex-1">
          <input
            inputMode={decimal ? "decimal" : "numeric"}
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 text-center text-xl font-semibold text-slate-100 outline-none focus:border-emerald-500"
          />
          {suffix && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              {suffix}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => bump(step)}
          className="h-12 w-12 shrink-0 rounded-xl bg-slate-800 text-xl font-semibold text-slate-200 active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
