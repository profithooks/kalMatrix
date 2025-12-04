import { create } from "zustand";

let idCounter = 1;

export const useToastStore = create((set) => ({
  toasts: [],
  showToast: ({ title, message, type = "info", duration = 3000 }) => {
    const id = idCounter++;
    const toast = { id, title, message, type };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    if (duration && duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
