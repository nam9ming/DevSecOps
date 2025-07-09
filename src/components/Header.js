import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

const Header = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const notifications = [
    "📦 Payment Service 배포 완료",
    "⚠️ Shopping Service Stage 환경 실패",
    "✅ User Service 테스트 완료"
  ];

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
      {/* 대시보드 타이틀 */}
      <h1 className="text-2xl font-bold text-gray-800">대시보드</h1>

      {/* 오른쪽 아이콘 영역 */}
      <div className="relative flex items-center gap-4">
        {/* Notification */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative p-2 rounded-full hover:bg-gray-100 focus:outline-none"
          >
            <Bell className="w-6 h-6 text-gray-600" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
              {notifications.length}
            </span>
          </button>

          {dropdownOpen && (
            <NotificationDropdown
              notifications={notifications}
              onClose={() => setDropdownOpen(false)}
            />
          )}
        </div>

        {/* 사용자 정보 */}
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-white">
          남
        </div>
      </div>
    </header>
  );
};

export default Header;
