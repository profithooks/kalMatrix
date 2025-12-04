export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-neutral-950 p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-zinc-100"
          >
            Close
          </button>
        </div>
        <div className="text-sm text-zinc-200">{children}</div>
      </div>
    </div>
  );
}
