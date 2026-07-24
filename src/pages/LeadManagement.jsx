import { useState, useEffect } from 'react';
import { Search, MoreVertical, Mail, Phone, User, CheckCircle, XCircle, FileText, CreditCard, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'verified': return 'bg-green-100 text-green-800 border-green-200';
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
    case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'partial': return 'bg-orange-100 text-orange-800 border-orange-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function LeadManagement() {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const [seenLeads, setSeenLeads] = useState(() => {
    try {
      const saved = localStorage.getItem('seen_lead_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const markLeadAsSeen = (leadId) => {
    if (leadId && !seenLeads.includes(leadId)) {
      const updated = [...seenLeads, leadId];
      setSeenLeads(updated);
      try {
        localStorage.setItem('seen_lead_ids', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/accounts/leads?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.status === 'success') {
        setLeads(response.data.data.leads || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchLeads();
  }, [token]);

  // Update specific lead in state
  const updateLeadInState = (updatedLead) => {
    setLeads(prev => prev.map(l => l._id === updatedLead._id ? updatedLead : l));
  };

  const handleVerify = async (id, status) => {
    const { value: remarks } = await Swal.fire({
      title: status === 'verified' ? 'Approve Sale' : 'Reject Sale',
      input: 'textarea',
      inputLabel: 'Remarks / Notes (Optional)',
      inputPlaceholder: 'Enter any remarks here...',
      showCancelButton: true,
      confirmButtonText: status === 'verified' ? 'Approve' : 'Reject',
      confirmButtonColor: status === 'verified' ? '#16a34a' : '#dc2626',
    });

    if (remarks !== undefined) {
      setActionLoading(true);
      try {
        const res = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/accounts/leads/${id}/verify`, { status, remarks }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.status === 'success') {
          Swal.fire('Success', `Sale marked as ${status}`, 'success');
          updateLeadInState(res.data.data.lead);
        }
      } catch (error) {
        Swal.fire('Error', error.response?.data?.message || 'Failed to update status', 'error');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleInvoiceUpload = async (id, leadObj = {}) => {
    const isEdit = !!leadObj.invoiceUrl;
    const { value: uploadResponse } = await Swal.fire({
      title: isEdit ? 'Edit Invoice & AWB' : 'Upload Invoice & AWB',
      html: `
        <div class="space-y-4 text-left px-2 mt-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Invoice Document ${isEdit ? '(Optional for replacement)' : '*'}</label>
            <input type="file" id="swal-invoice-file" accept="application/pdf, image/jpeg, image/png" class="w-full p-2 border border-gray-300 rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">AWB Number *</label>
            <input type="text" id="swal-awb-number" value="${leadObj.awbNumber || ''}" placeholder="Enter AWB or Tracking Number" class="w-full p-2 border border-gray-300 rounded-lg">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: isEdit ? 'Update' : 'Upload',
      confirmButtonColor: '#2563EB',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        const fileInput = document.getElementById('swal-invoice-file');
        const awbInput = document.getElementById('swal-awb-number');
        const file = fileInput?.files[0];
        const awbNumber = awbInput?.value?.trim();

        if (!file && !isEdit) {
          Swal.showValidationMessage('Please select an invoice file');
          return false;
        }
        if (!awbNumber) {
          Swal.showValidationMessage('Please enter the AWB / Tracking Number');
          return false;
        }
        
        const formData = new FormData();
        if (file) {
          formData.append('invoice', file);
        }
        formData.append('awbNumber', awbNumber);
        
        try {
          const res = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/accounts/leads/${id}/invoice`, formData, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          });
          return res.data;
        } catch (error) {
          Swal.showValidationMessage(`Upload failed: ${error.response?.data?.message || error.message}`);
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    });

    if (uploadResponse && uploadResponse.status === 'success') {
      Swal.fire('Success', isEdit ? 'Invoice & AWB updated successfully!' : 'Invoice uploaded successfully!', 'success');
      updateLeadInState(uploadResponse.data.lead);
    }
  };

  const handleUpdatePayment = async (id, lead) => {
    const { value: formValues } = await Swal.fire({
      title: 'Update Payment Details',
      html: `
        <div class="space-y-4 text-left px-1 mt-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">Payment Mode</label>
            <select id="swal-payment-mode" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select Mode...</option>
              <option value="EMI" ${lead.paymentMode === 'EMI' ? 'selected' : ''}>EMI</option>
              <option value="COD" ${lead.paymentMode === 'COD' ? 'selected' : ''}>Cash on Delivery (COD)</option>
              <option value="Full Payment" ${lead.paymentMode === 'Full Payment' ? 'selected' : ''}>Full Payment</option>
              <option value="Online Transfer" ${lead.paymentMode === 'Online Transfer' ? 'selected' : ''}>Online Transfer</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">Payment Status</label>
            <select id="swal-payment-status" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="pending" ${lead.paymentStatus === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="partial" ${lead.paymentStatus === 'partial' ? 'selected' : ''}>Partial</option>
              <option value="completed" ${lead.paymentStatus === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">Transaction Details / Ref No</label>
            <textarea id="swal-transaction-details" rows="2" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Downpayment Ref-SBI123...">${lead.transactionDetails || ''}</textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Save Details',
      confirmButtonColor: '#2563EB',
      preConfirm: () => {
        return {
          paymentMode: document.getElementById('swal-payment-mode').value,
          paymentStatus: document.getElementById('swal-payment-status').value,
          transactionDetails: document.getElementById('swal-transaction-details').value
        }
      }
    });

    if (formValues) {
      setActionLoading(true);
      try {
        const res = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/accounts/leads/${id}/payment`, formValues, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.status === 'success') {
          Swal.fire('Success', 'Payment details updated!', 'success');
          updateLeadInState(res.data.data.lead);
        }
      } catch (error) {
        Swal.fire('Error', error.response?.data?.message || 'Failed to update payment details', 'error');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleTransferToInstallation = async (id) => {
    const result = await Swal.fire({
      title: 'Transfer to Installation?',
      text: "This will move the lead to the installation team queue.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, transfer it!'
    });

    if (result.isConfirmed) {
      setActionLoading(true);
      try {
        const res = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/accounts/leads/${id}/transfer`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.status === 'success') {
          Swal.fire('Transferred!', 'Lead transferred to Installation.', 'success');
          updateLeadInState(res.data.data.lead);
        }
      } catch (error) {
        Swal.fire('Error', error.response?.data?.message || 'Failed to transfer lead', 'error');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleAssignInstaller = async (id) => {
    try {
      setActionLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/users/installers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const installers = response.data.data.users || [];
      if (installers.length === 0) {
        Swal.fire('No Installers', 'No active installation representatives found.', 'info');
        return;
      }

      const inputOptions = {};
      installers.forEach(inst => {
        inputOptions[inst._id] = inst.name;
      });

      const { value: installerId } = await Swal.fire({
        title: 'Assign Installer',
        text: 'Select an installation representative for this lead',
        input: 'select',
        inputOptions,
        inputPlaceholder: 'Select an installer...',
        showCancelButton: true,
        confirmButtonText: 'Assign',
        confirmButtonColor: '#2563EB',
        inputValidator: (value) => {
          if (!value) return 'You need to choose an installer!';
        }
      });

      if (installerId) {
        setActionLoading(true);
        const assignRes = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/installation/leads/${id}/assign-rep`, { installerId }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (assignRes.data.status === 'success') {
          Swal.fire('Success', 'Installer assigned successfully!', 'success');
          updateLeadInState(assignRes.data.data.lead);
        }
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to assign installer', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => 
    lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Lead Management</h1>
          <p className="text-gray-500 mt-1">Manage verification, payments, and transfers directly.</p>
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
          <div className="p-8 text-center text-red-500 bg-red-50">{error}</div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No leads found.</div>
        ) : (
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 text-sm border-b border-gray-100">
                  <th className="p-4 font-medium">Lead Info</th>
                  <th className="p-4 font-medium">Contact Details</th>
                  <th className="p-4 font-medium">Product / Deal</th>
                  <th className="p-4 font-medium">Verification</th>
                  <th className="p-4 font-medium">Payment</th>
                  <th className="p-4 font-medium">Installation</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLeads.map((lead) => {
                  const isNew = !seenLeads.includes(lead._id);
                  return (
                    <tr 
                      key={lead._id} 
                      className={`transition-colors cursor-pointer ${
                        isNew 
                          ? 'bg-blue-50/80 hover:bg-blue-100/90 border-l-4 border-blue-500 font-semibold' 
                          : 'hover:bg-blue-50/30'
                      }`}
                      onClick={() => markLeadAsSeen(lead._id)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                            {lead.name ? lead.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-800">{lead.name}</p>
                              {isNew && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-600 text-white tracking-wide uppercase shadow-xs animate-pulse">
                                  NEW
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">Added: {new Date(lead.createdAt).toLocaleDateString()}</p>
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
                          {lead.productDetails || 'No details'}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border tracking-wide uppercase ${getStatusColor(lead.verificationStatus)}`} title="Verification Status">
                        {lead.verificationStatus || 'PENDING'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border tracking-wide uppercase ${getStatusColor(lead.paymentStatus)}`} title="Payment Status">
                        {lead.paymentStatus || 'PENDING'}
                      </span>
                    </td>
                    <td className="p-4">
                      {lead.transferredToInstallation ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border bg-teal-50 text-teal-700 border-teal-200 tracking-wide uppercase" title="Installation Status">
                          TRANSFERRED
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">NOT TRANSFERRED</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => navigate(`/lead-details/${lead._id}`)}
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center"
                          >
                            <ExternalLink size={14} className="mr-1" /> View
                          </button>
                          
                          <button
                            onClick={() => setOpenDropdownId(openDropdownId === lead._id ? null : lead._id)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>

                        {openDropdownId === lead._id && (
                          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 divide-y divide-gray-100">
                            <div className="py-1">
                              {lead.verificationStatus === 'pending' && (
                                <>
                                  <button onClick={() => { setOpenDropdownId(null); handleVerify(lead._id, 'verified'); }} className="group flex w-full items-center px-4 py-2 text-sm text-green-600 hover:bg-green-50">
                                    <CheckCircle size={14} className="mr-2" /> Approve Sale
                                  </button>
                                  <button onClick={() => { setOpenDropdownId(null); handleVerify(lead._id, 'rejected'); }} className="group flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                    <XCircle size={14} className="mr-2" /> Reject Sale
                                  </button>
                                </>
                              )}
                              
                              <button onClick={() => { setOpenDropdownId(null); handleUpdatePayment(lead._id, lead); }} className="group flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                <CreditCard size={14} className="mr-2 text-gray-400" /> Update Payment
                              </button>

                              {lead.verificationStatus === 'verified' && (
                                <button onClick={() => { setOpenDropdownId(null); handleInvoiceUpload(lead._id, lead); }} className="group flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                  <FileText size={14} className="mr-2 text-gray-400" /> {lead.invoiceUrl ? 'Edit Invoice & AWB' : 'Upload Invoice & AWB'}
                                </button>
                              )}
                            </div>
                            
                            {(lead.verificationStatus === 'verified' && !lead.transferredToInstallation) && (
                              <div className="py-1">
                                <button onClick={() => { setOpenDropdownId(null); handleTransferToInstallation(lead._id); }} className="group flex w-full items-center px-4 py-2 text-sm text-blue-600 hover:bg-blue-50">
                                  <ExternalLink size={14} className="mr-2" /> Transfer to Install
                                </button>
                              </div>
                            )}

                            {lead.transferredToInstallation && (
                              <div className="py-1">
                                <button onClick={() => { setOpenDropdownId(null); handleAssignInstaller(lead._id); }} className="group flex w-full items-center px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50">
                                  <User size={14} className="mr-2" /> {lead.installationRep ? 'Reassign Installer' : 'Assign Installer'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
