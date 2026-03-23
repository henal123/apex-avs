"use client";

import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface ColorSwatchPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorSwatchPicker({
  color,
  onChange,
  label,
}: ColorSwatchPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          className="h-8 w-8 rounded-full border border-border shadow-sm cursor-pointer"
          style={{ backgroundColor: color }}
        />
        <PopoverContent className="w-auto p-3" align="start">
          <HexColorPicker color={color} onChange={onChange} />
          <Input
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="mt-2 h-8 text-xs font-mono"
            placeholder="#000000"
          />
        </PopoverContent>
      </Popover>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <span className="text-xs font-mono text-muted-foreground">{color}</span>
    </div>
  );
}
