import "./Sidebar.css";
import { NavLink } from "react-router-dom";
// import { BarChart3, Users, Plus, Film, FileText, HelpCircle, CreditCard, Settings, LogOut } from "lucide-react";
import { X, BarChart3, Users, Plus, Film, FileText, HelpCircle, CreditCard, Settings, LogOut, Star, Bell, MessageSquare, Clapperboard, MapPin, Layers, Smartphone, Image as ImageIcon } from "lucide-react";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, color: "#FF7A1A" },
  { id: "users", label: "Users", icon: Users, color: "#3b82f6" },
  { id: "categories", label: "Categories", icon: Layers, color: "#a78bfa" },
  { id: "intro-screens", label: "Intro Screens", icon: Smartphone, color: "#ff4757" },
  { id: "home-banners", label: "Home Banners", icon: ImageIcon, color: "#FF7A1A" },
  { id: "add-content", label: "Add Content", icon: Plus, color: "#10b981" },
  { id: "content", label: "Content Library", icon: Film, color: "#f59e0b" },
  // { id: "add-drama", label: "Add Short Drama", icon: Plus, color: "#a78bfa" },
  // { id: "dramas", label: "Short Dramas", icon: Clapperboard, color: "#8b5cf6" },
  // { id: "ratings", label: "Ratings", icon: Star, color: "#facc15" },
  { id: "plans", label: "Subscription Plans", icon: CreditCard, color: "#ec4899" },
  // { id: "promo", label: "Promo&Voucher", icon: CreditCard, color: "#ec4899" },
  { id: "pricing", label: "Subscribed Users", icon: CreditCard, color: "#ec4899" },
  { id: "notifications", label: "Notifications", icon: Bell, color: "#f59e0b" },
  // { id: "support", label: "Support", icon: MessageSquare, color: "#06b6d4" },
  { id: "legal", label: "Legal", icon: FileText, color: "#8b5cf6" },
  { id: "help", label: "Help Center", icon: HelpCircle, color: "#06b6d4" },
  { id: "company-info", label: "Company Info", icon: MapPin, color: "#0ea5e9" },
  { id: "settings", label: "Settings", icon: Settings, color: "#64748b" },
];
export default function Sidebar({ theme, showSidebar, toggleSidebar, closeSidebar }) {
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <aside className={`sidebar ${showSidebar ? "open" : ""}`}>
      {/* ── Brand ── */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <img src="/favicon.jpeg" alt="Logo" />
        </div>
        <div>
          <div className="sidebar-title">GoliDoli</div>
          <div className="sidebar-tag">Admin Panel</div>
        </div>
        <button className="mobile-close-btn" onClick={toggleSidebar}>
          <X size={24} />
        </button>
      </div>
      {/* This is my sidebar  */}
      <div className="sidebar-divider" />

      {/* ── Nav ── */}
      <nav className="sidebar-nav">
        {NAV.map((item) => {
          const toPath = item.id === "dashboard" ? "/dashboard" : `/dashboard/${item.id}`;
          return (
            <NavLink
              key={item.id}
              to={toPath}
              end={item.id === "dashboard"}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              style={({ isActive }) => isActive ? { "--accent": item.color } : undefined}
              onClick={() => closeSidebar && closeSidebar()}
            >
              {({ isActive }) => (
                <>
                  <span className="nav-icon-wrap" style={isActive ? { background: item.color + "22", color: item.color } : undefined}>
                    <item.icon size={20} />
                  </span>
                  <span className="nav-label">{item.label}</span>
                  {isActive && <span className="nav-pill" style={{ background: item.color }} />}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="sidebar-footer">
        <div className="sidebar-divider" />
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} /> <span>Logout</span>
        </button>
        <p className="sidebar-version">v1.0 · {theme === "dark" ? "Dark Mode" : "Light Mode"}</p>
      </div>
    </aside>
  );
}
