import { create } from "zustand";
import type { AdLibraryAd } from "@/types/ad-library";

interface AdLibraryState {
  ads: AdLibraryAd[];
  selectedIds: string[];
  setAds: (ads: AdLibraryAd[]) => void;
  addAds: (ads: AdLibraryAd[]) => void;
  updateAd: (id: string, updates: Partial<AdLibraryAd>) => void;
  removeAds: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
}

export const useAdLibraryStore = create<AdLibraryState>((set, get) => ({
  ads: [],
  selectedIds: [],
  setAds: (ads) => set({ ads }),
  addAds: (newAds) => set({ ads: [...get().ads, ...newAds] }),
  updateAd: (id, updates) =>
    set({
      ads: get().ads.map((ad) => (ad.id === id ? { ...ad, ...updates } : ad)),
    }),
  removeAds: (ids) =>
    set({
      ads: get().ads.filter((ad) => !ids.includes(ad.id)),
      selectedIds: get().selectedIds.filter((id) => !ids.includes(id)),
    }),
  toggleSelection: (id) => {
    const { selectedIds } = get();
    set({
      selectedIds: selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id],
    });
  },
  selectAll: () => set({ selectedIds: get().ads.map((a) => a.id) }),
  clearSelection: () => set({ selectedIds: [] }),
}));
