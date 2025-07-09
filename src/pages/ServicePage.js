import React from 'react';
import { Link } from 'react-router-dom';
import { Server, ChevronRight } from 'lucide-react';
import classNames from 'classnames';

const ChatServiceDetail = () => {
  const environments = [
    {
      name: 'Dev',
      label: 'DEV 환경',
      status: 'Success',
      updatedAt: '2025.07.08 15:30'
    },
    {
      name: 'Stage',
      label: 'STAGE 환경',
      status: 'Building',
      updatedAt: '2025.07.08 15:12'
    },
    {
      name: 'Prod',
      label: 'PROD 환경',
      status: 'Pending',
      updatedAt: '2025.07.07 22:02'
    }
  ];

  const statusColor = {
    Success: 'bg-green-100 text-green-700',
    Failed: 'bg-red-100 text-red-700',
    Building: 'bg-blue-100 text-blue-700',
    Pending: 'bg-yellow-100 text-yellow-700'
  };

  return (
    <div className="p-8 bg-gray-50 min-h-[calc(100vh-120px)]">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Chat Service</h1>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {environments.map((env) => (
            <Link
              key={env.name}
              to={`/service/chat-service/${env.name.toLowerCase()}`}
              className="flex flex-col justify-between p-5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border"
            >
              <div className="flex items-center gap-3 mb-3 text-gray-700 font-medium">
                <Server className="w-5 h-5 text-blue-500" />
                {env.label}
              </div>

              <div className="flex justify-between items-end mt-auto">
                <span
                  className={classNames(
                    'px-3 py-1 text-xs font-semibold rounded-full',
                    statusColor[env.status]
                  )}
                >
                  {env.status}
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>

              <p className="mt-2 text-xs text-gray-500">Last updated: {env.updatedAt}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatServiceDetail;
