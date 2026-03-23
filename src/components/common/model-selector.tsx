"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export type AIModel = "gemini-2.5-pro" | "gemini-2.5-flash" | "claude-sonnet";

interface ModelSelectorProps {
  value: AIModel;
  onChange: (model: AIModel) => void;
  label?: string;
  allowedModels?: AIModel[];
}

const MODEL_INFO: Record<AIModel, { name: string; provider: string; speed: string }> = {
  "gemini-2.5-pro": { name: "Gemini 2.5 Pro", provider: "Google", speed: "Slow" },
  "gemini-2.5-flash": { name: "Gemini 2.0 Flash", provider: "Google", speed: "Fast" },
  "claude-sonnet": { name: "Claude Sonnet", provider: "Anthropic", speed: "Medium" },
};

export function ModelSelector({
  value,
  onChange,
  label = "AI Model",
  allowedModels = ["gemini-2.5-pro", "gemini-2.5-flash", "claude-sonnet"],
}: ModelSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <Label className="text-xs whitespace-nowrap">{label}</Label>
      <Select value={value} onValueChange={(v) => v && onChange(v as AIModel)}>
        <SelectTrigger className="w-[220px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allowedModels.map((model) => {
            const info = MODEL_INFO[model];
            return (
              <SelectItem key={model} value={model}>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{info.name}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {info.speed}
                  </Badge>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
