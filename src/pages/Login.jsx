// src/pages/Login.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useFont } from "../context/FontContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import { initNotifications, listenForMessages } from "../utils/firebase";

const Login = () => {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { setLoginData } = useAuth();
  const { themeColors } = useTheme();
  const { currentFont } = useFont();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, {
        email: credentials.email.trim(),
        password: credentials.password,
      });

      if (res.data.status === "success") {
        const loggedInUser = res.data.data.user;

        if (loggedInUser?.role !== "accountant") {
          setError("Access denied. This panel is for Accountants only.");
          return;
        }

        setLoginData({
          user: loggedInUser,
          token: res.data.token,
        });

        await initNotifications(res.data.token);
        listenForMessages();

        navigate("/dashboard", { replace: true });
      } else {
        setError(res.data.message || "Login failed");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Invalid credentials or server error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: themeColors.background,
        fontFamily: currentFont.family,
      }}
    >
      <div
        className="w-full max-w-sm p-6 rounded-2xl shadow-lg border"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        {/* Branding Section */}
        <div className="text-center mb-4">
          {/* <div className="w-full h-40 mx-auto mb-2 flex items-center justify-center p-1">
            <img
              src="/logo.png"
              alt="Cab booking Logo"
              className="w-full h-full object-contain"
            />
          </div> */}

          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: themeColors.primary }}
          >
            CRM Accountant
          </h1>

          <p
            className="text-xs"
            style={{ color: themeColors.textSecondary }}
          >
            Accountant Panel
          </p>
        </div>

        {/* Error Box */}
        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-center text-sm"
            style={{
              backgroundColor: themeColors.danger + "15",
              color: themeColors.danger,
              border: `1px solid ${themeColors.danger}30`,
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block mb-2 text-sm font-medium"
              style={{ color: themeColors.text }}
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={credentials.email}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: themeColors.background,
                color: themeColors.text,
                borderColor: themeColors.border,
              }}
              placeholder="Enter email address"
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block mb-2 text-sm font-medium"
              style={{ color: themeColors.text }}
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                required
                className="w-full p-3 pr-10 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                  borderColor: themeColors.border,
                }}
                placeholder="Enter your password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                style={{ color: themeColors.textSecondary }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
            style={{
              backgroundColor: themeColors.primary,
              color: themeColors.onPrimary,
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;