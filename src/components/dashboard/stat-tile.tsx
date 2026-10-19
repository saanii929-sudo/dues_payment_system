import { cn } from "@/utils/cn";

type StatTileAccent = "success" | "pending" | "danger" | "neutral";

const ACCENT_CLASSES: Record<StatTileAccent, string> = {
  success: "text-success",
  pending: "text-pending",
  danger: "text-danger",
  neutral: "text-ink",
};

interface StatTileProps {
  label: string;
  value: string;
  accent?: StatTileAccent;
  hint?: string;
}

export function StatTile({ label, value, accent = "neutral", hint }: StatTileProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={cn("mt-1.5 text-2xl font-semibold tabular-nums", ACCENT_CLASSES[accent])}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
