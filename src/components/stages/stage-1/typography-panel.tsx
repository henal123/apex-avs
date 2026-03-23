"use client";

import { Type } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TypographyPanelProps {
  fonts: string[];
}

export function TypographyPanel({ fonts }: TypographyPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Type className="h-4 w-4" />
          Typography
        </CardTitle>
      </CardHeader>
      <CardContent>
        {fonts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No custom fonts detected
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {fonts.map((font) => (
              <Badge key={font} variant="secondary" className="text-sm">
                {font}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
