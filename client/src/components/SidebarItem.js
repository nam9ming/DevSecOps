
import React from 'react';

const SidebarItem = ({ id, label, icon: Icon, active, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
      active 
        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
        : 'text-gray-700 hover:bg-gray-50'
    }`}
  >
    <Icon className="w-5 h-5" />
    {label}
  </button>
);

export default SidebarItem;
