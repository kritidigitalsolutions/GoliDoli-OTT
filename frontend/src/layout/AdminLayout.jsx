import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import "./AdminLayout.css";

export default function AdminLayout() {
  const [theme, setTheme] = useState(() => localStorage.getItem("app-theme") || "light"); // "light" | "dark"
  const [showSidebar, setShowSidebar] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem("sidebar-collapsed") === "true");
  const location = useLocation();

  useEffect(() => {
    document.body.classList.toggle("light", theme === "light");
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", isCollapsed);
  }, [isCollapsed]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const toggleSidebar = () => setShowSidebar(!showSidebar);
  const toggleCollapse = () => setIsCollapsed((prev) => !prev);

  return (
    <div className={`app-shell ${theme} ${isCollapsed ? "collapsed" : ""}`}>
      <Sidebar
        theme={theme}
        showSidebar={showSidebar}
        toggleSidebar={toggleSidebar}
        isCollapsed={isCollapsed}
        toggleCollapse={toggleCollapse}
        closeSidebar={() => setShowSidebar(false)}
      />

      <div className="page-shell">
        <Topbar
          theme={theme}
          toggleTheme={toggleTheme}
          toggleSidebar={toggleSidebar}
          isCollapsed={isCollapsed}
          toggleCollapse={toggleCollapse}
        />

        <main className="page-body">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

