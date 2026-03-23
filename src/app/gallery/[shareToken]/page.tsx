"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface GalleryAd {
  id: string;
  concept_number: number;
  variant_number: number;
  raw_image_url: string;
  final_image_url: string | null;
}

interface GalleryData {
  title: string;
  description?: string;
  ads: GalleryAd[];
  requires_password?: boolean;
  view_count?: number;
}

export default function PublicGalleryPage() {
  const params = useParams();
  const shareToken = params.shareToken as string;
  const [gallery, setGallery] = useState<GalleryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);

  useEffect(() => {
    fetchGallery();
  }, [shareToken]);

  async function fetchGallery() {
    try {
      const resp = await fetch(`/api/gallery/${shareToken}`);
      const data = await resp.json();

      if (!resp.ok) {
        setError(data.error?.message || "Gallery not found");
        return;
      }

      if (data.data.requires_password) {
        setNeedsPassword(true);
      } else {
        setGallery(data.data);
      }
    } catch {
      setError("Failed to load gallery");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const resp = await fetch(`/api/gallery/${shareToken}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        setError("Incorrect password");
        setIsLoading(false);
        return;
      }

      setGallery(data.data);
      setNeedsPassword(false);
    } catch {
      setError("Verification failed");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !needsPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Gallery Not Found</h1>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm space-y-4 p-4">
          <h1 className="text-xl font-semibold text-center">Protected Gallery</h1>
          <p className="text-sm text-muted-foreground text-center">
            Enter the password to view this gallery
          </p>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Password"
            />
            <Button type="submit" className="w-full">
              View Gallery
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (!gallery) return null;

  // Group by concept
  const concepts: Record<number, GalleryAd[]> = {};
  for (const ad of gallery.ads) {
    if (!concepts[ad.concept_number]) concepts[ad.concept_number] = [];
    concepts[ad.concept_number].push(ad);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">{gallery.title}</h1>
          {gallery.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {gallery.description}
            </p>
          )}
        </div>

        {/* Ads by concept */}
        {Object.entries(concepts).map(([conceptNum, ads]) => (
          <div key={conceptNum} className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Concept {conceptNum}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ads.map((ad) => (
                <div key={ad.id} className="space-y-2">
                  <div className="relative aspect-square rounded-lg overflow-hidden border border-border">
                    <Image
                      src={ad.final_image_url || ad.raw_image_url}
                      alt={`Concept ${ad.concept_number} Variant ${ad.variant_number}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Variant {ad.variant_number}</Badge>
                    <a
                      href={ad.final_image_url || ad.raw_image_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-muted-foreground">
          Powered by Apex VisionX Studio
        </div>
      </div>
    </div>
  );
}
