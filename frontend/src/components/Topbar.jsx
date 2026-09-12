import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  Moon,
  Sun,
  X,
  Menu,
  User,
  LogOut,
  Mail,
  Shield,
  Clock,
  ChevronRight,
  CreditCard,
  Sparkles,
  Film,
  Tv,
  Zap,
  Headphones,
  HelpCircle,
  Loader2,
  BarChart3,
  Users,
  Plus,
  FileText,
  Settings,
  Clapperboard,
  MapPin,
  Layers,
  Smartphone,
  Image as ImageIcon,
  Compass
} from "lucide-react";
import "./Topbar.css";
import API from "../api/axios";

// Type → colour mapping (matches Notifications page)
const TYPE_COLORS = {
  GENERAL:     { bg: "rgba(245, 158, 11, 0.14)", color: "#d97706" },
  SYSTEM:      { bg: "rgba(59, 130, 246, 0.14)",  color: "#2563eb" },
  PLAN:        { bg: "rgba(139, 92, 246, 0.14)",  color: "#7c3aed" },
  PROMOTIONAL: { bg: "rgba(244, 63, 94, 0.14)",  color: "#e11d48" },
};

// Search category configuration for badges & icons
const SEARCH_CATEGORY_CONFIG = {
  Page: { icon: Compass, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)" },
  Action: { icon: Sparkles, color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" },
  User: { icon: User, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)" },
  Movie: { icon: Film, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
  Series: { icon: Tv, color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.12)" },
  Microdrama: { icon: Zap, color: "#ec4899", bg: "rgba(236, 72, 153, 0.12)" },
  "Audio Story": { icon: Headphones, color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" },
  Plan: { icon: CreditCard, color: "#06b6d4", bg: "rgba(6, 182, 212, 0.12)" },
  Notification: { icon: Bell, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
  Category: { icon: Layers, color: "#a78bfa", bg: "rgba(167, 139, 250, 0.12)" },
  Banner: { icon: ImageIcon, color: "#ff7a1a", bg: "rgba(255, 122, 26, 0.12)" },
  Help: { icon: HelpCircle, color: "#6366f1", bg: "rgba(99, 102, 241, 0.12)" },
};

// Admin panel pages, navigation elements & quick actions
const ADMIN_PAGES_AND_ACTIONS = [
  { title: "Dashboard Overview", subtitle: "Analytics, Stats & Charts", link: "/dashboard", type: "Page", icon: BarChart3, keywords: ["home", "dashboard", "stats", "overview", "analytics", "charts"] },
  { title: "Users Management", subtitle: "User accounts, registered users", link: "/dashboard/users", type: "Page", icon: Users, keywords: ["users", "accounts", "customers", "members", "profiles"] },
  { title: "Media Categories", subtitle: "Genres, labels & categories", link: "/dashboard/categories", type: "Page", icon: Layers, keywords: ["categories", "genres", "labels", "tags"] },
  { title: "Intro Screens", subtitle: "App onboarding & intro slides", link: "/dashboard/intro-screens", type: "Page", icon: Smartphone, keywords: ["intro", "onboarding", "screens", "slides"] },
  { title: "Home Banners", subtitle: "Hero banners & slider carousels", link: "/dashboard/home-banners", type: "Page", icon: ImageIcon, keywords: ["banners", "slides", "hero", "promotions", "home banner"] },
  { title: "Add Content", subtitle: "Upload movies, series & microdramas", link: "/dashboard/add-content", type: "Action", icon: Plus, keywords: ["add content", "upload movie", "add series", "upload video", "create content"] },
  { title: "Content Library", subtitle: "Manage Movies, Series & Microdramas", link: "/dashboard/content", type: "Page", icon: Film, keywords: ["content", "library", "movies", "series", "microdramas", "films", "shows"] },
  { title: "Add AI Reel", subtitle: "Upload short AI video reels", link: "/dashboard/add-ai-reel", type: "Action", icon: Plus, keywords: ["add ai reel", "upload reel", "create reel", "short video"] },
  { title: "AI Reels", subtitle: "AI reel feeds & video management", link: "/dashboard/ai-reels", type: "Page", icon: Clapperboard, keywords: ["reels", "ai reels", "shorts", "videos"] },
  { title: "Add Audio Story", subtitle: "Upload podcasts & audio narrations", link: "/dashboard/add-audio-story", type: "Action", icon: Plus, keywords: ["add audio", "upload podcast", "narration", "create audio"] },
  { title: "Audio Stories", subtitle: "Podcasts & audio content library", link: "/dashboard/audio-content", type: "Page", icon: Headphones, keywords: ["audio", "podcasts", "stories", "episodes", "narration"] },
  { title: "Subscription Plans", subtitle: "Pricing plans, features & tiers", link: "/dashboard/plans", type: "Page", icon: CreditCard, keywords: ["plans", "pricing", "subscriptions", "tiers", "payment", "passes"] },
  { title: "Subscribed Users", subtitle: "Active VIP & paid subscribers", link: "/dashboard/pricing", type: "Page", icon: User, keywords: ["subscribed users", "vip members", "active plans", "subscribers"] },
  { title: "Notifications Hub", subtitle: "Broadcast alerts & user push notifications", link: "/dashboard/notifications", type: "Page", icon: Bell, keywords: ["notifications", "broadcast", "alerts", "push", "send message"] },
  { title: "Legal Documents", subtitle: "Privacy policy, terms & legal agreements", link: "/dashboard/legal", type: "Page", icon: FileText, keywords: ["legal", "privacy", "terms", "policy", "agreement"] },
  { title: "Help Center", subtitle: "FAQs, support knowledgebase & articles", link: "/dashboard/help", type: "Page", icon: HelpCircle, keywords: ["help", "support", "faq", "kb", "knowledgebase"] },
  { title: "Company Info", subtitle: "Branding, contact details & address", link: "/dashboard/company-info", type: "Page", icon: MapPin, keywords: ["company", "branding", "contact", "address", "about"] },
  { title: "Settings", subtitle: "System configurations & admin settings", link: "/dashboard/settings", type: "Page", icon: Settings, keywords: ["settings", "config", "admin settings", "system"] },
];

export default function Topbar({ theme, toggleTheme, toggleSidebar, isCollapsed, toggleCollapse }) {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("Admin");
  const [adminData, setAdminData] = useState(null);

  // ── Global Search state ─────────────────────────────────────────────
  const [search, setSearch]               = useState("");
  const [results, setResults]             = useState([]);
  const [searchOpen, setSearchOpen]       = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);
  const searchTimerRef = useRef(null);

  // ── Notification state ──────────────────────────────────────────────
  const [notifCount,   setNotifCount]   = useState(0);
  const [notifList,    setNotifList]    = useState([]);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef(null);

  // Dropdown + Modal states
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // ================= FETCH ADMIN =================
  useEffect(() => {
    fetchAdmin();
    fetchNotifications();

    // Poll every 60 s so count stays fresh
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);

  const fetchAdmin = async () => {
    try {
      const res = await API.get("/admin/auth/profile");
      setAdminName(res.data.admin.name);
      setAdminData(res.data.admin);
    } catch (err) {
      console.error("Failed to fetch admin:", err);
    }
  };

  // ================= FETCH NOTIFICATIONS =================
  const fetchNotifications = async () => {
    try {
      setNotifLoading(true);
      const res = await API.get("/admin/notifications/");
      const data = res.data.data || [];
      setNotifList(data);
      setNotifCount(data.filter((n) => !n.isRead).length);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setNotifLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await API.patch(`/admin/notifications/${id}/read`);
      setNotifList((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setNotifCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  // ================= OMNI-SEARCH HANDLER =================
  const executeSearch = useCallback(async (query) => {
    const cleanQ = query.trim().toLowerCase();
    if (!cleanQ) {
      setResults([]);
      setSearchLoading(false);
      setSearchOpen(false);
      return;
    }

    setSearchLoading(true);
    setSearchOpen(true);

    // 1. Filter Admin Pages & Actions locally
    const matchedPages = ADMIN_PAGES_AND_ACTIONS.filter((p) => {
      return (
        p.title.toLowerCase().includes(cleanQ) ||
        p.subtitle.toLowerCase().includes(cleanQ) ||
        p.keywords.some((k) => k.includes(cleanQ))
      );
    }).map((p) => ({
      _id: `page-${p.title}`,
      title: p.title,
      subtitle: p.subtitle,
      type: p.type,
      link: p.link,
      customIcon: p.icon,
    }));

    // 2. Search Database Entities via Backend API
    try {
      const res = await API.get(`/admin/search?q=${encodeURIComponent(cleanQ)}`);
      const dbResults = res.data.data || [];
      setResults([...matchedPages, ...dbResults].slice(0, 14));
    } catch (err) {
      console.error("Search error:", err);
      setResults(matchedPages);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (value) => {
    setSearch(value);
    if (!value.trim()) {
      setResults([]);
      setSearchOpen(false);
      setSearchLoading(false);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      return;
    }

    setSearchOpen(true);
    setSearchLoading(true);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      executeSearch(value);
    }, 220);
  };

  const handleSelect = (item) => {
    if (item.link) {
      if (["Movie", "Series", "Microdrama"].includes(item.type)) {
        const contentTypeMap = {
          Movie: "movies",
          Series: "series",
          Microdrama: "microdramas",
        };
        navigate(item.link, { state: { contentType: contentTypeMap[item.type] || "movies" } });
      } else {
        navigate(item.link);
      }
    } else if (item.type === "User") {
      navigate("/dashboard/users");
    } else if (["Movie", "Series", "Microdrama"].includes(item.type)) {
      navigate("/dashboard/content", { state: { contentType: item.type.toLowerCase() + (item.type === "Series" ? "" : "s") } });
    } else if (item.type === "Audio Story") {
      navigate("/dashboard/audio-content");
    } else if (item.type === "Help") {
      navigate("/dashboard/help");
    } else if (item.type === "Plan") {
      navigate("/dashboard/plans");
    }

    setSearch("");
    setResults([]);
    setSearchOpen(false);
  };

  const handleClearSearch = () => {
    setSearch("");
    setResults([]);
    setSearchOpen(false);
  };

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };

    const keyHandler = (e) => {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, []);

  // ================= LOGOUT =================
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  // ================= CLOSE MENU =================
  useEffect(() => {
    const handleClickOutside = () => setShowMenu(false);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <>
      <header className="topbar">
        {/* LEFT — Greeting */}
        <div className="topbar-left">
          <button
            className="mobile-menu-btn"
            onClick={() => {
              if (window.innerWidth <= 991) {
                toggleSidebar && toggleSidebar();
              } else {
                toggleCollapse && toggleCollapse();
              }
            }}
            title="Toggle Sidebar"
          >
            <Menu size={22} />
          </button>
          <div className="topbar-info">
            <h2 className="topbar-greeting">
              Welcome back, <span className="topbar-name">{adminName}</span>
            </h2>
            <p className="topbar-date">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* RIGHT — Actions */}
        <div className="topbar-actions">
          {/* ── Global Search Bar ── */}
          <div className="topbar-search-container" ref={searchRef}>
            <div className={`topbar-search ${searchOpen ? "search-focused" : ""}`}>
              {searchLoading ? (
                <Loader2 size={16} className="search-ico search-spin" />
              ) : (
                <Search size={16} className="search-ico" />
              )}

              <input
                type="text"
                placeholder="Search pages, actions, movies, users..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (search.trim()) setSearchOpen(true);
                }}
              />

              {search && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={handleClearSearch}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* 🔥 SEARCH RESULTS DROPDOWN */}
            {searchOpen && (
              <div className="search-dropdown-panel">
                {searchLoading ? (
                  <div className="search-dropdown-state">
                    <Loader2 size={18} className="search-spin" />
                    <span>Searching database...</span>
                  </div>
                ) : results.length === 0 ? (
                  <div className="search-dropdown-state">
                    <Search size={22} opacity={0.3} />
                    <p className="search-empty-msg">No results found for &ldquo;{search}&rdquo;</p>
                    <span className="search-empty-sub">Try searching by title, user email, or genre</span>
                  </div>
                ) : (
                  <div className="search-results-list">
                    <div className="search-dropdown-header">
                      <span>Search Results ({results.length})</span>
                    </div>

                    {results.map((item, i) => {
                      const catConfig = SEARCH_CATEGORY_CONFIG[item.type] || SEARCH_CATEGORY_CONFIG.User;
                      const IconComponent = item.customIcon || catConfig.icon;

                      return (
                        <div
                          key={item._id || i}
                          className="search-item-row"
                          onClick={() => handleSelect(item)}
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="search-item-thumb"
                              onError={(e) => { e.target.style.display = "none"; }}
                            />
                          ) : (
                            <div
                              className="search-item-icon-box"
                              style={{ background: catConfig.bg, color: catConfig.color }}
                            >
                              <IconComponent size={15} />
                            </div>
                          )}

                          <div className="search-item-details">
                            <span className="search-item-title">{item.title || item.name}</span>
                            {item.subtitle && (
                              <span className="search-item-sub">{item.subtitle}</span>
                            )}
                          </div>

                          <span
                            className="search-item-badge"
                            style={{ background: catConfig.bg, color: catConfig.color }}
                          >
                            {item.type}
                          </span>

                          <ChevronRight size={14} className="search-item-arrow" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Notification Bell ── */}
          <div className="notif-bell-wrap" ref={notifRef}>
            <button
              className={`action-btn notif-btn ${notifOpen ? "notif-btn-active" : ""}`}
              title="Notifications"
              onClick={() => setNotifOpen((o) => !o)}
            >
              <Bell size={19} />
              {notifCount > 0 && (
                <span className="notif-badge">
                  {notifCount > 99 ? "99+" : notifCount}
                </span>
              )}
            </button>

            {/* ── Dropdown panel ── */}
            {notifOpen && (
              <div className="notif-panel">
                {/* Header */}
                <div className="notif-panel-head">
                  <div className="notif-panel-head-left">
                    <span className="notif-panel-icon-box">
                      <Bell size={15} />
                    </span>
                    <span className="notif-panel-title">Notifications</span>
                    {notifCount > 0 && (
                      <span className="notif-panel-count">{notifCount} new</span>
                    )}
                  </div>
                  <button
                    className="notif-panel-close"
                    onClick={() => setNotifOpen(false)}
                    title="Close"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Body */}
                <div className="notif-panel-body">
                  {notifLoading ? (
                    <div className="notif-panel-empty">
                      <span className="notif-spin-icon"><Clock size={20} /></span>
                      <p>Fetching notifications...</p>
                    </div>
                  ) : notifList.filter(n => !n.isRead).length === 0 ? (
                    <div className="notif-panel-empty">
                      <div className="notif-empty-bell-icon">
                        <Bell size={26} />
                      </div>
                      <p className="notif-empty-title">All caught up!</p>
                      <p className="notif-empty-sub">No unread notifications at this time.</p>
                    </div>
                  ) : (
                    notifList
                      .filter((n) => !n.isRead)
                      .slice(0, 6)
                      .map((n) => {
                        const typeKey = n.type && TYPE_COLORS[n.type] ? n.type : "GENERAL";
                        const cfg = TYPE_COLORS[typeKey] || TYPE_COLORS.GENERAL;
                        return (
                          <div
                            key={n._id}
                            className="notif-panel-item"
                            onClick={() => markAsRead(n._id)}
                          >
                            <div
                              className="notif-panel-item-icon"
                              style={{ background: cfg.bg, color: cfg.color }}
                            >
                              {n.type === "SYSTEM" ? (
                                <Shield size={14} />
                              ) : n.type === "PLAN" ? (
                                <CreditCard size={14} />
                              ) : n.type === "PROMOTIONAL" ? (
                                <Sparkles size={14} />
                              ) : (
                                <Bell size={14} />
                              )}
                            </div>

                            <div className="notif-panel-text">
                              <div className="notif-panel-item-row">
                                <p className="notif-panel-item-title">
                                  {n.title}
                                </p>
                                <span className="notif-unread-dot" />
                              </div>
                              <p className="notif-panel-item-date">
                                {new Date(n.createdAt || n.sentAt || Date.now()).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>

                            <ChevronRight size={14} className="notif-item-arrow" />
                          </div>
                        );
                      })
                  )}
                </div>

                {/* Footer */}
                <div className="notif-panel-foot">
                  <button
                    className="notif-panel-view-all"
                    onClick={() => {
                      navigate("/dashboard/notifications");
                      setNotifOpen(false);
                    }}
                  >
                    View All Notifications <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modern Premium Theme Toggle Switch */}
          <button
            type="button"
            className={`theme-toggle-switch ${theme}`}
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
            aria-label="Toggle Theme"
          >
            <div className="theme-switch-track">
              <div className="theme-switch-thumb">
                {theme === "dark" ? <Moon size={12} /> : <Sun size={12} />}
              </div>
            </div>
          </button>

          {/* Avatar + Dropdown */}
          <div className="admin-menu">
            <div
              className="admin-avatar"
              title={adminName}
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              {adminName.charAt(0).toUpperCase()}
            </div>

            {showMenu && (
              <div className="dropdown-menu">
                <div
                  className="dropdown-item"
                  onClick={() => {
                    setShowProfile(true);
                    setShowMenu(false);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <User size={16} /> View Profile
                </div>

                <div
                  className="dropdown-item logout"
                  onClick={handleLogout}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <LogOut size={16} /> Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================= PROFILE MODAL ================= */}
      {showProfile && (
        <div
          className="profile-overlay"
          onClick={() => setShowProfile(false)}
        >
          <div
            className="profile-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profile-header">
              <h2>Admin Panel Profile</h2>
              <button
                className="profile-close-btn"
                onClick={() => setShowProfile(false)}
                aria-label="Close Profile"
              >
                <X size={16} />
              </button>
            </div>

            <div className="profile-body">
              {/* Avatar Frame with pulsing ring & status badge */}
              <div className="profile-avatar-wrapper">
                <div className="profile-avatar-glow" />
                <div className="profile-avatar">
                  {adminName.charAt(0).toUpperCase()}
                </div>
                <div className="profile-status-badge">
                  <span className="pulse-dot" />
                  ONLINE
                </div>
              </div>

              <h3 className="profile-name">{adminData?.name || "System Admin"}</h3>
              <div className="profile-role-pill">
                {adminData?.role || "SUPER ADMIN"}
              </div>

              {/* Grid of info cards */}
              <div className="profile-info-grid">
                <div className="profile-info-card">
                  <div className="info-card-icon-wrapper">
                    <Mail size={18} />
                  </div>
                  <div className="info-card-content">
                    <span className="info-card-label">Email Address</span>
                    <span className="info-card-value">{adminData?.email || "admin@golidoli.com"}</span>
                  </div>
                </div>

                <div className="profile-info-card">
                  <div className="info-card-icon-wrapper">
                    <Shield size={18} />
                  </div>
                  <div className="info-card-content">
                    <span className="info-card-label">Access Level</span>
                    <span className="info-card-value">Full Permissions</span>
                  </div>
                </div>

                <div className="profile-info-card">
                  <div className="info-card-icon-wrapper">
                    <Clock size={18} />
                  </div>
                  <div className="info-card-content">
                    <span className="info-card-label">Last Login</span>
                    <span className="info-card-value">Current Session</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}