import React, { useState, useMemo } from "react";
import axios from "axios";
import {
  FaRupeeSign,
  FaCalendarDay,
  FaCalendarAlt,
  FaCheckCircle,
  FaMoneyBillWave,
  FaHandHoldingUsd,
  FaSearch,
  FaEye,
  FaTimes,
  FaSync,
  FaFileInvoiceDollar,
  FaFileExcel,
  FaDownload,
  FaUserTie,
  FaPhoneAlt,
  FaExternalLinkAlt
} from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { toast } from "sonner";

const formatINR = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(num);
};

export default function SalesRevenueWidget({
  salesData,
  baseUrl,
  token,
  onRefresh
}) {
  const [activeTab, setActiveTab] = useState("day"); // 'day' | 'month'
  const [dayRangeFilter, setDayRangeFilter] = useState("30"); // '7' | '15' | '30' | 'all' | 'custom'
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [tableSearch, setTableSearch] = useState("");

  // Drilldown modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalLeads, setModalLeads] = useState([]);
  const [modalTotal, setModalTotal] = useState(0);
  const [modalPage, setModalPage] = useState(1);
  const [modalTarget, setModalTarget] = useState({ date: null, month: null });
  const [modalSearch, setModalSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const summary = salesData?.summary || {};
  const today = summary.today || { count: 0, revenue: 0, amountPaid: 0, pendingAmount: 0 };
  const yesterday = summary.yesterday || { count: 0, revenue: 0, amountPaid: 0, pendingAmount: 0 };
  const thisMonth = summary.thisMonth || { count: 0, revenue: 0, amountPaid: 0, pendingAmount: 0 };
  const lastMonth = summary.lastMonth || { count: 0, revenue: 0, amountPaid: 0, pendingAmount: 0 };
  const total = summary.total || { count: 0, revenue: 0, amountPaid: 0, pendingAmount: 0 };

  const rawDayWise = useMemo(() => salesData?.dayWise || [], [salesData]);
  const rawMonthWise = useMemo(() => salesData?.monthWise || [], [salesData]);

  // Filter day-wise records based on quick filter / custom date
  const filteredDayWise = useMemo(() => {
    let list = [...rawDayWise];

    if (dayRangeFilter === "7") {
      list = list.slice(0, 7);
    } else if (dayRangeFilter === "15") {
      list = list.slice(0, 15);
    } else if (dayRangeFilter === "30") {
      list = list.slice(0, 30);
    } else if (dayRangeFilter === "custom") {
      if (customStartDate) list = list.filter((d) => d.date >= customStartDate);
      if (customEndDate) list = list.filter((d) => d.date <= customEndDate);
    }

    if (tableSearch) {
      const q = tableSearch.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.date.toLowerCase().includes(q) ||
          d.formattedDate?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [rawDayWise, dayRangeFilter, customStartDate, customEndDate, tableSearch]);

  // Filter month-wise records
  const filteredMonthWise = useMemo(() => {
    let list = [...rawMonthWise];
    if (tableSearch) {
      const q = tableSearch.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.month.toLowerCase().includes(q) ||
          m.monthLabel?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rawMonthWise, tableSearch]);

  // Chart data
  const chartData = useMemo(() => {
    if (activeTab === "day") {
      return [...filteredDayWise].slice(0, 15).reverse().map((d) => ({
        label: d.formattedDate?.replace(/ \d{4}$/, "") || d.date,
        revenue: d.revenue,
        count: d.count,
        paid: d.amountPaid,
        pending: d.pendingAmount
      }));
    } else {
      return [...filteredMonthWise].slice(0, 12).reverse().map((m) => ({
        label: m.monthLabel || m.month,
        revenue: m.revenue,
        count: m.count,
        paid: m.amountPaid,
        pending: m.pendingAmount
      }));
    }
  }, [activeTab, filteredDayWise, filteredMonthWise]);

  // Drilldown leads fetch
  const handleOpenDrilldown = async (params) => {
    const { date, month, label } = params;
    setModalTarget({ date, month });
    setModalTitle(label || date || month);
    setModalOpen(true);
    setModalPage(1);
    setModalSearch("");
    await fetchDrilldownLeads({ date, month, page: 1 });
  };

  const fetchDrilldownLeads = async ({ date, month, page = 1 }) => {
    if (!baseUrl || !token) return;
    setModalLoading(true);
    try {
      const q = new URLSearchParams();
      if (date) q.append("date", date);
      if (month) q.append("month", month);
      q.append("page", page);
      q.append("limit", 1000); // Fetch all approved sales leads for this period
      q.append("details", "true");

      const res = await axios.get(`${baseUrl}/accounts/sales-revenue?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.status === "success") {
        setModalLeads(res.data.data.leads?.leads || []);
        setModalTotal(res.data.data.leads?.total || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load approved sales leads");
    } finally {
      setModalLoading(false);
    }
  };

  const exportLeadsToCSVFallback = (leads, label) => {
    if (!leads || leads.length === 0) {
      toast.error("No sales records to export");
      return;
    }
    const headers = [
      "S.No",
      "Customer Name",
      "Phone",
      "Email",
      "City",
      "State",
      "Sales Representative",
      "Deal Value (INR)",
      "Amount Paid (INR)",
      "Pending Amount (INR)",
      "Payment Status",
      "Verification Status",
      "Approved Date"
    ];
    const rows = leads.map((l, i) => [
      i + 1,
      `"${(l.name || "").replace(/"/g, '""')}"`,
      `"${l.phone || ""}"`,
      `"${l.email || ""}"`,
      `"${l.city || ""}"`,
      `"${l.state || ""}"`,
      `"${(l.salesPersonName || "Unassigned").replace(/"/g, '""')}"`,
      l.dealValue || 0,
      l.amountPaid || 0,
      l.pendingAmount || 0,
      `"${(l.paymentStatus || "verified").toUpperCase()}"`,
      `"${(l.verificationStatus || "approved").toUpperCase()}"`,
      `"${l.effectiveDate ? new Date(l.effectiveDate).toLocaleDateString("en-IN") : (l.dateStr || "")}"`
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Approved_Sales_${label}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    toast.success(`Sales report for ${label} downloaded!`);
  };

  const handleExportExcel = async (targetOverride) => {
    const target = targetOverride || modalTarget;
    if (!baseUrl || !token) return;
    setIsExporting(true);
    const fileLabel = target?.month || target?.date || "All";
    try {
      const q = new URLSearchParams();
      if (target?.date) q.append("date", target.date);
      if (target?.month) q.append("month", target.month);

      const res = await axios.get(`${baseUrl}/accounts/sales-revenue/export/excel?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob"
      });

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Approved_Sales_${fileLabel}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Excel Sheet for ${fileLabel} downloaded successfully!`);
    } catch (err) {
      console.warn("Direct excel download error, using fallback CSV:", err);
      exportLeadsToCSVFallback(modalLeads, fileLabel);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredModalLeads = useMemo(() => {
    if (!modalSearch) return modalLeads;
    const q = modalSearch.toLowerCase().trim();
    return modalLeads.filter(
      (l) =>
        l.name?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.city?.toLowerCase().includes(q) ||
        l.salesPersonName?.toLowerCase().includes(q)
    );
  }, [modalLeads, modalSearch]);

  const getMediaUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const srv = baseUrl ? baseUrl.replace(/\/api\/v1\/?$/, "") : "";
    return `${srv}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      {/* Header section with live badge */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">
              Real-Time Sales & Revenue Count
            </h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-xs mt-1 text-gray-500 font-medium">
            Exact day-wise & month-wise sales count & revenue — counted immediately after{" "}
            <span className="font-semibold text-emerald-600">Accounts Verification</span> &{" "}
            <span className="font-semibold text-blue-600">Super Admin Approval</span> (prior to installation).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all shadow-xs"
            >
              <FaSync className="text-xs" />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Top 3 Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Today's Sales Card */}
        <div className="relative overflow-hidden rounded-xl border border-blue-100 p-5 bg-gradient-to-br from-blue-50/50 to-white hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                  Today's Sales
                </span>
                <span className="text-xs font-medium text-gray-500">
                  {today.formattedDate || today.date}
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900">
                  {today.count}
                </span>
                <span className="text-sm font-semibold text-blue-600">Approved Sales</span>
              </div>
              <div className="text-xl font-bold mt-1 text-emerald-600">
                {formatINR(today.revenue)}
              </div>
            </div>

            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-lg">
              <FaCalendarDay />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-blue-100/70 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[11px] block text-gray-500">Amount Received</span>
              <span className="font-bold text-emerald-600">{formatINR(today.amountPaid)}</span>
            </div>
            <div>
              <span className="text-[11px] block text-gray-500">Pending / COD</span>
              <span className="font-bold text-amber-600">{formatINR(today.pendingAmount)}</span>
            </div>
          </div>

          {yesterday.count > 0 && (
            <div className="mt-2 text-[11px] font-medium text-gray-500">
              Yesterday: <span className="font-semibold text-gray-700">{yesterday.count} Sales ({formatINR(yesterday.revenue)})</span>
            </div>
          )}
        </div>

        {/* This Month's Sales Card */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-100 p-5 bg-gradient-to-br from-emerald-50/50 to-white hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                  This Month
                </span>
                <span className="text-xs font-medium text-gray-500">
                  {thisMonth.monthLabel || thisMonth.month}
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900">
                  {thisMonth.count}
                </span>
                <span className="text-sm font-semibold text-emerald-600">Approved Sales</span>
              </div>
              <div className="text-xl font-bold mt-1 text-emerald-600">
                {formatINR(thisMonth.revenue)}
              </div>
            </div>

            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg">
              <FaCalendarAlt />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-100/70 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[11px] block text-gray-500">Amount Received</span>
              <span className="font-bold text-emerald-600">{formatINR(thisMonth.amountPaid)}</span>
            </div>
            <div>
              <span className="text-[11px] block text-gray-500">Pending / COD</span>
              <span className="font-bold text-amber-600">{formatINR(thisMonth.pendingAmount)}</span>
            </div>
          </div>

          {lastMonth.count > 0 && (
            <div className="mt-2 text-[11px] font-medium text-gray-500">
              Last Month: <span className="font-semibold text-gray-700">{lastMonth.count} Sales ({formatINR(lastMonth.revenue)})</span>
            </div>
          )}
        </div>

        {/* Total Verified & Approved Sales Card */}
        <div className="relative overflow-hidden rounded-xl border border-indigo-100 p-5 bg-gradient-to-br from-indigo-50/50 to-white hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
                  Total Approved Sales
                </span>
                <span className="text-xs font-medium text-gray-500">All-Time</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900">
                  {total.count}
                </span>
                <span className="text-sm font-semibold text-indigo-600">Total Count</span>
              </div>
              <div className="text-xl font-bold mt-1 text-emerald-600">
                {formatINR(total.revenue)}
              </div>
            </div>

            <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg">
              <FaRupeeSign />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-indigo-100/70 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[11px] block text-gray-500">Total Received</span>
              <span className="font-bold text-emerald-600">{formatINR(total.amountPaid)}</span>
            </div>
            <div>
              <span className="text-[11px] block text-gray-500">Total Pending / COD</span>
              <span className="font-bold text-amber-600">{formatINR(total.pendingAmount)}</span>
            </div>
          </div>

          <div className="mt-2 text-[11px] font-medium text-gray-500">
            Accounts + Super Admin: <span className="font-semibold text-emerald-600">100% Fully Verified</span>
          </div>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2 p-1 rounded-xl border border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab("day")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "day"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <FaCalendarDay className="text-xs" />
            Day-Wise Sales & Revenue
          </button>
          <button
            onClick={() => setActiveTab("month")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "month"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <FaCalendarAlt className="text-xs" />
            Month-Wise Sales & Revenue
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "day" && (
            <div className="flex items-center gap-1">
              {[
                { id: "7", label: "7 Days" },
                { id: "15", label: "15 Days" },
                { id: "30", label: "30 Days" },
                { id: "all", label: "All" },
                { id: "custom", label: "Custom" }
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setDayRangeFilter(pill.id)}
                  className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all ${
                    dayRangeFilter === pill.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          )}

          {activeTab === "day" && dayRangeFilter === "custom" && (
            <div className="flex items-center gap-1 text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="p-1 rounded border border-gray-200 text-xs text-gray-800"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="p-1 rounded border border-gray-200 text-xs text-gray-800"
              />
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              placeholder={`Search ${activeTab === "day" ? "date (e.g. 2026-10)" : "month"}...`}
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
            />
            <FaSearch className="absolute left-2.5 top-2 text-[10px] text-gray-400" />
          </div>
        </div>
      </div>

      {/* Mini Visual Chart for Sales Revenue Trend */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              {activeTab === "day" ? "Recent Daily Revenue Trend (₹)" : "Monthly Revenue Trend (₹)"}
            </span>
            <span className="text-[11px] text-gray-400">
              Bars represent Total Deal Value (₹)
            </span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                  dy={5}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  cursor={{ fill: "rgba(37,99,235,0.06)" }}
                  formatter={(val, name) => [
                    name === "revenue" ? formatINR(val) : val,
                    name === "revenue" ? "Total Revenue" : "Sales Count"
                  ]}
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E5E7EB",
                    borderRadius: "8px",
                    color: "#1F2937",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                  }}
                />
                <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === chartData.length - 1 ? "#2563EB" : "#93C5FD"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed Breakdown Table */}
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                  {activeTab === "day" ? "Date" : "Month"}
                </th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-center text-gray-500">
                  Approved Sales Count
                </th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-right text-gray-500">
                  Total Deal Revenue
                </th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-right text-gray-500">
                  Amount Received / Paid
                </th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-right text-gray-500">
                  Pending / COD
                </th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-center text-gray-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {activeTab === "day" ? (
                filteredDayWise.length > 0 ? (
                  filteredDayWise.map((row, idx) => (
                    <tr
                      key={row.date}
                      className="hover:bg-blue-50/40 transition-colors border-b border-gray-50 last:border-none"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-800">
                            {row.formattedDate || row.date}
                          </span>
                          <span className="text-[11px] font-mono text-gray-400">
                            {row.date}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                          <FaCheckCircle className="text-[10px]" />
                          {row.count} {row.count === 1 ? "Sale" : "Sales"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-sm font-extrabold text-gray-900">
                          {formatINR(row.revenue)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-sm font-bold text-emerald-600">
                          {formatINR(row.amountPaid)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-sm font-bold text-amber-600">
                          {formatINR(row.pendingAmount)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              handleOpenDrilldown({
                                date: row.date,
                                label: `Sales on ${row.formattedDate || row.date}`
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-xs"
                          >
                            <FaEye className="text-xs" />
                            View Sales ({row.count})
                          </button>
                          <button
                            onClick={() =>
                              handleExportExcel({
                                date: row.date,
                                label: row.formattedDate || row.date
                              })
                            }
                            disabled={isExporting}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-200 shadow-xs"
                            title={`Export Excel for ${row.formattedDate || row.date}`}
                          >
                            <FaFileExcel className="text-xs" />
                            Excel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-gray-400">
                      No sales records found for selected period.
                    </td>
                  </tr>
                )
              ) : filteredMonthWise.length > 0 ? (
                filteredMonthWise.map((row, idx) => (
                  <tr
                    key={row.month}
                    className="hover:bg-blue-50/40 transition-colors border-b border-gray-50 last:border-none"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">
                          {row.monthLabel || row.month}
                        </span>
                        <span className="text-[11px] font-mono text-gray-400">
                          {row.month}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        <FaCheckCircle className="text-[10px]" />
                        {row.count} {row.count === 1 ? "Sale" : "Sales"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-sm font-extrabold text-gray-900">
                        {formatINR(row.revenue)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-sm font-bold text-emerald-600">
                        {formatINR(row.amountPaid)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-sm font-bold text-amber-600">
                        {formatINR(row.pendingAmount)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() =>
                            handleOpenDrilldown({
                              month: row.month,
                              label: `Sales for ${row.monthLabel || row.month}`
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-xs"
                        >
                          <FaEye className="text-xs" />
                          View Sales ({row.count})
                        </button>
                        <button
                          onClick={() =>
                            handleExportExcel({
                              month: row.month,
                              label: row.monthLabel || row.month
                            })
                          }
                          disabled={isExporting}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-200 shadow-xs"
                          title={`Export Excel for ${row.monthLabel || row.month}`}
                        >
                          <FaFileExcel className="text-xs" />
                          Excel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-gray-400">
                    No month records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drilldown Modal: Viewing exact leads for selected Date or Month */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-4xl max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-800">
                    {modalTitle}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                    {modalTotal} Approved {modalTotal === 1 ? "Sale" : "Sales"}
                  </span>
                </div>
                <p className="text-xs mt-0.5 text-gray-500">
                  Individual customer deals counted towards real-time revenue.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportExcel(modalTarget)}
                  disabled={isExporting || modalLeads.length === 0}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs disabled:opacity-50"
                  title="Export All Sales to Excel Sheet"
                >
                  <FaFileExcel className="text-sm" />
                  {isExporting ? "Exporting..." : "Export Excel Sheet"}
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <FaTimes size={18} />
                </button>
              </div>
            </div>

            {/* Modal Search Bar */}
            <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Search in sales by name, phone, city, rep..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <FaSearch className="absolute left-2.5 top-2.5 text-[10px] text-gray-400" />
                {modalSearch && (
                  <button
                    onClick={() => setModalSearch("")}
                    className="absolute right-2 top-2 text-xs text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes size={12} />
                  </button>
                )}
              </div>
              <span className="text-xs font-semibold text-gray-500">
                Showing {filteredModalLeads.length} of {modalTotal} deals
              </span>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-xs font-medium text-gray-500">
                    Loading all approved sales leads...
                  </span>
                </div>
              ) : filteredModalLeads.length > 0 ? (
                <div className="space-y-3">
                  {filteredModalLeads.map((lead) => (
                    <div
                      key={lead._id}
                      className="p-4 rounded-xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-xs transition-shadow"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-800">
                            {lead.name}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            Verified & Approved
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <FaPhoneAlt className="text-[10px]" /> {lead.phone}
                          </span>
                          {lead.city && <span>• {lead.city}</span>}
                          {lead.salesPersonName && (
                            <span className="flex items-center gap-1 font-medium text-blue-600">
                              <FaUserTie className="text-[10px]" /> Rep: {lead.salesPersonName}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="text-xs text-gray-400">Deal Value</div>
                          <div className="text-base font-extrabold text-gray-900">
                            {formatINR(lead.dealValue)}
                          </div>
                        </div>

                        <div className="border-l border-gray-200 pl-4">
                          <div className="text-xs text-gray-400">Paid / Pending</div>
                          <div className="text-xs font-bold text-emerald-600">
                            Paid: {formatINR(lead.amountPaid)}
                          </div>
                          <div className="text-xs font-bold text-amber-600">
                            Pending: {formatINR(lead.pendingAmount)}
                          </div>
                        </div>

                        {lead.invoiceUrl && (
                          <a
                            href={getMediaUrl(lead.invoiceUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all text-xs"
                            title="View Invoice"
                          >
                            <FaFileInvoiceDollar size={16} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-xs text-gray-400">
                  {modalSearch
                    ? "No matching sales found for your search term."
                    : "No lead details found for this period."}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => handleExportExcel(modalTarget)}
                disabled={isExporting || modalLeads.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs disabled:opacity-50"
              >
                <FaFileExcel className="text-sm" />
                {isExporting ? "Exporting..." : "Export Excel Sheet"}
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
