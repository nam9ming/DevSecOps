import React, { useEffect, useRef } from 'react';

const NotificationDropdown = ({ notifications, onClose }) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-12 mt-2 w-80 bg-white rounded shadow-lg border border-gray-200 z-50 animate-dropdown"
    >
      <div className="p-4 border-b font-semibold text-gray-800">알림</div>
      <ul className="max-h-60 overflow-y-auto">
        {notifications.length === 0 ? (
          <li className="p-4 text-gray-500 text-sm">알림이 없습니다.</li>
        ) : (
          notifications.map((note, index) => (
            <li key={index} className="p-4 hover:bg-gray-100 text-sm text-gray-700">
              {note}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default NotificationDropdown;
