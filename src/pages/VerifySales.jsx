import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle, Eye, Calendar, Download, User, ShoppingBag, RotateCcw } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

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

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      params.append('limit', '1000');

      if (statusFilter !== 'all') {
        params.append('verificationStatus', statusFilter);
      }
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
  }, [token, statusFilter, salesPersonFilter, startDate, endDate]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('pending');
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
          if (statusFilter === 'pending') {
            setLeads(prev => prev.filter(lead => lead._id !== id));
          } else {
            fetchSales();
          }
        } else {
          Swal.fire('Error', 'Failed to update verification status', 'error');
        }
      } catch (err) {
        console.error(err);
        Swal.fire('Error', err.response?.data?.message || 'An error occurred while updating status', 'error');
      }
    }
  };

  const filteredLeads = leads.filter(lead => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    const matchesName = lead.name?.toLowerCase().includes(term);
    const matchesId = lead._id?.toLowerCase().includes(term);
    const matchesPhone = lead.phone?.includes(term);
    const matchesSalesPerson = lead.assignedTo?.name?.toLowerCase().includes(term);
    const matchesProduct = (lead.productId?.name || '').toLowerCase().includes(term) || (lead.productDetails || '').toLowerCase().includes(term);

    return matchesName || matchesId || matchesPhone || matchesSalesPerson || matchesProduct;
  });

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
        escapeCsv(lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ''),
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
          <div className="md:col-span-4 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-gray-700 font-medium"
                title="Start Date"
              />
            </div>
            <span className="text-xs font-semibold text-gray-400">to</span>
            <div className="relative flex-1">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-gray-700 font-medium"
                title="End Date"
              />
            </div>
          </div>

          {/* Reset Filters */}
          <div className="md:col-span-1 flex items-center justify-end">
            <button
              onClick={handleResetFilters}
              title="Reset Filters"
              className="w-full md:w-auto p-2.5 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors text-xs font-medium cursor-pointer"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {['pending', 'verified', 'rejected', 'all'].map(status => (
              <button 
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  statusFilter === status 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {status} ({statusFilter === status ? filteredLeads.length : ''})
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-500 font-medium">
            Showing <span className="font-bold text-gray-800">{filteredLeads.length}</span> records
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
                        {trx.paymentStatus && (
                          <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                            trx.paymentStatus === 'completed' ? 'bg-green-100 text-green-700' :
                            trx.paymentStatus === 'partial' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {trx.paymentStatus}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-xs text-gray-600 font-medium">
                      {new Date(trx.createdAt).toLocaleDateString()}
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
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

