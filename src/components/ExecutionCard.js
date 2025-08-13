import React from 'react';
import { useNavigate } from 'react-router-dom';

const ExecutionCard = ({ data, serviceId, env }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/service/${serviceId}/${env}/execution/${data.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer bg-white border border-gray-200 rounded-lg shadow-sm p-5 transition hover:shadow-md hover:border-blue-400"
    >
      <div className="font-medium text-lg text-gray-900 mb-1">
        {data.message}
      </div>
      <div className="text-sm text-gray-600">
        Job: <span className="text-gray-800 font-semibold">{data.job}</span>
      </div>
      <div
        className={`mt-2 text-sm font-semibold ${
          data.result === 'Success' ? 'text-green-600' : 'text-red-500'
        }`}
      >
        {data.result}
      </div>
    </div>
  );
};

export default ExecutionCard;
