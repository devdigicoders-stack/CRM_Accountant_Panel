import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, CheckCircle, XCircle, Eye, Calendar, Download, User, ShoppingBag, RotateCcw, IndianRupee, Layers, Check, Clock } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

const formatINR = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
};

const getStatusStyle = (status) => {
  switch (status?.toLowerCase()) {
    case 'verified': return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getProductSummary = (lead) => {
  if (lead.items && lead.items.length > 0) {
    return lead.items.map(item => `${item.name || item.productId?.name || 'Item'} (x${item.quantity || 1})`).join(', ');
  }
  if (lead.productId && typeof lead.productId === 'object') {
    const qty = lead.productQuantity || 1;
    return `${lead.productId.name || lead.productId.modelNumber || 'Product'} (x${qty})`;
  }
  if (lead.productDetails) {
    return lead.productDetails;
  }
  return 'No details';
};

export default function VerifySales() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [salesPersonFilter, setSalesPersonFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesUsers, setSalesUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();
  const navigate = useNavigate();

  // Fetch Sales Personnel List for dropdown
  useEffect(() => {
    const fetchSalesUsers = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/users/sales-list`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.status === 'success') {
          setSalesUsers(response.data.data.users || []);
        }
      } catch (err) {
        console.error('Failed to fetch sales users list:', err);
      }
    };
    if (token) {
      fetchSalesUsers();
    }
  }, [token]);

  const formatDateLocal = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleQuickDatePreset = (preset) => {
    const now = new Date();
    if (preset === 'today') {
      const today = formatDateLocal(now);
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = formatDateLocal(y);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'thisMonth') {
      const start = formatDateLocal(new Date(now.getFullYear(), now.getMonth(), 1));
      const end = formatDateLocal(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'lastMonth') {
      const start = formatDateLocal(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const end = formatDateLocal(new Date(now.getFullYear(), now.getMonth(), 0));
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      params.append('limit', '2000');

      if (salesPersonFilter && salesPersonFilter !== 'all') {
        params.append('assignedTo', salesPersonFilter);
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      const url = `${import.meta.env.VITE_API_BASE_URL}/accounts/leads?${params.toString()}`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.status === 'success') {
        setLeads(response.data.data.leads || []);
      } else {
        setError('Failed to fetch sales records.');
      }
    } catch (err) {
      console.error(err);
      setError('Error fetching sales records. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSales();
    }
  }, [token, salesPersonFilter, startDate, endDate]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSalesPersonFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const handleVerify = async (id, status) => {
    const { value: remarks } = await Swal.fire({
      title: status === 'verified' ? 'Approve Sale' : 'Reject Sale',
      input: 'textarea',
      inputLabel: 'Account Remarks',
      inputPlaceholder: 'Enter your remarks or verification details here...',
      showCancelButton: true,
      confirmButtonColor: status === 'verified' ? '#10B981' : '#EF4444',
      confirmButtonText: status === 'verified' ? 'Approve & Verify' : 'Reject Sale',
      inputValidator: (value) => {
        if (!value) {
          return 'Remarks are required!';
        }
      }
    });

    if (remarks) {
      try {
        Swal.fire({
          title: 'Processing...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const response = await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}/accounts/leads/${id}/verify`,
          { verificationStatus: status, remarks: remarks },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.status === 'success') {
          Swal.fire('Success!', `Lead has been ${status}.`, 'success');
          fetchSales();
        } else {
          Swal.fire('Error', 'Failed to update verification status', 'error');
        }
      } catch (err) {
        console.error(err);
        Swal.fire('Error', err.response?.data?.message || 'An error occurred while updating status', 'error');
      }
    }
  };

  // Filter leads by status and search
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // 1. Status Filter Tab
      if (statusFilter !== 'all') {
        if (statusFilter === 'rejected') {
          if (lead.verificationStatus !== 'rejected') return false;
        } else if (statusFilter === 'verified') {
          if (lead.verificationStatus !== 'verified') return false;
        } else if (statusFilter === 'pending') {
          if (lead.verificationStatus === 'verified' || lead.verificationStatus === 'rejected') return false;
        }
      }

      // 2. Search Term
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const matchesName = lead.name?.toLowerCase().includes(term);
        const matchesId = lead._id?.toLowerCase().includes(term);
        const matchesPhone = lead.phone?.includes(term);
        const matchesSalesPerson = lead.assignedTo?.name?.toLowerCase().includes(term) || lead.assignedTo?.email?.toLowerCase().includes(term);
        const matchesProduct = (lead.productId?.name || '').toLowerCase().includes(term) || (lead.productDetails || '').toLowerCase().includes(term);
        return matchesName || matchesId || matchesPhone || matchesSalesPerson || matchesProduct;
      }

      return true;
    });
  }, [leads, statusFilter, searchTerm]);

  // Tab counts for current search and filters
  const tabCounts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const matchingSearch = leads.filter((lead) => {
      if (!term) return true;
      const matchesName = lead.name?.toLowerCase().includes(term);
      const matchesId = lead._id?.toLowerCase().includes(term);
      const matchesPhone = lead.phone?.includes(term);
      const matchesSalesPerson = lead.assignedTo?.name?.toLowerCase().includes(term) || lead.assignedTo?.email?.toLowerCase().includes(term);
      const matchesProduct = (lead.productId?.name || '').toLowerCase().includes(term) || (lead.productDetails || '').toLowerCase().includes(term);
      return matchesName || matchesId || matchesPhone || matchesSalesPerson || matchesProduct;
    });

    return {
      pending: matchingSearch.filter(l => l.verificationStatus !== 'verified' && l.verificationStatus !== 'rejected').length,
      verified: matchingSearch.filter(l => l.verificationStatus === 'verified').length,
      rejected: matchingSearch.filter(l => l.verificationStatus === 'rejected').length,
      all: matchingSearch.length
    };
  }, [leads, searchTerm]);

  // Total sums of deal value, amount paid, and pending
  const totals = useMemo(() => {
    return filteredLeads.reduce((acc, lead) => {
      const dealVal = Number(lead.dealValue || lead.totalAmount) || 0;
      const paid = Number(lead.amountPaid || (lead.isBookingAmount ? lead.bookingAmount : 0)) || 0;
      let pending = Number(lead.pendingAmount);
      if (isNaN(pending) || pending === 0) {
        pending = Math.max(0, dealVal - paid);
      }
      return {
        count: acc.count + 1,
        dealValue: acc.dealValue + dealVal,
        amountPaid: acc.amountPaid + paid,
        pendingAmount: acc.pendingAmount + pending
      };
    }, { count: 0, dealValue: 0, amountPaid: 0, pendingAmount: 0 });
  }, [filteredLeads]);

  const handleExport = () => {
    if (!filteredLeads || filteredLeads.length === 0) {
      Swal.fire('Info', 'No data to export', 'info');
      return;
    }

    const headers = [
      'Lead ID',
      'Customer Name',
      'Customer Phone',
      'Customer Email',
      'Sales Person Name',
      'Sales Person Email',
      'Product / Items Sold',
      'Product SKU / Model',
      'Product Quantity',
      'Product Details / Requirement',
      'Deal Value (INR)',
      'Amount Paid (INR)',
      'Pending Amount (INR)',
      'Payment Mode',
      'Payment Status',
      'Sale Date',
      'Lead Status',
      'Verification Status',
      'Account Remarks'
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const cleanStr = String(str).replace(/"/g, '""').replace(/\r?\n|\r/g, ' ');
      return `"${cleanStr}"`;
    };

    const csvRows = [headers.join(',')];

    filteredLeads.forEach(lead => {
      const itemsSummary = getProductSummary(lead);
      const sku = lead.productId?.sku || lead.productId?.modelNumber || '';
      const qty = lead.productQuantity || (lead.items?.reduce((acc, it) => acc + (it.quantity || 1), 0)) || 1;
      const salesPersonName = lead.assignedTo?.name || 'Unassigned';
      const salesPersonEmail = lead.assignedTo?.email || '';

      const saleDateVal = lead.saleConfirmedAt || lead.verifiedAt || lead.transferApprovedAt || lead.createdAt;

      const row = [
        escapeCsv(lead._id),
        escapeCsv(lead.name || ''),
        escapeCsv(lead.phone || ''),
        escapeCsv(lead.email || ''),
        escapeCsv(salesPersonName),
        escapeCsv(salesPersonEmail),
        escapeCsv(itemsSummary),
        escapeCsv(sku),
        escapeCsv(qty),
        escapeCsv(lead.productDetails || ''),
        escapeCsv(lead.dealValue || lead.totalAmount || 0),
        escapeCsv(lead.amountPaid || 0),
        escapeCsv(lead.pendingAmount || 0),
        escapeCsv(lead.paymentMode || ''),
        escapeCsv(lead.paymentStatus || ''),
        escapeCsv(saleDateVal ? new Date(saleDateVal).toLocaleDateString() : ''),
        escapeCsv(lead.status || ''),
        escapeCsv(lead.verificationStatus || 'pending'),
        escapeCsv(lead.accountRemarks || '')
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateTag = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `Sales_Report_${statusFilter}_${dateTag}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Verify Sales</h1>
          <p className="text-gray-500 mt-1">Review and verify sales transactions with executive and item details.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm font-semibold text-sm cursor-pointer"
          >
            <Download size={16} className="mr-2" />
            Export Sales Data
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="relative md:col-span-4">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by ID, Customer, Sales Executive or Product..." 
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Sales Person Dropdown */}
          <div className="relative md:col-span-3">
            <User size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={salesPersonFilter}
              onChange={(e) => setSalesPersonFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-700 font-medium bg-white cursor-pointer"
            >
              <option value="all">All Sales Executives</option>
              {salesUsers.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Inputs */}
          <div className="md:col-span-4 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-gray-700 font-medium cursor-pointer"
                  title="Start Date"
                />
              </div>
              <span className="text-xs font-semibold text-gray-400">to</span>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-gray-700 font-medium cursor-pointer"
                  title="End Date"
                />
              </div>
            </div>
            {/* Quick Date Presets */}
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-gray-400 font-semibold">Quick:</span>
              <button
                type="button"
                onClick={() => handleQuickDatePreset('today')}
                className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold transition cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickDatePreset('thisMonth')}
                className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition cursor-pointer"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handleQuickDatePreset('lastMonth')}
                className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold transition cursor-pointer"
              >
                Last Month
              </button>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => handleQuickDatePreset('all')}
                  className="px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-600 font-bold transition cursor-pointer"
                >
                  Clear Date
                </button>
              )}
            </div>
          </div>

          {/* Reset Filters */}
          <div className="md:col-span-1 flex items-start justify-end pt-1">
            <button
              onClick={handleResetFilters}
              title="Reset All Filters"
              className="w-full md:w-auto p-2.5 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors text-xs font-medium cursor-pointer"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending' },
              { id: 'verified', label: 'Verified' },
              { id: 'rejected', label: 'Rejected' }
            ].map(({ id, label }) => (
              <button 
                key={id}
                onClick={() => setStatusFilter(id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  statusFilter === id 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {label} ({tabCounts[id] ?? 0})
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-500 font-medium">
            Showing <span className="font-bold text-gray-800">{filteredLeads.length}</span> records
          </div>
        </div>
      </div>

      {/* Total Leads & Revenue Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Count */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Leads</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{totals.count}</p>
            <span className="text-[11px] text-gray-500 font-medium">Matching records</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
            <Layers size={20} />
          </div>
        </div>

        {/* Total Deal Value */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Deal Value</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{formatINR(totals.dealValue)}</p>
            <span className="text-[11px] text-gray-500 font-medium">Cumulative sale value</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            <IndianRupee size={20} />
          </div>
        </div>

        {/* Total Amount Received / Paid */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Amount Received</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{formatINR(totals.amountPaid)}</p>
            <span className="text-[11px] text-emerald-700 font-medium">Paid / Advance amount</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center font-bold text-lg">
            <Check size={20} />
          </div>
        </div>

        {/* Total Pending / COD */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Pending / Balance</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{formatINR(totals.pendingAmount)}</p>
            <span className="text-[11px] text-amber-700 font-medium">Balance to collect</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-9 w-9 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="font-medium text-sm">Loading transactions...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 bg-red-50 text-sm font-medium">
            {error}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            <p className="font-medium">No sales transactions found matching your filter criteria.</p>
            <button 
              onClick={handleResetFilters}
              className="mt-3 inline-flex items-center text-xs font-semibold text-blue-600 hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1050px]">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                  <th className="p-4">Lead ID</th>
                  <th className="p-4">Customer Details</th>
                  <th className="p-4">Sales Person</th>
                  <th className="p-4">Product / Item Sold</th>
                  <th className="p-4">Deal Value</th>
                  <th className="p-4">Sale Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {filteredLeads.map((trx) => (
                  <tr key={trx._id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4">
                      <span className="font-mono font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md text-xs">
                        {trx._id.slice(-6).toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {trx.name ? trx.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{trx.name || 'Unnamed'}</p>
                          <p className="text-xs text-gray-500">{trx.phone || trx.email || 'No contact'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {trx.assignedTo ? (
                        <div>
                          <p className="font-medium text-gray-800">{trx.assignedTo.name}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[160px]">{trx.assignedTo.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="max-w-[220px]">
                        <p className="font-medium text-gray-800 truncate text-xs">
                          {getProductSummary(trx)}
                        </p>
                        {trx.productDetails && trx.items?.length > 0 && (
                          <p className="text-[11px] text-gray-400 truncate">{trx.productDetails}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <p className="font-bold text-gray-800">
                          ₹{(trx.dealValue || trx.totalAmount || 0).toLocaleString()}
                        </p>
                        <div className="flex flex-wrap items-center gap-1">
                          {trx.paymentStatus && (
                            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                              trx.paymentStatus === 'completed' ? 'bg-green-100 text-green-700' :
                              trx.paymentStatus === 'partial' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {trx.paymentStatus}
                            </span>
                          )}
                          {trx.isBookingAmount && (
                            <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300" title="Booking Amount Paid">
                              🏷️ Booking (₹{(trx.amountPaid || trx.bookingAmount || 0).toLocaleString()})
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-gray-600 font-medium">
                      {new Date(trx.saleConfirmedAt || trx.verifiedAt || trx.transferApprovedAt || trx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(trx.verificationStatus)}`}>
                        {trx.verificationStatus?.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => navigate(`/lead-details/${trx._id}`)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100" 
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        {trx.verificationStatus === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleVerify(trx._id, 'verified')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-200" 
                              title="Verify Sale"
                            >
                              <CheckCircle size={18} />
                            </button>
                            <button 
                              onClick={() => handleVerify(trx._id, 'rejected')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200" 
                              title="Reject Sale"
                            >
                              <XCircle size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredLeads.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-extrabold text-xs text-gray-800">
                  <tr>
                    <td colSpan={4} className="p-4 text-left">
                      <div className="flex items-center gap-2">
                        <span className="uppercase tracking-wider text-gray-500 font-bold">Total Sum:</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                          {totals.count} {totals.count === 1 ? 'Lead' : 'Leads'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <div className="text-sm font-black text-gray-900">{formatINR(totals.dealValue)}</div>
                        <div className="text-[11px] font-bold text-emerald-600">
                          Paid: {formatINR(totals.amountPaid)}
                        </div>
                        <div className="text-[11px] font-bold text-amber-600">
                          Pending: {formatINR(totals.pendingAmount)}
                        </div>
                      </div>
                    </td>
                    <td colSpan={3} className="p-4 text-right text-gray-400 font-normal italic">
                      Calculated from {filteredLeads.length} visible records
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

