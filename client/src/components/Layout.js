// src/components/Layout.js
import Sidebar from './Sidebar';
import Header from './Header'; // Optional
import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-h-screen bg-gray-100">
        <Header /> {/* Optional */}
        <main className="p-6">
          <Outlet />  {/* 여기에 각 페이지 내용이 삽입됨 */}
        </main>
      </div>
    </div>
  );
}
