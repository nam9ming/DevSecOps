import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const statusColor = {
  Success: 'bg-green-500',
  Failed: 'bg-red-500',
  Building: 'bg-blue-500',
  Pending: 'bg-yellow-500',
};

// 상태 뱃지 컴포넌트
const StatusBadge = ({ status }) => (
  <span className={`text-white text-sm px-2 py-1 rounded ${statusColor[status] || 'bg-gray-400'}`}>
    {status}
  </span>
);

const ProxyURL = process.env.REACT_APP_SERVER_URL || 'http://localhost:4000';

const Deployments = () => {

  // 서비스 배포 상태를 가져오기 위한 상태
  const [serviceData, setServiceData] = useState([]);

  const navigate = useNavigate();

  // 서비스 배포 상태를 불러옴
  useEffect(() => {
  const fetchStatuses = async () => {
    try {
      // 서버에서 서비스 배포 상태를 가져옴
      const res = await axios.get(`${ProxyURL}/api/deployment/jobcatalog`);
      setServiceData(res.data);
    } catch (err) {
      console.error('서비스 배포 상태를 불러오지 못했습니다:', err);
    }
  };
  fetchStatuses();
  }, []);

  // 서비스 클릭 시 해당 서비스의 배포 화면으로 이동함
  const handleServiceClick = (name) => {
    const envURL = name.toLowerCase().replace(/\s+/g, '-'); 
    navigate(`/deployments/${envURL}`); // 기본 env는 dev로
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">서비스 배포</h1>

      <div className="space-y-4">
        {serviceData.map(({ name, statuses }) => (
          <div
            key={name}
            className="flex items-center justify-between bg-gray-50 p-4 rounded hover:bg-gray-100 cursor-pointer"
            onClick={() => handleServiceClick(name)}
          >
            <div className="font-medium flex items-center space-x-2">
              <span>🗄️</span>
              <span>{name}</span>
            </div>
            <div className="flex space-x-4">
              {['dev', 'stage', 'prod'].map((env) => (
                <div key={env} className="flex items-center space-x-1">
                  <span className="text-sm text-gray-600">{env.toUpperCase()} &gt;</span>
                  <StatusBadge status={statuses[env]} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Deployments;
