import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { 
  User, Mail, Phone, MapPin, Briefcase, Calendar, 
  MessageSquare, DollarSign, CheckCircle, Clock, XCircle, ArrowLeft,
  ExternalLink, CreditCard, FileText
} from 'lucide-react';

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'verified': return 'bg-green-100 text-green-800 border-green-200';
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
    case 'converted': return 'bg-blue-100 text-blue-800 border-blue-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleVerify = async (status) => {
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
      setActionLoading(true);
      try {
        const response = await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}/accounts/leads/${id}/verify`,
          { verificationStatus: status, remarks: remarks },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.status === 'success') {
          Swal.fire('Success!', `Lead has been ${status}.`, 'success');
          setLead(response.data.data.lead); // Update the lead in state
        } else {
          Swal.fire('Error', 'Failed to update verification status', 'error');
        }
      } catch (err) {
        console.error(err);
        Swal.fire('Error', err.response?.data?.message || 'An error occurred', 'error');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleInvoiceUpload = async () => {
    const { value: uploadResponse } = await Swal.fire({
      title: 'Upload Invoice',
      text: 'Select a PDF or image file',
      input: 'file',
      inputAttributes: {
        'accept': 'application/pdf, image/jpeg, image/png',
        'aria-label': 'Upload your invoice'
      },
      showCancelButton: true,
      confirmButtonText: 'Upload',
      showLoaderOnConfirm: true,
      preConfirm: async (file) => {
        if (!file) {
          Swal.showValidationMessage('Please select a file');
          return false;
        }
        
        const formData = new FormData();
        formData.append('invoice', file);
        
        try {
          const response = await axios.put(
            `${import.meta.env.VITE_API_BASE_URL}/accounts/leads/${id}/invoice`, 
            formData, 
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${token}`
              }
            }
          );
          return response.data;
        } catch (error) {
          Swal.showValidationMessage(`Upload failed: ${error.response?.data?.message || error.message}`);
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    });

    if (uploadResponse && uploadResponse.status === 'success') {
      Swal.fire('Success', 'Invoice uploaded successfully!', 'success');
      setLead(uploadResponse.data.lead);
    }
  };

  const handleUpdatePayment = async () => {
    const { value: formValues } = await Swal.fire({
      title: '<h2 class="text-xl font-bold text-gray-800">Update Payment Details</h2>',
      html: `
        <div class="space-y-5 text-left px-1 mt-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">Payment Mode</label>
            <div class="relative">
              <select id="swal-payment-mode" class="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none text-gray-700 font-medium">
                <option value="">Select Mode...</option>
                <option value="cash" ${lead.paymentMode === 'cash' ? 'selected' : ''}>Cash</option>
                <option value="cod" ${lead.paymentMode === 'cod' ? 'selected' : ''}>Cash on Delivery (COD)</option>
                <option value="dp" ${lead.paymentMode === 'dp' ? 'selected' : ''}>Downpayment (DP)</option>
                <option value="emi" ${lead.paymentMode === 'emi' ? 'selected' : ''}>EMI</option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">Payment Status</label>
            <div class="relative">
              <select id="swal-payment-status" class="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none text-gray-700 font-medium">
                <option value="pending" ${lead.paymentStatus === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="partial" ${lead.paymentStatus === 'partial' ? 'selected' : ''}>Partial</option>
                <option value="completed" ${lead.paymentStatus === 'completed' ? 'selected' : ''}>Completed</option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">Transaction Details</label>
            <textarea id="swal-transaction-details" rows="3" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-700 resize-none" placeholder="Enter transaction ID, reference number, or notes...">${lead.transactionDetails || ''}</textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Save Details',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'rounded-xl shadow-xl border border-gray-100',
        title: 'p-0 m-0 border-b pb-4',
        htmlContainer: 'm-0 px-4',
        confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg shadow-sm transition-colors',
        cancelButton: 'bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-2.5 rounded-lg transition-colors ml-3',
        actions: 'mt-6 mb-2 border-t pt-4 w-full px-4 justify-end'
      },
      buttonsStyling: false,
      preConfirm: () => {
        const paymentMode = document.getElementById('swal-payment-mode').value;
        const paymentStatus = document.getElementById('swal-payment-status').value;
        const transactionDetails = document.getElementById('swal-transaction-details').value;
        
        return { paymentMode, paymentStatus, transactionDetails };
      }
    });

    if (formValues) {
      setActionLoading(true);
      try {
        const payload = {};
        if (formValues.paymentMode) payload.paymentMode = formValues.paymentMode;
        if (formValues.paymentStatus) payload.paymentStatus = formValues.paymentStatus;
        if (formValues.transactionDetails) payload.transactionDetails = formValues.transactionDetails;

        const response = await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}/accounts/leads/${id}/payment`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.status === 'success') {
          Swal.fire('Success!', 'Payment details updated successfully', 'success');
          setLead(response.data.data.lead);
        }
      } catch (err) {
        console.error(err);
        Swal.fire('Error', err.response?.data?.message || 'Failed to update payment details', 'error');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleTransferToInstallation = async () => {
    const confirm = await Swal.fire({
      title: 'Transfer to Installation?',
      text: 'Are you sure you want to transfer this verified lead to the Installation team?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Transfer',
      confirmButtonColor: '#10B981',
      cancelButtonText: 'Cancel'
    });

    if (confirm.isConfirmed) {
      setActionLoading(true);
      try {
        const response = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/accounts/leads/${id}/transfer`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.status === 'success') {
          Swal.fire('Success', 'Lead successfully transferred to Installation Team.', 'success');
          setLead(response.data.data.lead);
        }
      } catch (error) {
        Swal.fire('Error', error.response?.data?.message || 'Failed to transfer lead', 'error');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleAssignInstaller = async () => {
    try {
      setActionLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/users?role=installation&active=true`, {
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
          setLead(assignRes.data.data.lead);
        }
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to assign installer', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    const fetchLeadDetails = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/leads/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data.status === 'success') {
          setLead(response.data.data.lead);
        } else {
          setError('Failed to load lead details');
        }
      } catch (err) {
        console.error(err);
        setError('Error fetching lead details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (token && id) {
      fetchLeadDetails();
    }
  }, [token, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-xl text-center">
        <p>{error || 'Lead not found.'}</p>
        <button 
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
            title="Go Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              {lead.name}
              <span className={`text-xs px-2.5 py-1 rounded-full border ${getStatusColor(lead.verificationStatus)}`}>
                {lead.verificationStatus?.toUpperCase()}
              </span>
            </h1>
            <p className="text-gray-500 text-sm mt-1">Lead ID: {lead._id}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Info Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-4 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Phone size={18} /></div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Phone Number</p>
                  <p className="text-gray-800 font-medium">{lead.phone}</p>
                  {lead.integrations?.callUri && (
                    <a href={lead.integrations.callUri} className="text-xs text-blue-600 hover:underline">Call Now</a>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Mail size={18} /></div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Email Address</p>
                  <p className="text-gray-800 font-medium">{lead.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg"><MessageSquare size={18} /></div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">WhatsApp</p>
                  {lead.integrations?.whatsappLink ? (
                    <a href={lead.integrations.whatsappLink} target="_blank" rel="noreferrer" className="text-green-600 hover:underline font-medium flex items-center">
                      Chat on WhatsApp <ExternalLink size={12} className="ml-1" />
                    </a>
                  ) : (
                    <p className="text-gray-400 text-sm">Not available</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><User size={18} /></div>
                <div>
                  <p className="font-semibold text-gray-800">{lead.verificationStatus === 'verified' ? 'Approved & Verified' : lead.verificationStatus === 'rejected' ? 'Rejected' : 'Pending Verification'}</p>
                </div>
              </div>
              {lead.invoiceUrl && (
                <div className="flex items-start gap-3 mt-4 pt-4 border-t border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Invoice Document</p>
                    <a href={`${import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')}${lead.invoiceUrl}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline flex items-center gap-1">
                      View Uploaded Invoice
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Deal & Product Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-4 mb-4">Sale Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">Product / Requirement</p>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-gray-800 text-sm">
                  {lead.productDetails || 'No details provided'}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">Deal Value</p>
                <div className="p-3 bg-green-50 text-green-800 rounded-lg border border-green-100 font-bold text-lg flex items-center">
                  <DollarSign size={18} className="mr-1" />
                  ₹{lead.dealValue?.toLocaleString() || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Remarks / Timeline */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-4 mb-4 flex items-center">
              <Calendar size={18} className="mr-2" /> Activity Timeline
            </h3>
            <div className="space-y-6">
              {lead.remarks && lead.remarks.length > 0 ? (
                lead.remarks.map((remark, index) => (
                  <div key={remark._id || index} className="flex gap-4 relative">
                    {/* Line connecting items */}
                    {index !== lead.remarks.length - 1 && (
                      <div className="absolute left-[11px] top-8 bottom-[-24px] w-0.5 bg-gray-200"></div>
                    )}
                    <div className="relative z-10 w-6 h-6 rounded-full bg-blue-100 border-2 border-white shadow-sm flex-shrink-0 mt-1"></div>
                    <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="text-gray-800 text-sm font-medium">{remark.note}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(remark.createdAt).toLocaleString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">No remarks found.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Summary & Status */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-4 mb-4">Current Status</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500 text-sm">Lead Status</span>
                <span className="font-medium text-gray-800 capitalize">{lead.status}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500 text-sm">Payment Status</span>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${
                  lead.paymentStatus === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                  lead.paymentStatus === 'partial' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                  'bg-yellow-100 text-yellow-800 border-yellow-200'
                }`}>
                  {lead.paymentStatus}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500 text-sm">Payment Mode</span>
                <span className="font-medium text-gray-800 uppercase">{lead.paymentMode || 'N/A'}</span>
              </div>
              {lead.transactionDetails && (
                <div className="py-2 border-b border-gray-50">
                  <span className="block text-gray-500 text-sm mb-1">Transaction Details</span>
                  <span className="text-sm text-gray-800 bg-gray-50 p-2 rounded block">{lead.transactionDetails}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500 text-sm">Delivery Status</span>
                <span className="font-medium text-gray-800 capitalize">{lead.deliveryStatus}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500 text-sm">Installation Status</span>
                <span className="font-medium text-gray-800 capitalize">{lead.installationStatus}</span>
              </div>
            </div>
            
            <button 
              onClick={handleUpdatePayment}
              disabled={actionLoading}
              className="w-full mt-6 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-blue-600 font-medium rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
            >
              <CreditCard size={18} /> Update Payment
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-4 mb-4">Verification Check</h3>
            
            {lead.verificationStatus === 'pending' ? (
              <div className="space-y-4">
                <button 
                  onClick={() => handleVerify('verified')}
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <CheckCircle size={20} className="mr-2" />
                  Approve Sale
                </button>
                <button
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                  onClick={() => handleVerify('rejected')}
                >
                  <XCircle size={20} className="mr-2" />
                  Reject Sale
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  lead.verificationStatus === 'verified' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {lead.verificationStatus === 'verified' ? <CheckCircle size={32} /> : <XCircle size={32} />}
                </div>
                <h4 className="font-bold text-gray-800 text-lg capitalize">{lead.verificationStatus}</h4>
                <p className="text-sm text-gray-500 mt-1 mb-6">
                  {lead.accountRemarks || 'No account remarks provided.'}
                </p>
                {lead.verificationStatus === 'verified' && !lead.invoiceUrl && (
                  <button
                    disabled={actionLoading}
                    className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 hover:shadow-md transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                    onClick={handleInvoiceUpload}
                  >
                    <FileText size={20} />
                    Upload Invoice
                  </button>
                )}
                {lead.invoiceUrl && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium mb-4">
                    <CheckCircle size={16} /> Invoice Uploaded
                  </div>
                )}
                {lead.verificationStatus === 'verified' && !lead.transferredToInstallation && (
                  <button
                    disabled={actionLoading}
                    className="w-full mt-2 py-2.5 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 hover:shadow-md transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                    onClick={handleTransferToInstallation}
                  >
                    <CheckCircle size={20} />
                    Transfer to Installation
                  </button>
                )}
                {lead.transferredToInstallation && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-sm font-medium mb-4">
                      <CheckCircle size={16} /> Transferred to Installation
                    </div>
                    <button
                      disabled={actionLoading}
                      onClick={handleAssignInstaller}
                      className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                      <User size={20} />
                      {lead.installationRep ? 'Reassign Installer' : 'Assign Installer'}
                    </button>
                    {lead.installationRep && (
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Currently Assigned to: <span className="font-semibold text-gray-700">{lead.installationRep?.name || 'Installer'}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
