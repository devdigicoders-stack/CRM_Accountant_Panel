import React, { useState, useEffect } from 'react';
import { Search, Filter, Mail, Phone, User, ExternalLink } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'verified': return 'bg-green-100 text-green-800 border-green-200';
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
    case 'converted': return 'bg-blue-100 text-blue-800 border-blue-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function LeadsList() {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const queryParams = new URLSearchParams(location.search);
  const statusParam = queryParams.get('status');

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [pageData, setPageData] = useState({
    currentPage: 1,
    pages: 1,
    total: 0
  });

  const getPageTitle = () => {
    switch(statusParam) {
      case 'verified': return 'Verified Sales';
      case 'pending': return 'Pending Verification';
      case 'rejected': return 'Rejected Sales';
      default: return 'Total Closed Won Leads';
    }
  };

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      setError('');
      try {
        let url = `${import.meta.env.VITE_API_BASE_URL}/accounts/leads`;
        const params = new URLSearchParams();
        
        if (statusParam && statusParam !== 'all') {
          params.append('verificationStatus', statusParam);
        }
        
        // Add pagination or search here if supported by API
        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data.status === 'success') {
          setLeads(response.data.data.leads || []);
          setPageData({
            currentPage: response.data.currentPage || 1,
            pages: response.data.pages || 1,
            total: response.data.total || response.data.data.leads?.length || 0
          });
        } else {
          setError('Failed to fetch leads data');
        }
      } catch (err) {
        console.error(err);
        setError('An error occurred while fetching leads');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchLeads();
    }
  }, [token, statusParam]);

  const filteredLeads = leads.filter(lead => 
    lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 flex items-center"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">{getPageTitle()}</h1>
          <p className="text-gray-500 mt-1">Review lead details and verification statuses.</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search leads by name, email or phone..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            Loading leads...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 bg-red-50">
            {error}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No leads found matching the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 text-sm border-b border-gray-100">
                  <th className="p-4 font-medium">Lead Info</th>
                  <th className="p-4 font-medium">Contact Details</th>
                  <th className="p-4 font-medium">Product / Deal</th>
                  <th className="p-4 font-medium">Verification</th>
                  <th className="p-4 font-medium">Payment</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLeads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                          {lead.name ? lead.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{lead.name}</p>
                          <p className="text-xs text-gray-500 flex items-center mt-0.5">
                            <User size={12} className="mr-1" /> {lead.source || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 flex items-center">
                          <Mail size={14} className="mr-2 text-gray-400" /> {lead.email || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center">
                          <Phone size={14} className="mr-2 text-gray-400" /> {lead.phone || 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-800">₹{lead.dealValue?.toLocaleString() || 0}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]" title={lead.productDetails}>
                          {lead.productDetails || 'No product details'}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(lead.verificationStatus)}`}>
                        {lead.verificationStatus?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(lead.paymentStatus)}`}>
                        {lead.paymentStatus?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => navigate(`/lead-details/${lead._id}`)}
                        className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-transparent hover:border-blue-200 rounded-lg transition-colors flex items-center justify-end ml-auto"
                      >
                        <ExternalLink size={14} className="mr-1" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination Info */}
        {!loading && !error && filteredLeads.length > 0 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <p>Showing {filteredLeads.length} of {pageData.total} entries</p>
            <div className="flex gap-1">
              <button disabled className="px-3 py-1 border border-gray-200 rounded bg-gray-50 text-gray-400 cursor-not-allowed">Previous</button>
              <button className="px-3 py-1 border border-blue-500 rounded bg-blue-50 text-blue-600 font-medium">{pageData.currentPage}</button>
              <button disabled className="px-3 py-1 border border-gray-200 rounded bg-gray-50 text-gray-400 cursor-not-allowed">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
