import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Server, ChevronRight } from "lucide-react";
import classNames from "classnames";
import axios from "axios";
import PipelineEditor from "../components/PipelineEditor";
import DeploymentDetail from "./DeploymentDetail";

const environments = [
    { name: "Dev", label: "DEV 환경", status: "Success", updatedAt: "2025.07.08 15:30" },
    { name: "Stage", label: "STAGE 환경", status: "Building", updatedAt: "2025.07.08 15:12" },
    { name: "Prod", label: "PROD 환경", status: "Pending", updatedAt: "2025.07.07 22:02" },
];

const statusColor = {
    Success: "bg-green-100 text-green-700",
    Failed: "bg-red-100 text-red-700",
    Building: "bg-blue-100 text-blue-700",
    Pending: "bg-yellow-100 text-yellow-700",
};

const ServicePage = () => {
    const { serviceId } = useParams();
    const [serviceDisplayName, setServiceDisplayName] = useState("");

    useEffect(() => {
        axios
            .get("http://localhost:4000/api/jenkins/services")
            .then((res) => {
                // 전체 서비스명 리스트 확인
                console.log("서비스 목록:", res.data.services);
                // 정확히 일치하는 job 찾기
                const found = res.data.services.find((s) => s.name === serviceId);
                if (found && found.name) {
                    // prettier
                    const prettyName = found.name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                    setServiceDisplayName(prettyName);
                } else {
                    // 못 찾으면 fallback
                    setServiceDisplayName(serviceId ? serviceId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Service");
                }
            })
            .catch((err) => {
                console.error("서비스명 조회 실패:", err);
                setServiceDisplayName("Service");
            });
    }, [serviceId]);

    return (
        <div className="p-8 bg-gray-50 min-h-[calc(100vh-120px)]">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">{serviceDisplayName || "Service"}</h1>
            <div className="">
                <h2 className="text-2xl font-bold "> 배포 관리 </h2>
                <DeploymentDetail />
            </div>

            <h2 className="text-2xl font-bold mb-4"> 배포 로그 </h2>
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {environments.map((env) => (
                        <Link key={env.name} to={`/service/${serviceId}/${env.name.toLowerCase()}`} className="flex flex-col justify-between p-5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border">
                            <div className="flex items-center gap-3 mb-3 text-gray-700 font-medium">
                                <Server className="w-5 h-5 text-blue-500" />
                                {env.label}
                            </div>
                            <div className="flex justify-between items-end mt-auto">
                                <span className={classNames("px-3 py-1 text-xs font-semibold rounded-full", statusColor[env.status])}>{env.status}</span>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </div>
                            <p className="mt-2 text-xs text-gray-500">Last updated: {env.updatedAt}</p>
                        </Link>
                    ))}
                </div>
            </div>

            <div className="mt-10">
                <h2 className="text-2xl font-bold mb-4">파이프라인 </h2>
                <PipelineEditor jobName={serviceId} />
            </div>
        </div>
    );
};

export default ServicePage;
