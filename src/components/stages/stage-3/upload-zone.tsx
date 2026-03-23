"use client";

import { useState, useCallback } from "react";
import { Upload, ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressTracker } from "@/components/common/progress-tracker";
import { SourceTaggingModal } from "./source-tagging-modal";
import axios from "axios";
import { toast } from "sonner";

interface UploadZoneProps {
  brandId: string;
  onUploadComplete: () => void;
}

export function UploadZone({ brandId, onUploadComplete }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ total: 0, done: 0 });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showTagging, setShowTagging] = useState(false);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) =>
      ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(f.type)
    );
    if (validFiles.length === 0) {
      toast.error("No valid image files selected");
      return;
    }
    setPendingFiles(validFiles);
    setShowTagging(true);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  async function handleUpload(sourceType: string, sourceName: string) {
    setShowTagging(false);
    setIsUploading(true);
    setUploadProgress({ total: pendingFiles.length, done: 0 });

    // Upload in batches of 5
    const batchSize = 5;
    let completed = 0;

    for (let i = 0; i < pendingFiles.length; i += batchSize) {
      const batch = pendingFiles.slice(i, i + batchSize);
      const formData = new FormData();
      batch.forEach((f) => formData.append("files", f));
      formData.append("source_type", sourceType);
      formData.append("source_name", sourceName);

      try {
        await axios.post(`/api/brands/${brandId}/ads`, formData);
        completed += batch.length;
        setUploadProgress({ total: pendingFiles.length, done: completed });
      } catch {
        toast.error(`Failed to upload batch ${Math.floor(i / batchSize) + 1}`);
      }
    }

    toast.success(`${completed} ads uploaded`);
    setIsUploading(false);
    setPendingFiles([]);
    onUploadComplete();
  }

  if (isUploading) {
    return (
      <div className="rounded-lg border-2 border-dashed border-border p-8">
        <ProgressTracker
          total={uploadProgress.total}
          processed={uploadProgress.done}
          label="Uploading ads..."
        />
      </div>
    );
  }

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        )}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept = "image/png,image/jpeg,image/webp";
          input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) handleFiles(files);
          };
          input.click();
        }}
      >
        {isDragging ? (
          <ImagePlus className="h-10 w-10 text-primary" />
        ) : (
          <Upload className="h-10 w-10 text-muted-foreground" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium">
            {isDragging ? "Drop images here" : "Drag & drop ad images"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PNG, JPG, WebP — up to 10MB each, 100 images max
          </p>
        </div>
      </div>

      <SourceTaggingModal
        open={showTagging}
        onOpenChange={setShowTagging}
        fileCount={pendingFiles.length}
        onConfirm={handleUpload}
      />
    </>
  );
}
