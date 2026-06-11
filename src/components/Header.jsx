// src/components/Header.jsx
import { memo, useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaBell } from "react-icons/fa";


const Header = memo(({
  toggleSidebar,
  currentPageTitle
}) => {
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    if (!token) return;
    const fetchUnread = async () => {
      try {
        const res = await axios.get(`${baseUrl}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.status === "success") {
          const count = (res.data.data.notifications || []).filter((n) => !n.read).length;
          setUnreadCount(count);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    window.addEventListener("new-notification", fetchUnread);
    window.addEventListener("notifications-read", fetchUnread);
    return () => {
      clearInterval(interval);
      window.removeEventListener("new-notification", fetchUnread);
      window.removeEventListener("notifications-read", fetchUnread);
    };
  }, [token]);
  
  return (
    <>
      <header
        className="h-16 flex items-center justify-between px-4 border-b backdrop-blur-sm sticky top-0 z-40"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        <div className="flex items-center min-w-0 flex-1">
          <button
            onClick={toggleSidebar}
            className="lg:hidden mr-3 p-1.5 rounded-md hover:scale-110 transition-all duration-200"
            style={{
              color: themeColors.text,
              backgroundColor: themeColors.background
            }}
            aria-label="Open sidebar"
          >
            <span className="text-base">☰</span>
          </button>
          <h2
            className="text-sm font-semibold truncate"
            style={{
              color: themeColors.text,
              fontFamily: currentFont.family
            }}
          >
            {currentPageTitle}
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate("/notifications")}
            className="relative p-2 rounded-lg transition-all hover:scale-110"
            style={{ color: themeColors.text, backgroundColor: themeColors.background }}
            aria-label="Notifications"
          >
            <FaBell className="text-lg" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>
    </>
  );
});

Header.displayName = 'Header';
export default Header;