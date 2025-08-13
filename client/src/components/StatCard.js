import React from 'react';

const StatCard = ({ title, value, change, isPositive, icon }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center border">
      <div>
        <div className="text-sm text-gray-500">{title}</div>
        <div className="text-2xl font-bold">{value}</div>
        <div className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {change} vs 지난주
        </div>
      </div>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
        {icon}
      </div>
    </div>
  );
};

export default StatCard;
