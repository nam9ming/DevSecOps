import React, { useEffect, useState } from "react";
import axios from "axios";
import { Database } from "lucide-react";
import { Link } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";

const Service = () => {
    const API = process.env.REACT_APP_API_BASE || "http://localhost:4000";
    const JENKINS = process.env.REACT_APP_JENKINS_BASE || "http://localhost:8080";
    const envs = ["dev", "stage", "prod"]; // 환경 리스트

    const prettyEnv = (env) => env.charAt(0).toUpperCase() + env.slice(1).toLowerCase();
    const getStatus = (color) => {
        switch (color) {
            case "blue":
                return { label: "success", color: "green" };
            case "red":
                return { label: "failed", color: "red" };
            case "yellow":
                return { label: "unstable", color: "yellow" };
            case "disabled":
                return { label: "disabled", color: "gray" };
            case "notbuilt":
                return { label: "pending", color: "gray" };
            case "blue_anime":
                return { label: "building", color: "blue" };
            default:
                return { label: color, color: "gray" };
        }
    };

    useEffect(() => {
        axios
            .get("http://localhost:4000/api/jenkins/services")
            .then((res) => setServices(res.data.services))
            .catch((err) => console.error(err));
    }, []);

    // 1) 서비스(잡) 목록

    const [services, setServices] = useState([]);

    return (
        <section className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* 서비스 배포 상태 */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">서비스 배포 상태</h3>
                <button type="button" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2">
                    서비스 추가
                </button>
            </div>
            <div className="p-6 space-y-4">
                {services.map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Database className="w-5 h-5 text-gray-600" />

                            <Link to={`/service/${service.name}/`} className="font-medium text-gray-900 hover:underline">
                                {service.name} <span className="text-blue-500">&gt;</span>
                            </Link>
                        </div>
                        <div className="flex items-center gap-4">
                            {envs.map((env) => {
                                const envKey = service.status && service.status[env] ? service.status[env] : service.status;
                                const status = getStatus(envKey);

                                return (
                                    <div key={env} className="flex items-center gap-1">
                                        <Link to={`/service/${service.name}/env/${env}`} className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                                            {prettyEnv(env)} <span>&gt;</span>
                                        </Link>
                                        <StatusBadge status={status.label} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default Service;
