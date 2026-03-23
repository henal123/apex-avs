import { create } from "zustand";
import type { TextOverlay, LogoOverlay, CompositingSpec } from "@/types/generation";
import { nanoid } from "nanoid";

interface CanvasState {
  textOverlays: TextOverlay[];
  logoOverlay: LogoOverlay | null;
  selectedOverlayId: string | null;
  canvasWidth: number;
  canvasHeight: number;
  undoStack: CompositingSpec[];
  redoStack: CompositingSpec[];

  addTextOverlay: (text?: string) => void;
  updateTextOverlay: (id: string, updates: Partial<TextOverlay>) => void;
  removeTextOverlay: (id: string) => void;
  setLogoOverlay: (logo: LogoOverlay | null) => void;
  setSelectedOverlay: (id: string | null) => void;
  loadSpec: (spec: CompositingSpec) => void;
  getSpec: () => CompositingSpec;
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  textOverlays: [],
  logoOverlay: null,
  selectedOverlayId: null,
  canvasWidth: 1080,
  canvasHeight: 1080,
  undoStack: [],
  redoStack: [],

  addTextOverlay: (text = "New Text") => {
    const overlay: TextOverlay = {
      id: nanoid(8),
      text,
      x: 540,
      y: 200,
      fontFamily: "Inter",
      fontSize: 48,
      fontWeight: "bold",
      fill: "#ffffff",
      textAlign: "center",
      textCase: "none",
      shadow: { enabled: false, color: "#000000", offsetX: 2, offsetY: 2, blur: 4 },
      background: { enabled: false, color: "#000000", opacity: 0.5, padding: 8, borderRadius: 4 },
    };
    get().pushUndo();
    set({ textOverlays: [...get().textOverlays, overlay], selectedOverlayId: overlay.id });
  },

  updateTextOverlay: (id, updates) => {
    set({
      textOverlays: get().textOverlays.map((o) =>
        o.id === id ? { ...o, ...updates } : o
      ),
    });
  },

  removeTextOverlay: (id) => {
    get().pushUndo();
    set({
      textOverlays: get().textOverlays.filter((o) => o.id !== id),
      selectedOverlayId: get().selectedOverlayId === id ? null : get().selectedOverlayId,
    });
  },

  setLogoOverlay: (logo) => {
    get().pushUndo();
    set({ logoOverlay: logo });
  },

  setSelectedOverlay: (id) => set({ selectedOverlayId: id }),

  loadSpec: (spec) => {
    set({
      textOverlays: spec.text_overlays || [],
      logoOverlay: spec.logo_overlay || null,
      canvasWidth: spec.canvas_width || 1080,
      canvasHeight: spec.canvas_height || 1080,
      undoStack: [],
      redoStack: [],
    });
  },

  getSpec: () => ({
    text_overlays: get().textOverlays,
    logo_overlay: get().logoOverlay,
    canvas_width: get().canvasWidth,
    canvas_height: get().canvasHeight,
  }),

  pushUndo: () => {
    const current = get().getSpec();
    set({
      undoStack: [...get().undoStack.slice(-49), current],
      redoStack: [],
    });
  },

  undo: () => {
    const stack = get().undoStack;
    if (stack.length === 0) return;
    const current = get().getSpec();
    const prev = stack[stack.length - 1];
    set({
      undoStack: stack.slice(0, -1),
      redoStack: [...get().redoStack, current],
      textOverlays: prev.text_overlays,
      logoOverlay: prev.logo_overlay,
    });
  },

  redo: () => {
    const stack = get().redoStack;
    if (stack.length === 0) return;
    const current = get().getSpec();
    const next = stack[stack.length - 1];
    set({
      redoStack: stack.slice(0, -1),
      undoStack: [...get().undoStack, current],
      textOverlays: next.text_overlays,
      logoOverlay: next.logo_overlay,
    });
  },
}));
