"use client";

import type { DayHours, OpeningHours, Weekday } from "@/lib/types";
import { WEEKDAY_OPTIONS } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    TIME_OPTIONS.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
  }
}

function formatTimeLabel(value: string) {
  const [hStr, mStr] = value.split(":");
  const h = Number(hStr);
  const m = mStr;
  const suffix = h < 12 ? "a. m." : "p. m.";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${suffix}`;
}

export function OpeningHoursEditor({
  value,
  onChange,
}: {
  value: OpeningHours;
  onChange: (next: OpeningHours) => void;
}) {
  const updateDay = (day: Weekday, patch: Partial<DayHours>) => {
    onChange({
      ...value,
      [day]: { ...value[day], ...patch },
    });
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="block text-sm font-semibold text-ink">Horario semanal</p>
        <p className="text-xs text-muted mt-0.5">
          Elige a qué hora abres y cierras cada día. Los clientes solo pueden
          pedir dentro de este horario.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
        {WEEKDAY_OPTIONS.map(({ day, label }) => {
          const hours = value[day];
          return (
            <div key={day} className="p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{label}</p>
                <label className="flex items-center gap-2 text-xs font-medium text-muted cursor-pointer">
                  <span>Cerrado</span>
                  <input
                    type="checkbox"
                    checked={hours.closed}
                    onChange={(e) =>
                      updateDay(day, { closed: e.target.checked })
                    }
                    className="size-4 accent-[var(--brand)]"
                  />
                </label>
              </div>

              <div
                className={cn(
                  "grid grid-cols-2 gap-2",
                  hours.closed && "opacity-40 pointer-events-none"
                )}
              >
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Abre
                  </span>
                  <select
                    className="w-full h-10 px-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-brand"
                    value={hours.open}
                    disabled={hours.closed}
                    onChange={(e) => updateDay(day, { open: e.target.value })}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {formatTimeLabel(t)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Cierra
                  </span>
                  <select
                    className="w-full h-10 px-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-brand"
                    value={hours.close}
                    disabled={hours.closed}
                    onChange={(e) => updateDay(day, { close: e.target.value })}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {formatTimeLabel(t)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
