import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarMobileOpen: (open: boolean) => void;

  // Command palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Modals
  activeModal: string | null;
  modalData: unknown;
  openModal: (id: string, data?: unknown) => void;
  closeModal: () => void;

  // Calendar view
  calendarView: 'day' | 'week' | 'month' | 'agenda';
  calendarDate: Date;
  setCalendarView: (view: 'day' | 'week' | 'month' | 'agenda') => void;
  setCalendarDate: (date: Date) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),

      // Command palette
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      // Modals
      activeModal: null,
      modalData: null,
      openModal: (id, data) => set({ activeModal: id, modalData: data }),
      closeModal: () => set({ activeModal: null, modalData: null }),

      // Calendar
      calendarView: 'week',
      calendarDate: new Date(),
      setCalendarView: (view) => set({ calendarView: view }),
      setCalendarDate: (date) => set({ calendarDate: date }),
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        calendarView: state.calendarView,
      }),
    }
  )
);
