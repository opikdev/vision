import { create } from 'zustand';

export type DialogName = 'connect-ai';

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Size {
  width: number;
  height: number;
}

interface ViewStore {
  sidebarVisible: boolean;
  pageId: string | null;
  viewports: Record<string, Viewport>;
  canvasSize: Size | null;
  dialog: DialogName | null;
  toggleSidebar: () => void;
  selectPage: (pageId: string) => void;
  setViewport: (pageId: string, viewport: Viewport) => void;
  setCanvasSize: (size: Size) => void;
  openDialog: (dialog: DialogName) => void;
  closeDialog: () => void;
}

export const useViewStore = create<ViewStore>()((set) => ({
  sidebarVisible: true,
  pageId: null,
  viewports: {},
  canvasSize: null,
  dialog: null,
  toggleSidebar: () => {
    set(({ sidebarVisible }) => ({ sidebarVisible: !sidebarVisible }));
  },
  selectPage: (pageId) => {
    set({ pageId });
  },
  setViewport: (pageId, viewport) => {
    set(({ viewports }) => ({ viewports: { ...viewports, [pageId]: viewport } }));
  },
  setCanvasSize: (canvasSize) => {
    set({ canvasSize });
  },
  openDialog: (dialog) => {
    set({ dialog });
  },
  closeDialog: () => {
    set({ dialog: null });
  },
}));
