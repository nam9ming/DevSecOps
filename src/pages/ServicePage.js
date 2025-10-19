// ServicePage.jsx (핵심 부분만)
import React, { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Server } from "lucide-react";
import DeploymentDetail from "./DeploymentDetail";
import Textarea from "../components/Textarea";
import { authApi } from "../context/axios";

const ENV_LIST = ["dev", "stage", "prod"];

export default function ServicePage() {
  const { serviceId } = useParams();
  const [serviceDisplayName, setServiceDisplayName] = useState("");
  const [envData, setEnvData] = useState({
    dev: { status: "Pending", updatedAt: null },
    stage: { status: "Pending", updatedAt: null },
    prod: { status: "Pending", updatedAt: null },
  });
  const [loading, setLoading] = useState(true);

  // 서비스 표시 이름
  useEffect(() => {
    authApi
      .get("http://localhost:4000/api/jenkins/services")
      .then((res) => {
        const found = res.data.services.find((s) => s.name === serviceId);
        const pretty = (found?.name || serviceId || "Service")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        setServiceDisplayName(pretty);
      })
      .catch(() => setServiceDisplayName("Service"));
  }, [serviceId]);

  // 배포 로그(상태/시간) 로딩
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        // 1) 상태: /jobcatalog에서 한 번에
        const cat = await authApi.get("http://localhost:4000/api/deployment/jobcatalog");
        const me = (cat.data || []).find((j) => j.name === serviceId);

        // 2) 시간: /lastdeploy를 env별로 병렬 조회
        const timeReqs = ENV_LIST.map((env) =>
          authApi
            .get("http://localhost:4000/api/deployment/lastdeploy", {
              params: { job: serviceId, env },
            })
            .then((r) => [env, r.data?.lastDeploy || null])
            .catch(() => [env, null])
        );
        const timePairs = await Promise.all(timeReqs);
        const times = Object.fromEntries(timePairs); // { dev: "2025.07...", stage: ... }

        if (!mounted) return;

        setEnvData({
          dev: { status: me?.statuses?.dev || "Pending", updatedAt: times.dev },
          stage: { status: me?.statuses?.stage || "Pending", updatedAt: times.stage },
          prod: { status: me?.statuses?.prod || "Pending", updatedAt: times.prod },
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (serviceId) load();
    return () => {
      mounted = false;
    };
  }, [serviceId]);

  const environments = useMemo(
    () => [
      { name: "Dev", label: "DEV 환경", ...envData.dev },
      { name: "Stage", label: "STAGE 환경", ...envData.stage },
      { name: "Prod", label: "PROD 환경", ...envData.prod },
    ],
    [envData]
  );

  return (
    <div className="p-8 bg-gray-50 min-h-[calc(100vh-120px)]">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {serviceDisplayName || "Service"}
      </h1>

      <div className="">
        <h2 className="text-2xl font-bold "> 배포 관리 </h2>
        <DeploymentDetail />
      </div>

      <h2 className="text-2xl font-bold mb-4"> 배포 로그 </h2>
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        {loading ? (
          <div className="text-sm text-gray-500">불러오는 중…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {environments.map((env) => (
              <Link
                key={env.name}
                to={`/service/${serviceId}/${env.name.toLowerCase()}`}
                className="flex flex-col justify-between p-5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border"
              >
                <div className="flex items-center gap-3 mb-3 text-gray-700 font-medium">
                  <Server className="w-5 h-5 text-blue-500" />
                  {env.label}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Last updated: {env.updatedAt || "-"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-4">파이프라인 </h2>
        <Textarea jobName={serviceId} />
      </div>
    </div>
  );
}
