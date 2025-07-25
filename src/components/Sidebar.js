import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  GitBranch, Zap, Server, Shield,
  Bug, Settings
} from 'lucide-react';

const menuItems = [
  // { label: '대시보드', path: '/', icon: <Activity size={18} /> }, // 삭제됨
  { label: '저장소', path: '/repositories', icon: <GitBranch size={18} /> },
  { label: '파이프라인', path: '/pipelines', icon: <Zap size={18} /> },
  { label: '배포', path: '/deployments', icon: <Server size={18} /> },
  { label: '보안 리포트', path: '/security', icon: <Shield size={18} /> },
  { label: '테스트 결과', path: '/testing', icon: <Bug size={18} /> },
  { label: '설정', path: '/settings', icon: <Settings size={18} /> }
];

const Sidebar = () => {
  return (
    <div className="w-60 h-screen bg-white border-r">
      {/* 상단 로고 클릭 시 /로 이동 */}
      <Link to="/" className="flex items-center px-6 py-4 gap-2">
        <Shield className="text-blue-600" size={24} />
        <span className="text-gray-800 text-2xl font-extrabold">DevSecOps</span>
      </Link>
      
      <nav className="px-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-3 rounded-lg hover:bg-blue-50 text-sm font-medium ${
                isActive
                  ? 'bg-blue-100 text-blue-600 font-semibold'
                  : 'text-gray-700'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
