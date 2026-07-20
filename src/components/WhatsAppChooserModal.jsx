import React from 'react';

const WhatsAppChooserModal = ({ link, phone, isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleOpen = (isBusiness) => {
    // For web, both often fall back to standard wa.me or app
    // We maintain the chooser for UX consistency with mobile
    let url = link;
    if (!url && phone) {
      let cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
      url = `https://wa.me/${cleanPhone}`;
    }
    if (url) {
      window.open(url, '_blank');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Open with</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            &times;
          </button>
        </div>
        <div className="p-4 space-y-2">
          <button
            onClick={() => handleOpen(false)}
            className="w-full flex items-center px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
              <span className="text-green-600 text-lg">💬</span>
            </div>
            <span className="text-gray-800 dark:text-gray-200 font-medium">WhatsApp (Normal)</span>
          </button>
          
          <button
            onClick={() => handleOpen(true)}
            className="w-full flex items-center px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-teal-50 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center mr-3">
              <span className="text-teal-600 text-lg">🏢</span>
            </div>
            <span className="text-gray-800 dark:text-gray-200 font-medium">WhatsApp Business</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppChooserModal;
