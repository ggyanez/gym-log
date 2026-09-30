"use client";

import { useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
};

const MARKS = [
  { label: "B", mark: "**", title: "Negrita", className: "font-bold" },
  { label: "I", mark: "_", title: "Cursiva", className: "italic" },
  { label: "U", mark: "++", title: "Subrayado", className: "underline" },
];

export default function FormattableTextarea({ value, onChange, placeholder, rows = 4 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrap(mark: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const next = `${value.slice(0, start)}${mark}${selected}${mark}${value.slice(end)}`;
    onChange(next);

    const cursorStart = selected ? start + mark.length : start + mark.length;
    const cursorEnd = selected ? end + mark.length : cursorStart;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  return (
    <div>
      <div className="mb-1 flex gap-1">
        {MARKS.map((m) => (
          <button
            key={m.label}
            type="button"
            title={m.title}
            onClick={() => wrap(m.mark)}
            className={`h-7 w-7 rounded border border-slate-700 text-xs text-slate-300 active:scale-95 ${m.className}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
      />
    </div>
  );
}
