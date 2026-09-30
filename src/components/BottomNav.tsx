"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Every link below gets scroll={false}. The reset that matters isn't the
// arriving page's — it's that clicking ANY of these resets window.scrollY
// to 0 on the CURRENT (outgoing) page before it unmounts, so a page using
// useScrollRestore sees its own scroll listener fire with 0 and clobbers
// its just-saved position. scroll={false} stops that at the source; each
// page then owns arriving-scroll-position itself via useScrollRestore.
const ITEMS = [
  { href: "/", label: "Registrar", icon: "🏋️" },
  { href: "/rutina", label: "Rutina", icon: "📅" },
  { href: "/historial", label: "Historial", icon: "📋" },
  { href: "/estadisticas", label: "Estadísticas", icon: "📊" },
  { href: "/manage", label: "Catálogo", icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-stretch justify-around">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              scroll={false}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs active:scale-95 ${
                active ? "text-emerald-400" : "text-slate-500"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
