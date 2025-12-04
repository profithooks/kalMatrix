export default function Card({ className = "", children }) {
  return (
    <div
      className={
        "rounded-2xl border border-zinc-800 bg-surface/80 p-4 shadow-sm " +
        className
      }
    >
      {children}
    </div>
  );
}
