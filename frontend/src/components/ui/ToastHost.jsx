import { useToastStore } from "../../store/toastStore";

export default function ToastHost() {
  const { toasts, dismissToast } = useToastStore();

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2">
      {toasts.map((toast) => {
        let borderClass = "border-zinc-700";
        let bgClass = "bg-neutral-900/95";
        let textClass = "text-zinc-100";

        if (toast.type === "success") {
          borderClass = "border-emerald-500/60";
          bgClass = "bg-emerald-950/80";
          textClass = "text-emerald-50";
        } else if (toast.type === "error") {
          borderClass = "border-red-500/60";
          bgClass = "bg-red-950/80";
          textClass = "text-red-50";
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-xl border ${borderClass} ${bgClass} px-4 py-3 text-xs shadow-lg`}
          >
            <div className="flex-1">
              {toast.title && (
                <p className={`font-semibold ${textClass}`}>{toast.title}</p>
              )}
              {toast.message && (
                <p className="mt-0.5 text-zinc-200">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="ml-2 text-[11px] text-zinc-400 hover:text-zinc-100"
            >
              Close
            </button>
          </div>
        );
      })}
    </div>
  );
}
