import React, { useEffect, useState } from "react";
import { Code, AlertTriangle, CheckCircle, TrendingUp, Database, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import MetricCard from "../components/MetricCard";
import SecurityChart from "../components/SecurityChart";
import PerformanceChart from "../components/PerformanceChart";

import { authApi } from "../context/axios";

const envs = ["dev", "stage", "prod"]; // 환경 리스트

const Dashboard = () => {
  const [services, setServices] = useState([]);

  useEffect(() => {
    authApi
      .get("/deployment/jobcatalog") 
      .then((res) => setServices(res.data))
      .catch((err) => console.error(err));
  }, []);

  // Jenkins color code → 상태 변환 (보조 유틸)
  const normalizeStatus = (val) => {
    const v = String(val || "").toLowerCase();
    const known = ["success","failed","unstable","aborted","disabled","notbuilt","pending","building","queued"];
    if (known.includes(v)) return v;
    if (v.includes("anime")) return "building";
    if (v.startsWith("blue")) return "success";
    if (v.startsWith("red"))  return "failed";
    if (v.startsWith("yellow")) return "unstable";
    if (v.startsWith("aborted")) return "aborted";
    if (v.startsWith("disabled") || v.startsWith("grey")) return "disabled";
    if (v.startsWith("notbuilt")) return "notbuilt";
    return "pending";
  };

  return (
    <div className="space-y-6">
      {/* 페이지 타이틀 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          마지막 업데이트: 2분 전
        </div>
      </div>

      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="활성 빌드" value={services.length} change={8} icon={Code} color="bg-blue-500" />
        <MetricCard title="보안 이슈" value="7" change={-15} icon={AlertTriangle} color="bg-red-500" />
        <MetricCard title="평균 TPS" value="186" change={12} icon={TrendingUp} color="bg-purple-500" />
      </div>

      {/* 서비스 배포 상태 */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">서비스 배포 상태</h3>
        </div>
        <div className="p-6 space-y-4">
          {services.map((service, index) => {
            return (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-gray-600" />
                  <Link to={`/service/${service.name}/`} className="font-medium text-gray-900 hover:underline">
                    {service.name} <span className="text-blue-500">&gt;</span>
                  </Link>
                </div>
                <div className="flex items-center gap-4">
                  {envs.map((env) => {
                    const status = normalizeStatus(service?.statuses?.[env]);
                    return (
                      <div key={env} className="flex items-center space-x-1">
                          <span className="text-sm text-gray-600">{env.toUpperCase()} &gt;</span> 
                        <StatusBadge status={status} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SecurityChart />
        <PerformanceChart />
      </div>

      {/* 알림 목록 */}
    </div>
  );
};

export default Dashboard;
