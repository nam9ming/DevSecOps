// src/pages/PipelinesPage.jsx
import React from "react";
import StatusCard from "../components/StatusCard";
import PipelineEditor from "../components/PipelineEditor";

export default function pipelines() {
    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                <h2 className="text-sm font-semibold text-gray-600 mb-4">Chat Service</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <StatusCard title="DEV 환경" status="Success" subtitle="Last updated: 2025.07.08 15:20" time="Last updated: 2025.07.08 15:20" />
                    <StatusCard title="STAGE 환경" status="Building" subtitle="Last updated: 2025.07.08 15:12" time="Last updated: 2025.07.08 15:12" />
                    <StatusCard title="PROD 환경" status="Pending" subtitle="Last updated: 2025.07.07 22:02" time="Last updated: 2025.07.07 22:02" />
                </div>

                <div className="bg-white rounded-2xl shadow-md p-6">
                    <h1 className="text-2xl font-extrabold mb-4">
                        chat service - <span className="text-indigo-700">DEV 파이프라인</span>
                    </h1>

                    <PipelineEditor />
                </div>
            </div>
        </div>
    );
}
