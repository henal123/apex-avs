"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface GalleryImage {
  id: string;
  src: string;
  alt?: string;
  badges?: React.ReactNode;
}

interface ImageGalleryGridProps {
  images: GalleryImage[];
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onImageClick?: (image: GalleryImage) => void;
  columns?: number;
}

export function ImageGalleryGrid({
  images,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  onImageClick,
  columns = 4,
}: ImageGalleryGridProps) {
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  const imageRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const id = (entry.target as HTMLElement).dataset.imageId;
              if (id) setVisibleIds((prev) => new Set(prev).add(id));
            }
          });
        },
        { rootMargin: "200px" }
      );
    }
    observerRef.current.observe(node);
  }, []);

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  function toggleSelection(id: string) {
    if (!onSelectionChange) return;
    const next = selectedIds.includes(id)
      ? selectedIds.filter((s) => s !== id)
      : [...selectedIds, id];
    onSelectionChange(next);
  }

  return (
    <>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {images.map((image) => (
          <div
            key={image.id}
            ref={imageRef}
            data-image-id={image.id}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted cursor-pointer",
              selectedIds.includes(image.id) && "ring-2 ring-primary"
            )}
            onClick={() => {
              if (selectable) {
                toggleSelection(image.id);
              } else if (onImageClick) {
                onImageClick(image);
              } else {
                setLightboxImage(image);
              }
            }}
          >
            {visibleIds.has(image.id) && (
              <Image
                src={image.src}
                alt={image.alt || "Gallery image"}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes={`(max-width: 768px) 50vw, ${Math.round(100 / columns)}vw`}
              />
            )}
            {selectable && selectedIds.includes(image.id) && (
              <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </div>
            )}
            {image.badges && (
              <div className="absolute bottom-2 left-2 flex gap-1">
                {image.badges}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog
        open={!!lightboxImage}
        onOpenChange={() => setLightboxImage(null)}
      >
        <DialogContent className="max-w-4xl p-0">
          {lightboxImage && (
            <div className="relative aspect-video">
              <Image
                src={lightboxImage.src}
                alt={lightboxImage.alt || "Gallery image preview"}
                fill
                className="object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
