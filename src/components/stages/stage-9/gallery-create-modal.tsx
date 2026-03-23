"use client";

import { useState } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface GalleryCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  adIds: string[];
}

export function GalleryCreateModal({
  open,
  onOpenChange,
  brandId,
  adIds,
}: GalleryCreateModalProps) {
  const [title, setTitle] = useState("");
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  async function handleCreate() {
    if (!title) {
      toast.error("Title is required");
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await axios.post(`/api/brands/${brandId}/gallery`, {
        title,
        selected_ad_ids: adIds,
        is_password_protected: passwordProtected,
        password: passwordProtected ? password : undefined,
      });
      setShareUrl(data.data.share_url);
      toast.success("Gallery created!");
    } catch {
      toast.error("Failed to create gallery");
    } finally {
      setIsLoading(false);
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard");
  }

  if (shareUrl) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gallery Created</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Share Link</Label>
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="font-mono text-xs" />
              <Button onClick={handleCopyLink}>Copy</Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { onOpenChange(false); setShareUrl(""); setTitle(""); }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Shareable Gallery</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Gallery Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Spring Collection Concepts"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Password Protection</Label>
            <Switch checked={passwordProtected} onCheckedChange={setPasswordProtected} />
          </div>
          {passwordProtected && (
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Gallery password"
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {adIds.length} images will be included in this gallery
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Gallery"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
