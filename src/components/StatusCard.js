// src/components/StatusCard.jsx
import React from "react";

export default function StatusCard({ title, status, subtitle, time }) {
    const statusColor = status === "Success" ? "bg-green-100 text-green-800" : status === "Building" ? "bg-blue-100 text-blue-800" : status === "Pending" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800";

    return (
        <div className="bg-white rounded-lg shadow-sm border p-4 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-sm font-medium text-gray-600">{title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                </div>
                <div className={`px-2 py-1 text-xs font-semibold rounded ${statusColor}`}>{status}</div>
            </div>

            <div className="mt-4 text-xs text-gray-400">{time}</div>
        </div>
    );
}
