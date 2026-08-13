
import { Routes, Route } from "react-router-dom";
import { useState, createContext, useContext, useEffect, lazy, Suspense } from "react";

import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./layout/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// ── Lazy Loaded Dashboard Pages ──
const DashboardHome = lazy(() => import("./pages/Dashboard"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const AddContent = lazy(() => import("./pages/AddContent"));
const Content = lazy(() => import("./pages/Content"));
// const RatingsPage = lazy(() => import("./pages/Ratings"));
const PlansPage = lazy(() => import("./pages/Plans"));
// const PromoVoucher = lazy(() => import("./pages/PromoVoucher"));
const SubscriptionPage = lazy(() => import("./pages/Subscriptions"));
const NotificationsPage = lazy(() => import("./pages/Notifications"));
// const SupportDetails = lazy(() => import("./pages/SupportDetails"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const Settings = lazy(() => import("./pages/Settings"));
const CompanyInfoPage = lazy(() => import("./pages/CompanyInfo"));
const CategoriesPage = lazy(() => import("./pages/Categories"));
const IntroScreensPage = lazy(() => import("./pages/IntroScreens"));
const HomeBannersPage = lazy(() => import("./pages/HomeBanners"));
const DramaPage = lazy(() => import("./pages/Drama"));
const AddDramaPage = lazy(() => import("./pages/AddDrama"));

// ── Toast Context ──
const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

function App() {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Suspense
        fallback={
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              height: "100vh",
              background: "#0b0f1a",
              color: "#e2e8f0",
              gap: "16px",
              fontFamily: "system-ui, sans-serif"
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "4px solid rgba(255, 122, 26, 0.2)",
                borderTopColor: "#FF7A1A",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite"
              }}
            />
            <span style={{ fontSize: "0.95rem", fontWeight: 500, letterSpacing: "0.5px" }}>Loading...</span>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        }
      >
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<AdminLogin />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Secured Parent Route */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            {/* Nested Dashboard Routes */}
            <Route index element={<DashboardHome />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="add-content" element={<AddContent />} />
            <Route path="content" element={<Content />} />
            {/* <Route path="ratings" element={<RatingsPage />} /> */}
            <Route path="plans" element={<PlansPage />} />
            {/* <Route path="promo" element={<PromoVoucher />} /> */}
            <Route path="pricing" element={<SubscriptionPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            {/* <Route path="support" element={<SupportDetails />} /> */}
            <Route path="legal" element={<LegalPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="settings" element={<Settings />} />
            <Route path="company-info" element={<CompanyInfoPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="intro-screens" element={<IntroScreensPage />} />
            <Route path="home-banners" element={<HomeBannersPage />} />
            <Route path="dramas" element={<DramaPage />} />
            <Route path="add-drama" element={<AddDramaPage />} />
          </Route>
        </Routes>
      </Suspense>

      {/* Global Toast Component */}
      {toast && (
        <div className={`global-toast ${toast.type}`}>
          <div className="toast-content">
            <span className="toast-icon">{toast.type === "success" ? "✓" : "✕"}</span>
            <span className="toast-message">{toast.message}</span>
          </div>
          <div className="toast-progress" />
        </div>
      )}
    </ToastContext.Provider>
  );
}

export default App;