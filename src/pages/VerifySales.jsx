import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle, Eye, Calendar, Download } from 'lucide-react';
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

export default function VerifySales() {
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();
  const navigate = useNavigate();

  const fetchPendingSales = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/accounts/leads?verificationStatus=pending`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.status === 'success') {
        setLeads(response.data.data.leads || []);
      } else {
        setError('Failed to fetch pending sales.');
      }
    } catch (err) {
      console.error(err);
      setError('Error fetching pending sales. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPendingSales();
    }
  }, [token]);

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
          // Remove the lead from the pending list
          setLeads(prev => prev.filter(lead => lead._id !== id));
        } else {
          Swal.fire('Error', 'Failed to update verification status', 'error');
        }
      } catch (err) {
        console.error(err);
        Swal.fire('Error', err.response?.data?.message || 'An error occurred while updating status', 'error');
      }
    }
  };

  const filteredLeads = leads.filter(lead => 
    lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead._id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Verify Sales</h1>
          <p className="text-gray-500 mt-1">Review and verify recent sales transactions.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium">
            <Download size={18} className="mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by ID or Customer Name..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex w-full md:w-auto gap-3">
          <button className="flex items-center px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors bg-white">
            <Calendar size={18} className="mr-2 text-gray-500" />
            Date Range
          </button>
          <button className="flex items-center px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors bg-white">
            <Filter size={18} className="mr-2 text-gray-500" />
            Status Filter
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            Loading transactions...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 bg-red-50">
            {error}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No pending verifications found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 text-sm border-b border-gray-100">
                  <th className="p-4 font-medium">Lead ID</th>
                  <th className="p-4 font-medium">Customer Details</th>
                  <th className="p-4 font-medium">Deal Value</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLeads.map((trx) => (
                  <tr key={trx._id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4">
                      <span className="font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md text-xs">{trx._id.slice(-6).toUpperCase()}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-sm">
                          {trx.name ? trx.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{trx.name}</p>
                          <p className="text-xs text-gray-500">{trx.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <p className="font-bold text-gray-800 flex items-center">
                          ₹{trx.dealValue?.toLocaleString() || 0}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 font-medium">
                      {new Date(trx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyle(trx.verificationStatus)}`}>
                        {trx.verificationStatus?.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
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
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-200" title="Verify">
                              <CheckCircle size={18} />
                            </button>
                            <button 
                              onClick={() => handleVerify(trx._id, 'rejected')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200" title="Reject">
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
