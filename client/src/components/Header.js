import React, { useState, useEffect, useRef } from "react";
import { Bell, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationDropdown from "./NotificationDropdown";

const Header = () => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const userDropdownRef = useRef(null);
    const notifications = ["📦 Payment Service 배포 완료", "⚠️ Shopping Service Stage 환경 실패", "✅ User Service 테스트 완료"];

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    // 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
                setUserDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
            {/* 대시보드 타이틀 */}
            <h1 className="text-2xl font-bold text-gray-800">대시보드</h1>

            {/* 오른쪽 아이콘 영역 */}
            <div className="relative flex items-center gap-4">
                {/* Notification */}
                <div className="relative">
                    <button onClick={() => setDropdownOpen(!dropdownOpen)} className="relative p-2 rounded-full hover:bg-gray-100 focus:outline-none">
                        <Bell className="w-6 h-6 text-gray-600" />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">{notifications.length}</span>
                    </button>

                    {dropdownOpen && <NotificationDropdown notifications={notifications} onClose={() => setDropdownOpen(false)} />}
                </div>

                {/* 사용자 정보 */}
                <div className="relative" ref={userDropdownRef}>
                    <button onClick={() => setUserDropdownOpen(!userDropdownOpen)} className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-white hover:bg-gray-400 transition-colors">
                        {user?.avatar || "사"}
                    </button>

                    {userDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                            <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                                <div className="font-medium">{user?.name || "사용자"}</div>
                                <div className="text-gray-500">{user?.email || "user@example.com"}</div>
                            </div>
                            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                                <LogOut className="w-4 h-4 mr-2" />
                                로그아웃
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
