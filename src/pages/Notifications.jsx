import { memo, useState, useEffect } from "react";
import { FaBell, FaCheckDouble, FaFileInvoiceDollar, FaExclamationTriangle, FaInfoCircle, FaSpinner, FaCalendarTimes } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { toast } from "sonner";

const getIcon = (type) => {
  switch (type) {
    case "missed_followup": return <FaExclamationTriangle className="text-rose-500" />;
    case "missed_meeting": return <FaCalendarTimes className="text-rose-500" />;
    case "finance": return <FaFileInvoiceDollar className="text-emerald-500" />;
    case "general": return <FaInfoCircle className="text-indigo-500" />;
    case "alert": return <FaExclamationTriangle className="text-rose-500" />;
    default: return <FaBell className="text-gray-500" />;
  }
};

const formatTime = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString();
};

const Notifications = () => {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${baseUrl}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.status === "success") {
        setNotifications(res.data.data.notifications || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    const notif = notifications.find((n) => n._id === id);
    if (notif?.read) return;
    try {
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
      await axios.put(`${baseUrl}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      window.dispatchEvent(new Event("notifications-read"));
    } catch (err) {
      console.error(err);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: false } : n));
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (!unread.length) return;
    try {
      await Promise.all(
        unread.map((n) =>
          axios.put(`${baseUrl}/notifications/${n._id}/read`, {}, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
      window.dispatchEvent(new Event("notifications-read"));
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark all as read");
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <FaSpinner className="animate-spin text-3xl text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="relative">
              <FaBell className="text-2xl text-blue-500" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border border-white"></span>
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Notifications</h1>
          </div>
          <p className="text-sm text-gray-500">Stay updated with your account activities and alerts</p>
        </div>

        <button
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium border border-gray-200 bg-white text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaCheckDouble className={unreadCount === 0 ? "text-gray-400" : "text-blue-500"} />
          Mark all as read
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {notifications.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                onClick={() => markAsRead(notif._id)}
                className="p-5 flex gap-4 cursor-pointer transition-colors hover:bg-blue-50/30 group"
                style={{ backgroundColor: !notif.read ? "#eff6ff" : "transparent" }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gray-50 border border-gray-100 transition-transform group-hover:scale-110">
                  {getIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`text-sm truncate pr-4 ${!notif.read ? "font-bold text-gray-800" : "font-medium text-gray-700"}`}>
                      {notif.title}
                    </h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                      {formatTime(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{notif.message}</p>
                </div>

                <div className="flex items-center shrink-0 pl-2 w-4">
                  {!notif.read && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center">
            <FaBell className="mx-auto text-5xl text-gray-200 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700">All Caught Up!</h3>
            <p className="text-sm text-gray-400 mt-2">You have no new notifications right now.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(Notifications);
