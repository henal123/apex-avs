"use client";

import { cn } from "@/lib/utils";

interface ScoreSliderProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  min?: number;
  max?: number;
}

function getScoreColor(value: number, max: number): string {
  const ratio = value / max;
  if (ratio >= 0.7) return "text-green-500";
  if (ratio >= 0.4) return "text-yellow-500";
  return "text-red-500";
}

function getBarColor(value: number, max: number): string {
  const ratio = value / max;
  if (ratio >= 0.7) return "bg-green-500";
  if (ratio >= 0.4) return "bg-yellow-500";
  return "bg-red-500";
}

export function ScoreSlider({
  value,
  onChange,
  label,
  min = 1,
  max = 10,
}: ScoreSliderProps) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground capitalize">{label}</span>
          <span className={cn("text-xs font-mono font-bold", getScoreColor(value, max))}>
            {value}/{max}
          </span>
        </div>
      )}
      <div className="relative h-5 flex items-center">
        {/* Track background */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-muted" />
        {/* Filled track */}
        <div
          className={cn("absolute left-0 h-1.5 rounded-full", getBarColor(value, max))}
          style={{ width: `${percent}%` }}
        />
        {/* Native range input (invisible but functional) */}
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        {/* Thumb indicator */}
        <div
          className="absolute h-3.5 w-3.5 rounded-full border-2 border-background bg-foreground shadow-sm pointer-events-none"
          style={{ left: `calc(${percent}% - 7px)` }}
        />
      </div>
    </div>
  );
}
