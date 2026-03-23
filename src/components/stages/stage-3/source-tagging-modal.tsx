"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SourceTaggingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileCount: number;
  onConfirm: (sourceType: string, sourceName: string) => void;
}

export function SourceTaggingModal({
  open,
  onOpenChange,
  fileCount,
  onConfirm,
}: SourceTaggingModalProps) {
  const [sourceType, setSourceType] = useState("competitor");
  const [sourceName, setSourceName] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tag {fileCount} Images</DialogTitle>
          <DialogDescription>
            Classify the source of these ad images
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Source Type</Label>
            <Select value={sourceType} onValueChange={(v) => v && setSourceType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="competitor">Competitor</SelectItem>
                <SelectItem value="brand_own">Brand Own</SelectItem>
                <SelectItem value="adjacent_category">Adjacent Category</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Source Name</Label>
            <Input
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder={
                sourceType === "brand_own"
                  ? "e.g., Our Brand"
                  : "e.g., Competitor Name"
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(sourceType, sourceName)}>
            Upload {fileCount} Images
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
