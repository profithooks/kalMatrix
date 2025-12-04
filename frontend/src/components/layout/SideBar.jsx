import { NavLink } from "react-router-dom";
import { Activity, ListOrdered, AlertTriangle } from "lucide-react";
import { useUiStore } from "../../store/uiStore";

const navItems = [
  { to: "/", label: "Delivery Radar", icon: AlertTriangle },
  { to: "/epics", label: "Epics", icon: ListOrdered },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  return (
    <aside
      className={
        "h-screen border-r border-zinc-800 bg-surface transition-all duration-200 " +
        (sidebarCollapsed ? "w-16" : "w-64")
      }
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-accent">
            <Activity className="h-4 w-4 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-wide">KalMatrix</span>
              <span className="text-[11px] uppercase text-zinc-400">
                Delivery Radar
              </span>
            </div>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="text-zinc-400 hover:text-zinc-200"
        >
          {sidebarCollapsed ? "›" : "‹"}
        </button>
      </div>

      <nav className="mt-2 space-y-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors " +
                (isActive
                  ? "bg-accent text-white"
                  : "text-zinc-300 hover:bg-accentSoft hover:text-white")
              }
            >
              <Icon className="h-4 w-4" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
