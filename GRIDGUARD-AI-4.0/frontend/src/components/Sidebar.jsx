import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/map", label: "Risk Map" },
  { to: "/alerts", label: "Alert Center" },
  { to: "/reports", label: "Reports" }
];

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-64 px-6 py-8 bg-slateblue/70 border-r border-white/5">
      <div className="text-2xl font-display font-semibold mb-10">GRIDGUARD AI 4.0</div>
      <nav className="space-y-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `block px-4 py-3 rounded-xl transition ${
                isActive ? "bg-teal/20 text-teal" : "text-white/70 hover:bg-white/5"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto pt-6 text-xs text-white/50">Role-based access enabled</div>
    </aside>
  );
}
