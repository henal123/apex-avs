"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { ImagePlus } from "lucide-react";
import { AdCard } from "./ad-card";
import { AdDetailModal } from "./ad-detail-modal";
import type { AdLibraryAd } from "@/types/ad-library";

interface AdGalleryProps {
  ads: AdLibraryAd[];
  isLoading: boolean;
  brandId: string;
  onUpdate: () => void;
}

export function AdGallery({ ads, isLoading, brandId, onUpdate }: AdGalleryProps) {
  const [editingAd, setEditingAd] = useState<AdLibraryAd | null>(null);

  function handleDelete(id: string) {
    // Delete handled via API and refetch
    import("axios").then(({ default: axios }) => {
      axios.delete(`/api/brands/${brandId}/ads/${id}`).then(() => onUpdate());
    });
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (ads.length === 0) {
    return (
      <EmptyState
        icon={<ImagePlus className="h-12 w-12" />}
        title="No ads uploaded yet"
        description="Drag and drop or click the upload area above to add competitor ads"
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {ads.map((ad) => (
          <AdCard
            key={ad.id}
            ad={ad}
            onEdit={setEditingAd}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {editingAd && (
        <AdDetailModal
          ad={editingAd}
          brandId={brandId}
          open={!!editingAd}
          onOpenChange={(open) => !open && setEditingAd(null)}
          onUpdate={() => {
            onUpdate();
            setEditingAd(null);
          }}
        />
      )}
    </>
  );
}
