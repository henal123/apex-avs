"use client";

import { useState } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useBrandStore } from "@/stores/brand-store";
import { toast } from "sonner";
import type { BrandDNA } from "@/types/brand";

interface SectionRegenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionKey: string;
  sectionTitle: string;
}

export function SectionRegenerateModal({
  open,
  onOpenChange,
  sectionKey,
  sectionTitle,
}: SectionRegenerateModalProps) {
  const [context, setContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { activeBrand, updateBrand } = useBrandStore();

  async function handleRegenerate() {
    if (!activeBrand) return;
    setIsLoading(true);

    try {
      // Call the section-regenerate API
      const { data } = await axios.post(
        `/api/brands/${activeBrand.id}/dna/regenerate-section`,
        {
          section_key: sectionKey,
          additional_context: context,
        }
      );

      // Update local state with new section data
      const updatedDNA = {
        ...activeBrand.brand_dna,
        [sectionKey]: data.data,
      };
      updateBrand(activeBrand.id, { brand_dna: updatedDNA as BrandDNA });

      toast.success(`${sectionTitle} regenerated`);
      onOpenChange(false);
      setContext("");
    } catch {
      toast.error("Failed to regenerate section");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Regenerate: {sectionTitle}</DialogTitle>
          <DialogDescription>
            AI will regenerate this section. Other sections will be preserved.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="context">Additional Context (optional)</Label>
          <Textarea
            id="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Provide any additional context to guide the regeneration..."
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleRegenerate} disabled={isLoading}>
            {isLoading ? "Regenerating..." : "Regenerate Section"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
