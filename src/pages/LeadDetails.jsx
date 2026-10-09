import React, { useState, useEffect } from 'react';
import WhatsAppChooserModal from '../components/WhatsAppChooserModal';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { 
  User, Mail, Phone, MapPin, Briefcase, Calendar, 
  MessageSquare, CheckCircle, Clock, XCircle, ArrowLeft,
  ExternalLink, CreditCard, FileText, Edit, Truck
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
  const [waModalLead, setWaModalLead] = useState(null);

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
    const isEdit = !!lead.invoiceUrl;
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
            <input type="text" id="swal-awb-number" value="${lead.awbNumber || ''}" placeholder="Enter AWB or Tracking Number" class="w-full p-2 border border-gray-300 rounded-lg">
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
        const file = fileInput.files[0];
        const awbNumber = awbInput.value.trim();

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
      Swal.fire('Success', isEdit ? 'Invoice & AWB updated successfully!' : 'Invoice uploaded successfully!', 'success');
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
    try {
      setActionLoading(true);
      const [whRes, prodRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/stock/warehouses`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/stock/products`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { data: [] } }))
      ]);
      
      const warehouses = (whRes.data?.data || []).filter(w => w.status === 'active');
      const allProducts = prodRes.data?.data || [];
      
      if (!warehouses || warehouses.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'No Active Warehouses',
          text: 'No active warehouse found in Stock Panel. Please create or activate a warehouse first.',
        });
        return;
      }

      const rawItems = (lead.items && lead.items.length > 0) 
        ? lead.items 
        : (lead.productId ? [{ name: lead.productId.name || 'Product', quantity: lead.productQuantity || 1, productId: lead.productId }] : []);

      let itemsHtml = '';
      if (rawItems.length > 0) {
        itemsHtml = rawItems.map((it, idx) => {
          const targetProdId = it.productId?._id || (typeof it.productId === 'string' ? it.productId : null);
          let prodObj = allProducts.find(p => p._id?.toString() === targetProdId?.toString() || (p.name && it.name && p.name.trim().toLowerCase() === it.name.trim().toLowerCase()));
          if (!prodObj && it.productId && typeof it.productId === 'object' && it.productId.warehouseStock) {
            prodObj = it.productId;
          }

          const optionsHtml = warehouses.map(w => {
            const stockEntry = (prodObj?.warehouseStock || []).find(ws => 
              (ws.warehouse?._id?.toString() || ws.warehouse?.toString()) === w._id.toString()
            );
            const qty = stockEntry ? stockEntry.quantity : 0;
            const isAvailable = qty > 0;
            const stockBadge = isAvailable ? `[Stock: ${qty} Available]` : `[Stock: 0 - Out of Stock]`;
            return `<option value="${w._id}" data-stock="${qty}">
              ${w.name} (${w.code || w.city || 'WH'}) — ${stockBadge}
            </option>`;
          }).join('');

          const stockChipsHtml = warehouses.map(w => {
            const stockEntry = (prodObj?.warehouseStock || []).find(ws => 
              (ws.warehouse?._id?.toString() || ws.warehouse?.toString()) === w._id.toString()
            );
            const qty = stockEntry ? stockEntry.quantity : 0;
            const hasStock = qty > 0;
            return `<span style="display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: ${hasStock ? '#dcfce7' : '#f1f5f9'}; color: ${hasStock ? '#15803d' : '#94a3b8'}; border: 1px solid ${hasStock ? '#86efac' : '#e2e8f0'};">
              <span>${w.name}</span>: <b>${qty}</b>
            </span>`;
          }).join('');

          return `
            <div style="background: #ffffff; padding: 12px 14px; border-radius: 12px; margin-bottom: 10px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 800; color: #0f172a; font-size: 13px;">${it.name || it.productId?.name || `Item #${idx + 1}`}</span>
                <span style="background: #eff6ff; color: #1d4ed8; font-weight: 800; font-size: 11px; padding: 2px 8px; border-radius: 9999px; border: 1px solid #bfdbfe;">Required: ${it.quantity || 1} units</span>
              </div>

              <!-- Available Stock in Warehouses -->
              <div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin: 2px 0;">
                <span style="font-size: 10px; font-weight: 800; color: #64748b; margin-right: 2px;">📦 Available Stock:</span>
                ${stockChipsHtml}
              </div>

              <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 2px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 11px; font-weight: 700; color: #475569; white-space: nowrap;">Dispatch Warehouse *:</span>
                  <select id="swal-item-wh-${idx}" class="swal-item-wh-select" data-required="${it.quantity || 1}" style="width: 100%; padding: 7px 9px; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 12px; font-weight: 700; color: #0f172a; background-color: #f8fafc;">
                    <option value="">-- Select Warehouse (Check Stock) --</option>
                    ${optionsHtml}
                  </select>
                </div>
                <div id="swal-stock-warning-${idx}" style="display: none; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 6px; margin-top: 2px;"></div>
              </div>
            </div>
          `;
        }).join('');
      }

      // Master options
      const masterOptionsHtml = warehouses.map(w => 
        `<option value="${w._id}">${w.name} (${w.code || w.city || 'WH'})${w.city ? ` - ${w.city}` : ''}</option>`
      ).join('');

      const { value: formValues } = await Swal.fire({
        title: '🚚 Dispatch & Stock Out',
        width: '580px',
        html: `
          <div style="text-align: left; font-size: 13px;">
            <p style="margin-bottom: 12px; color: #475569; font-size: 13px;">
              Select the warehouse for each product to dispatch for <b>${lead.name}</b>. Available stock in each warehouse is shown below:
            </p>

            ${rawItems.length > 1 ? `
            <div style="background: #f8fafc; padding: 10px 12px; border-radius: 10px; margin-bottom: 12px; border: 1px solid #cbd5e1;">
              <label style="display: block; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #475569; margin-bottom: 4px;">
                ⚡ Quick Select: Apply Same Warehouse to All Products
              </label>
              <select id="swal-master-wh" style="width: 100%; padding: 7px 9px; border-radius: 6px; border: 1px solid #94a3b8; font-size: 12px; font-weight: 600; color: #0f172a; background: #fff;">
                <option value="">-- Apply to All Products --</option>
                ${masterOptionsHtml}
              </select>
            </div>` : ''}

            <div style="margin-bottom: 12px;">
              <label style="display: block; font-weight: 700; font-size: 12px; color: #334155; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                Products & Selected Warehouses (${rawItems.length} items):
              </label>
              <div style="max-height: 280px; overflow-y: auto; padding-right: 2px;">
                ${itemsHtml}
              </div>
            </div>

            <label style="display: block; font-weight: 600; margin-bottom: 4px; color: #334155; font-size: 12px;">Transport / Dispatch Instructions (Optional)</label>
            <textarea id="swal-dispatch-remarks" placeholder="E.g., Fragile handling, Fast courier, Specific packaging..." style="width: 100%; height: 60px; margin: 0; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; box-sizing: border-box;"></textarea>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Confirm & Transfer',
        confirmButtonColor: '#10B981',
        cancelButtonText: 'Cancel',
        didOpen: () => {
          const updateWarnings = () => {
            const itemSelects = document.querySelectorAll('.swal-item-wh-select');
            itemSelects.forEach((sel, idx) => {
              const selectedOpt = sel.options[sel.selectedIndex];
              const stock = selectedOpt ? parseInt(selectedOpt.getAttribute('data-stock') || '0', 10) : 0;
              const required = parseInt(sel.getAttribute('data-required') || '1', 10);
              const warnEl = document.getElementById(`swal-stock-warning-${idx}`);
              
              if (warnEl) {
                if (!sel.value) {
                  warnEl.style.display = 'none';
                } else if (stock === 0) {
                  warnEl.style.display = 'block';
                  warnEl.style.background = '#fef2f2';
                  warnEl.style.color = '#dc2626';
                  warnEl.style.border = '1px solid #fecaca';
                  warnEl.innerHTML = '⚠️ Selected warehouse has 0 stock! SuperAdmin will need to verify stock in Stock Panel.';
                } else if (stock < required) {
                  warnEl.style.display = 'block';
                  warnEl.style.background = '#fffbeb';
                  warnEl.style.color = '#d97706';
                  warnEl.style.border = '1px solid #fde68a';
                  warnEl.innerHTML = `⚠️ Low stock in this warehouse (Available: ${stock}, Required: ${required}).`;
                } else {
                  warnEl.style.display = 'block';
                  warnEl.style.background = '#f0fdf4';
                  warnEl.style.color = '#16a34a';
                  warnEl.style.border = '1px solid #bbf7d0';
                  warnEl.innerHTML = `✓ Stock Available in this warehouse (${stock} units in stock).`;
                }
              }
            });
          };

          const itemSelects = document.querySelectorAll('.swal-item-wh-select');
          itemSelects.forEach(sel => {
            sel.addEventListener('change', updateWarnings);
          });

          const masterSelect = document.getElementById('swal-master-wh');
          if (masterSelect) {
            masterSelect.addEventListener('change', (e) => {
              const val = e.target.value;
              if (val) {
                itemSelects.forEach(sel => { sel.value = val; });
                updateWarnings();
              }
            });
          }
        },
        preConfirm: () => {
          const itemWarehouses = {};
          let missingItem = null;
          let primaryWarehouseId = '';

          for (let i = 0; i < rawItems.length; i++) {
            const el = document.getElementById(`swal-item-wh-${i}`);
            const whVal = el ? el.value : '';
            if (!whVal) {
              missingItem = rawItems[i].name || `Item #${i + 1}`;
              break;
            }
            itemWarehouses[i] = whVal;
            if (rawItems[i].productId?._id || rawItems[i].productId) {
              const pId = (rawItems[i].productId._id || rawItems[i].productId).toString();
              itemWarehouses[pId] = whVal;
            }
            if (!primaryWarehouseId) primaryWarehouseId = whVal;
          }

          if (missingItem) {
            Swal.showValidationMessage(`Please choose a warehouse for "${missingItem}"!`);
            return false;
          }

          const remarks = document.getElementById('swal-dispatch-remarks')?.value || '';
          return { warehouseId: primaryWarehouseId, itemWarehouses, remarks };
        }
      });

      if (formValues && formValues.warehouseId) {
        setActionLoading(true);
        const response = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/accounts/leads/${id}/transfer`, formValues, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.status === 'success') {
          Swal.fire('Request Submitted!', 'Transfer request submitted to SuperAdmin for approval. Stock records will be maintained in the Stock Panel upon approval.', 'success');
          setLead(response.data.data.lead);
        }
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to submit transfer request', 'error');
    } finally {
      setActionLoading(false);
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
                    <button onClick={() => setWaModalLead(lead)} className="text-green-600 hover:underline font-medium flex items-center">
                      Chat on WhatsApp <ExternalLink size={12} className="ml-1" />
                    </button>
                  ) : (
                    <p className="text-gray-400 text-sm">Not available</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Briefcase size={18} /></div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Assigned Sales Person</p>
                  {lead.assignedTo ? (
                    <div>
                      <p className="font-semibold text-gray-800">{lead.assignedTo.name}</p>
                      {lead.assignedTo.phone && <p className="text-xs text-gray-500">{lead.assignedTo.phone}</p>}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm italic">Unassigned</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><User size={18} /></div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Verification Status</p>
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
                {lead.items && lead.items.length > 0 ? (
                  <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm">
                    <p className="text-xs text-amber-700 font-bold uppercase tracking-wider mb-2">
                      Confirmed Products ({lead.items.length} {lead.items.length === 1 ? 'Item' : 'Items'})
                    </p>
                    <div className="space-y-1.5">
                      {lead.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs bg-white/80 p-2 rounded border border-amber-100">
                          <div>
                            <span className="font-bold text-gray-900">{it.name || it.productId?.name || `Item ${idx + 1}`}</span>
                            <span className="text-gray-500 ml-2">Qty: {it.quantity || 1} {it.price ? `(₹${it.price.toLocaleString()})` : ''}</span>
                          </div>
                          {it.price > 0 && (
                            <span className="font-bold text-amber-600">₹{((it.price || 0) * (it.quantity || 1)).toLocaleString()}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : lead.productId ? (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm">
                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Catalog Product</p>
                    <p className="font-bold text-gray-800">{lead.productId.name} (SKU: {lead.productId.sku})</p>
                    <p className="text-xs text-gray-600 mt-0.5">Quantity Sold: {lead.productQuantity || 1}</p>
                  </div>
                ) : null}
                <p className="text-sm text-gray-500 font-medium mb-1">Product Details / Requirement</p>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-gray-800 text-sm">
                  {lead.productDetails || 'No details provided'}
                </div>

                {lead.dispatchWarehouse && (
                  <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200 text-sm">
                    <div className="flex items-center gap-2 text-purple-900 font-semibold mb-1">
                      <Truck size={16} className="text-purple-600" />
                      <span>Dispatch Warehouse: {lead.dispatchWarehouse.name} {lead.dispatchWarehouse.code ? `(${lead.dispatchWarehouse.code})` : ''}</span>
                    </div>
                    {lead.dispatchWarehouse.city && (
                      <p className="text-xs text-purple-700 ml-6">City / Location: {lead.dispatchWarehouse.city}</p>
                    )}
                    {lead.dispatchRemarks && (
                      <p className="text-xs text-purple-800 mt-1 ml-6 bg-purple-100/70 px-2 py-0.5 rounded inline-block">
                        Note: {lead.dispatchRemarks}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium mb-1">Deal Value</p>
                  <div className="p-3 bg-green-50 text-green-800 rounded-lg border border-green-100 font-bold text-lg flex items-center">
                    ₹{lead.dealValue?.toLocaleString() || 0}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium mb-1">Amount Paid</p>
                  <div className="p-3 bg-blue-50 text-blue-800 rounded-lg border border-blue-100 font-bold text-lg flex items-center">
                    ₹{lead.amountPaid?.toLocaleString() || 0}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium mb-1">Pending Amount</p>
                  <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-100 font-bold text-lg flex items-center">
                    ₹{lead.pendingAmount?.toLocaleString() || 0}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 mt-4 pt-4 border-t border-gray-100">
              {(() => {
                const screenshots = Array.from(new Set([
                  ...(Array.isArray(lead.paymentScreenshots) ? lead.paymentScreenshots : []),
                  ...(lead.paymentScreenshot ? [lead.paymentScreenshot] : [])
                ]));
                if (screenshots.length === 0) return null;
                return (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Payment Screenshots / Receipts ({screenshots.length})</p>
                      <div className="flex flex-col gap-1 mt-1">
                        {screenshots.map((url, i) => (
                          <a key={i} href={`${import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')}${url}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-orange-600 hover:underline flex items-center gap-1 text-sm">
                            View Confirmed Payment Screenshot {screenshots.length > 1 ? i + 1 : ''} <ExternalLink size={12} />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
              {lead.awbNumber && (
                <div className="flex items-start gap-3 sm:ml-8">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">AWB / Tracking Number</p>
                    <p className="font-semibold text-indigo-600">{lead.awbNumber}</p>
                  </div>
                </div>
              )}
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
                  <div className="space-y-2 mb-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium w-full justify-center">
                      <CheckCircle size={16} /> Invoice Uploaded (AWB: {lead.awbNumber || 'N/A'})
                    </div>
                    <button
                      disabled={actionLoading}
                      className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg shadow-xs border border-gray-300 transition-all disabled:opacity-50 flex justify-center items-center gap-2 text-sm"
                      onClick={handleInvoiceUpload}
                    >
                      <Edit size={16} /> Edit Invoice & AWB
                    </button>
                  </div>
                )}
                {lead.verificationStatus === 'verified' && !lead.transferredToInstallation && (
                  <div>
                    {lead.transferApprovalStatus === 'pending' ? (
                      <div className="w-full mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wide">
                          ⏳ Transfer Pending SuperAdmin Approval
                        </span>
                        <p className="text-xs text-amber-600 mt-1">
                          Dispatch warehouse: <span className="font-semibold">{lead.dispatchWarehouse?.name || 'Selected Warehouse'}</span>. Stock will be deducted upon approval.
                        </p>
                      </div>
                    ) : lead.transferApprovalStatus === 'rejected' ? (
                      <div className="w-full mt-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-left">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 uppercase tracking-wide">
                          ❌ Transfer Request Rejected by SuperAdmin
                        </span>
                        {lead.transferRejectionRemarks && (
                          <p className="text-xs text-rose-600 mt-1">
                            Reason: <span className="font-medium">{lead.transferRejectionRemarks}</span>
                          </p>
                        )}
                        <button
                          disabled={actionLoading}
                          className="w-full mt-2.5 py-2 bg-rose-600 text-white font-semibold rounded-lg shadow-sm hover:bg-rose-700 transition-all disabled:opacity-50 flex justify-center items-center gap-2 text-xs"
                          onClick={handleTransferToInstallation}
                        >
                          <Truck size={16} /> Re-submit Transfer Request
                        </button>
                      </div>
                    ) : (
                      <button
                        disabled={actionLoading}
                        className="w-full mt-2 py-2.5 bg-emerald-600 text-white font-semibold rounded-lg shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                        onClick={handleTransferToInstallation}
                      >
                        <Truck size={20} />
                        Request Warehouse Transfer
                      </button>
                    )}
                  </div>
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
      <WhatsAppChooserModal link={waModalLead?.integrations?.whatsappLink} phone={waModalLead?.phone} isOpen={!!waModalLead} onClose={() => setWaModalLead(null)} />
    </div>
  );
}
