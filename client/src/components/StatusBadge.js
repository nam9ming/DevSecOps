
import React from 'react';

const StatusBadge = ({ status }) => {
  const statusConfig = {
    success: { color: 'bg-green-500', text: 'text-green-100', label: 'Success' },
    building: { color: 'bg-blue-500', text: 'text-blue-100', label: 'Building' },
    failed: { color: 'bg-red-500', text: 'text-red-100', label: 'Failed' },
    pending: { color: 'bg-yellow-500', text: 'text-yellow-100', label: 'Pending' }
  };

  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.text}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
