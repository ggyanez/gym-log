"use client";

type Props = {
  nombre: string;
  active: boolean;
  count: number;
  onClick: () => void;
};

export default function ExerciseChip({ nombre, active, count, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-full px-4 py-2 text-sm font-medium transition active:scale-95 ${
        active
          ? "bg-emerald-600 text-white"
          : "border border-slate-800 bg-slate-900 text-slate-200"
      }`}
    >
      {nombre}
      {count > 0 && (
        <span
          className={`absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
            active ? "bg-white text-emerald-700" : "bg-emerald-600 text-white"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
