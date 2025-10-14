import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useNavigate } from "react-router-dom";

import { authApi } from "../context/axios";
import { Database, Trash2 } from "lucide-react";

const statusColor = {
    Success: "bg-green-500",
    Failed: "bg-red-500",
    Building: "bg-blue-500",
    Pending: "bg-yellow-500",
};

// 상태 뱃지 컴포넌트
const StatusBadge = ({ status }) => <span className={`text-white text-sm px-3 py-1 rounded-full ${statusColor[status] || "bg-gray-400"}`}>{status}</span>;

const ProxyURL = process.env.REACT_APP_SERVER_URL || "http://localhost:4000";

const Deployments = forwardRef((props, ref) => {
    // 서비스 배포 상태를 가져오기 위한 상태
    const [serviceData, setServiceData] = useState([]);

    const navigate = useNavigate();

    const fetchStatuses = async () => {
        try {
            const res = await authApi.get(`${ProxyURL}/api/deployment/jobcatalog`);
            setServiceData(res.data);
        } catch (err) {
            console.error("서비스 배포 상태를 불러오지 못했습니다:", err);
        }
    };

    // 서비스 배포 상태를 불러옴
    useEffect(() => {
        fetchStatuses();
    }, []);

    useImperativeHandle(ref, () => ({
        refetch: fetchStatuses,
    }));

    // 서비스 클릭 시 해당 서비스의 배포 화면으로 이동함
    const handleServiceClick = (name) => {
        const envURL = name.toLowerCase().replace(/\s+/g, "-");
        navigate(`/service/${envURL}`); // 기본 env는 dev로
    };

    const handleDelete = async (name, e) => {
        e.stopPropagation(); // 부모 div 클릭 이벤트 방지
        if (!window.confirm(`${name} 서비스를 삭제하시겠습니까?`)) return;

        try {
            await authApi.delete(`${ProxyURL}/api/deployment/jobcatalog/${encodeURIComponent(name)}`);
            // 삭제 성공 시 로컬 상태에서도 제거
            await fetchStatuses();
        } catch (err) {
            console.error("삭제 실패:", err);
            alert("서비스 삭제에 실패했습니다.");
        }
    };

    return (
        <div className="p-6">
            <div className="space-y-4">
                {serviceData.map(({ name, statuses }) => (
                    <div key={name} className="flex items-center justify-between bg-gray-50 p-4 rounded hover:bg-gray-100 cursor-pointer" onClick={() => handleServiceClick(name)}>
                        <div className="font-medium flex items-center space-x-2">
                            <Database></Database>
                            <span>{name}</span>
                        </div>
                        <div className="flex space-x-4">
                            {["dev", "stage", "prod"].map((env) => (
                                <div key={env} className="flex items-center space-x-1">
                                    <span className="text-sm text-gray-600">{env.toUpperCase()} &gt;</span>
                                    <StatusBadge status={statuses[env]} />
                                </div>
                            ))}
                            <button className="ml-4 p-1 rounded-full hover:bg-red-100" onClick={(e) => handleDelete(name, e)}>
                                <Trash2 className="w-5 h-5 text-red-500" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default Deployments;
