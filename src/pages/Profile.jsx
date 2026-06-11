import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, Shield, Camera } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.status === 'success') {
        const user = response.data.data.user;
        setProfile(user);
        setName(user.name || '');
        setPhone(user.phone || '');
        if (user.profilePic) {
          setPreviewUrl(`${import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')}${user.profilePic}`);
        }
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name || !phone) {
      return Swal.fire('Error', 'Name and Phone are required', 'error');
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('name', name);
      formData.append('phone', phone);
      if (selectedFile) {
        formData.append('profilePic', selectedFile);
      }

      const response = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/profile`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.status === 'success') {
        Swal.fire('Success', 'Profile updated successfully!', 'success');
        const user = response.data.data.user;
        setProfile(user);
        if (user.profilePic) {
          setPreviewUrl(`${import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')}${user.profilePic}`);
        }
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">My Profile</h1>
        <p className="text-gray-500 mt-1">Manage your account information and personal details.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Col: Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <div className="px-6 pb-6 relative flex flex-col items-center text-center">
              <div className="w-24 h-24 -mt-12 bg-white rounded-full p-1 border border-gray-200 relative z-10 shadow-sm">
                <div className="w-full h-full rounded-full bg-blue-100 overflow-hidden flex items-center justify-center text-blue-600 font-bold text-3xl">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    profile?.name?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current.click()}
                  className="absolute bottom-0 right-0 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-sm border-2 border-white"
                  title="Change Profile Picture"
                >
                  <Camera size={14} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              <div className="mt-4">
                <h2 className="text-xl font-bold text-gray-800">{profile?.name || 'User'}</h2>
                <p className="text-sm font-medium text-blue-600 flex items-center justify-center mt-1 capitalize">
                  <Shield size={14} className="mr-1" /> {profile?.role || 'Accountant'}
                </p>
              </div>
              <div className="mt-6 space-y-3 w-full text-left bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail size={16} className="mr-3 text-gray-400" />
                  <span className="truncate">{profile?.email || 'N/A'}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone size={16} className="mr-3 text-gray-400" />
                  <span>{profile?.phone || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Edit Profile Form */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Personal Information</h3>
            </div>
            
            <form className="space-y-5" onSubmit={handleUpdateProfile}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700" 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address (Read Only)</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input 
                      type="email" 
                      value={profile?.email || ''} 
                      disabled
                      className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed text-gray-500" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700" 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
