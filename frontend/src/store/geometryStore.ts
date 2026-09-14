import { create } from 'zustand';
import { GeometryElement, ToolType, DrawingData } from '../types/geometry';

interface GeometryState {
  elements: GeometryElement[];
  undoStack: GeometryElement[][];
  redoStack: GeometryElement[][];
  tool: ToolType;
  color: string;
  width: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  snapToPoint: boolean;
  selectedId: string | null;
  pendingPoints: string[];

  setTool: (t: ToolType) => void;
  setColor: (c: string) => void;
  setWidth: (w: number) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  setGridSize: (s: number) => void;
  toggleSnapToPoint: () => void;
  setSelected: (id: string | null) => void;

  addElement: (el: GeometryElement) => void;
  addElements: (els: GeometryElement[]) => void;
  updateElement: (id: string, patch: Record<string, any>) => void;
  removeElement: (id: string) => void;

  // ⭐ 标注偏移更新
  setLabelOffset: (id: string, offset: number | [number, number]) => void;

  addPendingPoint: (id: string) => void;
  setPendingPoints: (pts: string[]) => void;
  clearPending: () => void;

  undo: () => void;
  redo: () => void;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  loadFromJSON: (data: DrawingData | null) => void;
  toJSON: (canvasWidth: number, canvasHeight: number) => DrawingData;
}

export const useGeometryStore = create<GeometryState>((set, get) => ({
  elements: [],
  undoStack: [],
  redoStack: [],
  tool: 'select',
  color: '#000000',
  width: 2,
  showGrid: true,
  snapToGrid: false,
  gridSize: 20,
  snapToPoint: true,
  selectedId: null,
  pendingPoints: [],

  setTool: (t) => set({ tool: t, pendingPoints: [], selectedId: null }),
  setColor: (c) => set({ color: c }),
  setWidth: (w) => set({ width: w }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
  setGridSize: (s) => set({ gridSize: s }),
  toggleSnapToPoint: () => set((s) => ({ snapToPoint: !s.snapToPoint })),
  setSelected: (id) => set({ selectedId: id }),

  addElement: (el) => {
    const prev = get().elements;
    set({
      elements: [...prev, el],
      undoStack: [...get().undoStack, prev],
      redoStack: [],
    });
  },

  addElements: (els) => {
    if (!els || els.length === 0) return;
    const prev = get().elements;
    set({
      elements: [...prev, ...els],
      undoStack: [...get().undoStack, prev],
      redoStack: [],
    });
  },

  updateElement: (id, patch) => {
    const prev = get().elements;
    const next = prev.map((el) =>
      el.id === id ? ({ ...el, ...patch } as GeometryElement) : el
    );
    set({
      elements: next,
      undoStack: [...get().undoStack, prev],
      redoStack: [],
    });
  },

  removeElement: (id) => {
    const prev = get().elements;
    const next = prev.filter((el) => {
      if (el.id === id) return false;

      // 线类引用
      if ('from' in el && (el.from === id || el.to === id)) return false;

      // 角度类引用
      if ('vertex' in el) {
        const a = el as any;
        if (a.vertex === id || a.from === id || a.to === id) return false;
      }

      // 圆引用
      if ('center' in el && (el as any).center === id) return false;

      // 多边形引用
      if (el.type === 'polygon') {
        const pg = el as any;
        if (Array.isArray(pg.points) && pg.points.includes(id)) return false;
      }

      // ⭐ 标注联动删除
      if ('point' in el && (el as any).point === id) return false;
      if ('segment' in el && (el as any).segment === id) return false;
      if ('angle' in el && (el as any).angle === id) return false;

      return true;
    });
    set({
      elements: next,
      undoStack: [...get().undoStack, prev],
      redoStack: [],
      selectedId: null,
    });
  },

  // ⭐ 更新标注偏移
  setLabelOffset: (id, offset) => {
    const prev = get().elements;
    const next = prev.map((el) => {
      if (el.id !== id) return el;
      if (el.type === 'label-point') {
        return { ...el, offset: offset as [number, number] } as GeometryElement;
      }
      if (el.type === 'label-length') {
        return { ...el, offset: offset as number } as GeometryElement;
      }
      return el;
    });
    set({
      elements: next,
      undoStack: [...get().undoStack, prev],
      redoStack: [],
    });
  },

  addPendingPoint: (id) => set((s) => ({ pendingPoints: [...s.pendingPoints, id] })),
  setPendingPoints: (pts) => set({ pendingPoints: pts }),
  clearPending: () => set({ pendingPoints: [] }),

  undo: () => {
    const { undoStack, redoStack, elements } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    set({
      elements: prev,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, elements],
    });
  },

  redo: () => {
    const { undoStack, redoStack, elements } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    set({
      elements: next,
      undoStack: [...undoStack, elements],
      redoStack: redoStack.slice(0, -1),
    });
  },

  clear: () => {
    set({
      elements: [],
      undoStack: [...get().undoStack, get().elements],
      redoStack: [],
      selectedId: null,
      pendingPoints: [],
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  loadFromJSON: (data) => {
    if (!data || !Array.isArray(data.elements)) {
      set({ elements: [], undoStack: [], redoStack: [], selectedId: null, pendingPoints: [] });
      return;
    }
    set({
      elements: data.elements,
      undoStack: [],
      redoStack: [],
      selectedId: null,
      pendingPoints: [],
    });
  },

  toJSON: (canvasWidth, canvasHeight) => ({
    version: 1,
    canvas: { width: canvasWidth, height: canvasHeight },
    elements: get().elements,
  }),
}));