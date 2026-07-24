import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle, X, Search, Calendar, User, IndianRupee, Edit } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

export default function UploadInvoice() {
  const { token } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [leadId, setLeadId] = useState('');
  const [awbNumber, setAwbNumber] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [pendingLeads, setPendingLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/accounts/leads?verificationStatus=verified&limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.status === 'success') {
        const leads = response.data.data.leads || [];
        
        // Filter leads that have an invoiceUrl for Recent Uploads
        const invoices = leads
          .filter(lead => lead.invoiceUrl)
          .map(lead => ({
            id: lead._id,
            client: lead.name,
            amount: lead.dealValue || 0,
            date: new Date(lead.updatedAt).toLocaleDateString(),
            status: 'Verified',
            url: lead.invoiceUrl,
            awbNumber: lead.awbNumber || ''
          }));
        setRecentInvoices(invoices);

        // Filter leads that don't have an invoiceUrl yet for the Dropdown
        const pending = leads
          .filter(lead => !lead.invoiceUrl)
          .map(lead => ({
            id: lead._id,
            client: lead.name,
            amount: lead.dealValue || 0,
            awbNumber: lead.awbNumber || ''
          }));
        setPendingLeads(pending);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!leadId.trim()) {
      Swal.fire('Error', 'Please select a valid Lead', 'error');
      return;
    }
    if (!awbNumber.trim()) {
      Swal.fire('Error', 'Please enter the AWB / Tracking Number', 'error');
      return;
    }
    if (!selectedFile) {
      Swal.fire('Error', 'Please select an invoice file to upload', 'error');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('invoice', selectedFile);
    formData.append('awbNumber', awbNumber.trim());

    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/accounts/leads/${leadId.trim()}/invoice`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.status === 'success') {
        Swal.fire('Success!', 'Invoice & AWB uploaded successfully', 'success');
        setSelectedFile(null);
        setLeadId('');
        setAwbNumber('');
        fetchData(); // Refresh both lists after successful upload
      } else {
        Swal.fire('Error', 'Failed to upload invoice', 'error');
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', error.response?.data?.message || 'An error occurred while uploading', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditInvoice = async (inv) => {
    const { value: uploadResponse } = await Swal.fire({
      title: 'Edit Invoice & AWB',
      html: `
        <div class="space-y-4 text-left px-2 mt-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Invoice Document (Optional for replacement)</label>
            <input type="file" id="swal-invoice-file" accept="application/pdf, image/jpeg, image/png" class="w-full p-2 border border-gray-300 rounded-lg">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">AWB Number *</label>
            <input type="text" id="swal-awb-number" value="${inv.awbNumber || ''}" placeholder="Enter AWB or Tracking Number" class="w-full p-2 border border-gray-300 rounded-lg">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Update',
      confirmButtonColor: '#2563EB',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        const fileInput = document.getElementById('swal-invoice-file');
        const awbInput = document.getElementById('swal-awb-number');
        const file = fileInput?.files[0];
        const editAwb = awbInput?.value?.trim();

        if (!editAwb) {
          Swal.showValidationMessage('Please enter the AWB / Tracking Number');
          return false;
        }
        
        const formData = new FormData();
        if (file) {
          formData.append('invoice', file);
        }
        formData.append('awbNumber', editAwb);
        
        try {
          const response = await axios.put(
            `${import.meta.env.VITE_API_BASE_URL}/accounts/leads/${inv.id}/invoice`, 
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
          Swal.showValidationMessage(`Update failed: ${error.response?.data?.message || error.message}`);
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    });

    if (uploadResponse && uploadResponse.status === 'success') {
      Swal.fire('Success', 'Invoice & AWB updated successfully!', 'success');
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Upload Invoice</h1>
        <p className="text-gray-500 mt-1">Upload new invoices and link them to verified leads.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Invoice Details</h2>
            
            <form className="space-y-4" onSubmit={handleUpload}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Lead *</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select 
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                    value={leadId}
                    onChange={(e) => setLeadId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Choose a verified lead...</option>
                    {pendingLeads.map(lead => (
                      <option key={lead.id} value={lead.id}>
                        {lead.client} - ₹{lead.amount.toLocaleString()} (ID: {lead.id.slice(-6).toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
                {pendingLeads.length === 0 && !loading && (
                  <p className="text-xs text-amber-600 mt-1 font-medium">No pending verified leads found without an invoice.</p>
                )}
                {pendingLeads.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">Select from {pendingLeads.length} leads waiting for an invoice.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AWB / Tracking Number *</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                  placeholder="Enter AWB or Tracking Number..."
                  value={awbNumber}
                  onChange={(e) => setAwbNumber(e.target.value)}
                  required
                />
              </div>

              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Document *</label>
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input 
                    type="file" 
                    id="invoice-upload" 
                    className="hidden" 
                    onChange={handleChange}
                    accept=".pdf,.png,.jpg,.jpeg"
                  />
                  
                  {!selectedFile ? (
                    <label htmlFor="invoice-upload" className="cursor-pointer flex flex-col items-center">
                      <div className="p-3 bg-white rounded-full shadow-sm mb-3 text-blue-500">
                        <UploadCloud size={28} />
                      </div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 5MB)</p>
                    </label>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="p-3 bg-green-100 rounded-full mb-3 text-green-600">
                        <CheckCircle size={28} />
                      </div>
                      <p className="text-sm font-medium text-gray-800 truncate max-w-full px-4">{selectedFile.name}</p>
                      <button 
                        onClick={(e) => { e.preventDefault(); setSelectedFile(null); }}
                        className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium flex items-center"
                      >
                        <X size={14} className="mr-1" /> Remove File
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isUploading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors mt-4 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {isUploading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> : null}
                {isUploading ? 'Uploading...' : 'Submit Invoice & AWB'}
              </button>
            </form>
          </div>
        </div>

        {/* Recent Uploads Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Recent Uploads</h2>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search clients..." 
                  className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="overflow-x-auto flex-1 p-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-gray-500 text-sm border-b border-gray-100">
                    <th className="p-4 font-medium">Lead ID</th>
                    <th className="p-4 font-medium">Client</th>
                    <th className="p-4 font-medium">AWB Number</th>
                    <th className="p-4 font-medium">Amount</th>
                    <th className="p-4 font-medium">Upload Date</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        Loading invoices...
                      </td>
                    </tr>
                  ) : recentInvoices.filter(inv => inv.client.toLowerCase().includes(searchTerm.toLowerCase()) || inv.id.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500">
                        No uploaded invoices found.
                      </td>
                    </tr>
                  ) : (
                    recentInvoices
                      .filter(inv => inv.client.toLowerCase().includes(searchTerm.toLowerCase()) || inv.id.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((inv, idx) => (
                      <tr key={inv.id || idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center">
                            <FileText size={16} className="text-gray-400 mr-2" />
                            <a 
                              href={`${import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')}${inv.url}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="font-medium text-blue-600 hover:underline"
                              title="View Invoice"
                            >
                              {inv.id.slice(-6).toUpperCase()}
                            </a>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-800 font-medium">{inv.client}</td>
                        <td className="p-4 text-sm text-indigo-600 font-semibold">{inv.awbNumber || 'N/A'}</td>
                        <td className="p-4 font-semibold text-gray-800">₹{inv.amount.toLocaleString()}</td>
                        <td className="p-4 text-sm text-gray-500">{inv.date}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleEditInvoice(inv)}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Edit size={12} /> Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <p>Showing {recentInvoices.length} recent invoices</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
