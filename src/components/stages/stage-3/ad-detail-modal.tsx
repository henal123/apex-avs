"use client";

import { useState } from "react";
import Image from "next/image";
import axios from "axios";
import {
  Dialog,
  DialogContent,
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
import { Switch } from "@/components/ui/switch";
import { TagChipEditor } from "@/components/common/tag-chip-editor";
import { toast } from "sonner";
import type { AdLibraryAd } from "@/types/ad-library";

interface AdDetailModalProps {
  ad: AdLibraryAd;
  brandId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function AdDetailModal({
  ad,
  brandId,
  open,
  onOpenChange,
  onUpdate,
}: AdDetailModalProps) {
  const [sourceType, setSourceType] = useState(ad.source_type);
  const [sourceName, setSourceName] = useState(ad.source_name);
  const [tier, setTier] = useState(ad.performance_tier);
  const [flag, setFlag] = useState(ad.flag || "");
  const [daysRunning, setDaysRunning] = useState(ad.days_running?.toString() || "");
  const [tags, setTags] = useState(ad.user_tags || []);
  const [headline, setHeadline] = useState(ad.ad_copy?.headline || "");
  const [primaryText, setPrimaryText] = useState(ad.ad_copy?.primary_text || "");
  const [cta, setCta] = useState(ad.ad_copy?.cta || "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await axios.patch(`/api/brands/${brandId}/ads/${ad.id}`, {
        source_type: sourceType,
        source_name: sourceName,
        performance_tier: tier,
        flag: flag || null,
        days_running: daysRunning ? parseInt(daysRunning) : null,
        user_tags: tags,
        ad_copy: {
          headline,
          primary_text: primaryText,
          cta,
        },
      });
      toast.success("Ad updated");
      onUpdate();
    } catch {
      toast.error("Failed to update");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ad Details</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image */}
          <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            <Image
              src={ad.image_url}
              alt="Ad"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Source Type</Label>
              <Select value={sourceType} onValueChange={(v) => v && setSourceType(v as typeof sourceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="competitor">Competitor</SelectItem>
                  <SelectItem value="brand_own">Brand Own</SelectItem>
                  <SelectItem value="adjacent_category">Adjacent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Source Name</Label>
              <Input
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="Competitor name"
              />
            </div>

            <div className="space-y-2">
              <Label>Performance Tier</Label>
              <Select value={tier} onValueChange={(v) => v && setTier(v as typeof tier)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="winner">Winner (60+ days)</SelectItem>
                  <SelectItem value="performer">Performer (30-59)</SelectItem>
                  <SelectItem value="testing">Testing (&lt;30)</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Days Running</Label>
              <Input
                type="number"
                value={daysRunning}
                onChange={(e) => setDaysRunning(e.target.value)}
                placeholder="e.g., 45"
              />
            </div>

            <div className="space-y-2">
              <Label>Flag</Label>
              <Select value={flag || "none"} onValueChange={(v) => v && setFlag(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Flag</SelectItem>
                  <SelectItem value="reference">Reference</SelectItem>
                  <SelectItem value="ignore">Ignore</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Headline</Label>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Ad headline text"
              />
            </div>

            <div className="space-y-2">
              <Label>Primary Text</Label>
              <Input
                value={primaryText}
                onChange={(e) => setPrimaryText(e.target.value)}
                placeholder="Main ad copy"
              />
            </div>

            <div className="space-y-2">
              <Label>CTA</Label>
              <Input
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="Shop Now, Learn More, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <TagChipEditor tags={tags} onChange={setTags} />
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
