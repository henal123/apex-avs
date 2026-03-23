import { create } from "zustand";
import type { Brand } from "@/types/brand";

interface BrandState {
  brands: Brand[];
  activeBrand: Brand | null;
  setBrands: (brands: Brand[]) => void;
  setActiveBrand: (brand: Brand | null) => void;
  updateBrand: (id: string, updates: Partial<Brand>) => void;
}

export const useBrandStore = create<BrandState>((set, get) => ({
  brands: [],
  activeBrand: null,
  setBrands: (brands) => set({ brands }),
  setActiveBrand: (brand) => set({ activeBrand: brand }),
  updateBrand: (id, updates) => {
    const brands = get().brands.map((b) =>
      b.id === id ? { ...b, ...updates } : b
    );
    set({ brands });
    const active = get().activeBrand;
    if (active?.id === id) {
      set({ activeBrand: { ...active, ...updates } });
    }
  },
}));
