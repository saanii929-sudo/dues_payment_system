"use client";

import * as React from "react";
import { formatPesewas } from "@/lib/format/currency";
import { cn } from "@/utils/cn";

export interface VolumeTrendPoint {
  date: string;
  amountPesewas: number;
}

const VIEW_WIDTH = 700;
const VIEW_HEIGHT = 100;
const BAR_GAP = 3;
const BASELINE_Y = VIEW_HEIGHT - 1;

export function VolumeTrendChart({ points }: { points: VolumeTrendPoint[] }) {
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const max = Math.max(1, ...points.map((point) => point.amountPesewas));
  const barSlot = points.length > 0 ? VIEW_WIDTH / points.length : 0;
  const barWidth = Math.max(barSlot - BAR_GAP, 1);

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          preserveAspectRatio="none"
          className="h-40 w-full overflow-visible"
          role="img"
          aria-label={`Transaction volume for the last ${points.length} days`}
        >
          <line
            x1={0}
            y1={BASELINE_Y}
            x2={VIEW_WIDTH}
            y2={BASELINE_Y}
            className="stroke-border"
            strokeWidth={1}
          />
          {points.map((point, index) => {
            const barHeight = (point.amountPesewas / max) * (VIEW_HEIGHT - 16);
            const x = index * barSlot + BAR_GAP / 2;
            const y = BASELINE_Y - Math.max(barHeight, 1);
            return (
              <rect
                key={point.date}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 1)}
                rx={1.5}
                className={cn(
                  "cursor-pointer transition-colors",
                  hoverIndex === index ? "fill-accent" : "fill-accent/60",
                )}
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            );
          })}
        </svg>
        {hoverIndex !== null && points[hoverIndex] && (
          <div
            className="pointer-events-none absolute -top-10 -translate-x-1/2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-md"
            style={{ left: `${((hoverIndex + 0.5) / points.length) * 100}%` }}
          >
            <p className="font-medium tabular-nums text-ink">
              {formatPesewas(points[hoverIndex].amountPesewas)}
            </p>
            <p className="text-ink-muted">{points[hoverIndex].date}</p>
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>Transaction volume by day</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <td>{point.date}</td>
              <td>{formatPesewas(point.amountPesewas)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
