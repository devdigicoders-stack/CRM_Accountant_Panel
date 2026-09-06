import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import DashboardLayout from "./components/DashboardLayout";
import { Toaster, toast } from "sonner";
import routes from "./route/SidebarRaoute";
import { initNotifications, listenForMessages } from "./utils/firebase";

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading Admin Panel...</p>
    </div>
  </div>
);

function NotificationBanner({ onAllow, onDeny }) {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-fade-in">
      <div className="text-2xl">🔔</div>
      <div className="flex-1">
        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Enable Notifications</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Payment aur accounts alerts ke liye notifications enable karein.</p>
        <div className="flex gap-2 mt-3">
          <button 
            onClick={onAllow}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer"
          >
            Allow
          </button>
          <button 
            onClick={onDeny}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition cursor-pointer"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { isLoggedIn, loading, user, token, logout } = useAuth();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !token) return;

    if (typeof Notification !== "undefined") {
      if (Notification.permission === "default") {
        setShowBanner(true);
      } else if (Notification.permission === "granted") {
        initNotifications(token);
      }
    }

    listenForMessages();
  }, [isLoggedIn, token]);

  const handleAllow = async () => {
    setShowBanner(false);
    const fcmToken = await initNotifications(token);
    if (fcmToken) {
      toast.success("Notifications enabled successfully!");
    } else {
      toast.info("Notifications permission updated");
    }
  };

  const handleDeny = () => setShowBanner(false);

  if (loading) return <LoadingSpinner />;

  // If somehow a non-accountant is hydrated from localStorage, force logout
  if (!loading && user && user.role !== "accountant") {
    logout();
    return <Navigate to="/login" replace />;
  }

  return (
    <Router>
      <Toaster position="top-right" />
      {showBanner && <NotificationBanner onAllow={handleAllow} onDeny={handleDeny} />}
      <Routes>
        {/* Public */}
        <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login />} />

        {/* Protected */}
        {isLoggedIn ? (
          <Route element={<DashboardLayout />}>
            {routes.flatMap(route => (route.children ? route.children : route)).map(({ path, component: Component }) => (
              <Route
                key={path}
                path={path}
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <Component />
                  </Suspense>
                }
              />
            ))}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;