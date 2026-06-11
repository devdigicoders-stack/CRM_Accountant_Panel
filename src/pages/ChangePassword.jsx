import React, { useState } from 'react';
import { Lock, Key, CheckCircle, Eye, EyeOff, Shield } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';

export default function ChangePassword() {
  const { token } = useAuth();
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      return Swal.fire('Error', 'Please fill in all fields', 'error');
    }
    if (newPassword !== confirmPassword) {
      return Swal.fire('Error', 'New passwords do not match', 'error');
    }
    if (newPassword.length < 8) {
      return Swal.fire('Error', 'New password must be at least 8 characters long', 'error');
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.status === 'success') {
        Swal.fire('Success', 'Password updated successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Optional: logout the user if backend doesn't issue a new token
      }
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Failed to update password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Change Password</h1>
        <p className="text-gray-500 mt-1">Ensure your account is using a long, random password to stay secure.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg mr-4">
                <Key size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Update Password</h3>
                <p className="text-sm text-gray-500">Please enter your current password to change it.</p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    type={showOld ? "text" : "password"} 
                    placeholder="Enter current password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    type={showNew ? "text" : "password"} 
                    placeholder="Enter new password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    type={showConfirm ? "text" : "password"} 
                    placeholder="Confirm new password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Security Rules */}
        <div className="md:col-span-1">
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 h-full">
            <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
              <Shield size={18} className="mr-2 text-blue-600" />
              Password Requirements
            </h4>
            <ul className="space-y-3 text-sm text-blue-800">
              <li className="flex items-start">
                <CheckCircle size={16} className="mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Minimum 8 characters long</span>
              </li>
              <li className="flex items-start">
                <CheckCircle size={16} className="mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                <span>At least one uppercase character</span>
              </li>
              <li className="flex items-start">
                <CheckCircle size={16} className="mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                <span>At least one lowercase character</span>
              </li>
              <li className="flex items-start">
                <CheckCircle size={16} className="mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                <span>At least one number or special character (@$!%*?&)</span>
              </li>
              <li className="flex items-start mt-4 pt-4 border-t border-blue-200">
                <span className="text-xs text-blue-600 font-medium">Changing your password will sign you out on all other devices.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
