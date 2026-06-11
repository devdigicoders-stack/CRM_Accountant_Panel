import { lazy } from "react";
import { FaTachometerAlt, FaBullhorn, FaCheckCircle, FaClipboardCheck, FaUpload, FaUser, FaLock, FaBell } from "react-icons/fa";

const Dashboard = lazy(() => import("../pages/Dashboard"));
const LeadManagement = lazy(() => import("../pages/LeadManagement"));
const VerifySales = lazy(() => import("../pages/VerifySales"));
const UploadInvoice = lazy(() => import("../pages/UploadInvoice"));
const Profile = lazy(() => import("../pages/Profile"));
const ChangePassword = lazy(() => import("../pages/ChangePassword"));
const LeadsList = lazy(() => import("../pages/LeadsList"));
const LeadDetails = lazy(() => import("../pages/LeadDetails"));
const Notifications = lazy(() => import("../pages/Notifications"));

const routes = [
  { path: "/dashboard", component: Dashboard, name: "Dashboard", icon: FaTachometerAlt },
  { path: "/lead-management", component: LeadManagement, name: "Lead Management", icon: FaBullhorn },
  { path: "/verify-sales", component: VerifySales, name: "Verify Sales", icon: FaCheckCircle },
  { path: "/upload-invoice", component: UploadInvoice, name: "Upload Invoice", icon: FaUpload },
  { path: "/notifications", component: Notifications, name: "Notifications", icon: FaBell },
  { path: "/profile", component: Profile, name: "My Profile", icon: FaUser },
  { path: "/change-password", component: ChangePassword, name: "Change Password", icon: FaLock },
  { path: "/leads-list", component: LeadsList, name: "Leads List", hide: true },
  { path: "/lead-details/:id", component: LeadDetails, name: "Lead Details", hide: true }
];

export default routes;
