// src/pages/Dashboard.js
import React, { useEffect, useMemo, useState } from "react";
import { Code, AlertTriangle, TrendingUp, Database, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import MetricCard from "../components/MetricCard";
import SecurityChart from "../components/SecurityChart";
import PerformanceChart from "../components/PerformanceChart";
import { authApi } from "../context/axios";

const API = process.env.REACT_APP_API_BASE || "http://localhost:4000";
const envs = ["dev", "stage", "prod"];

/** Jenkins color code → 상태 문자열 정규화 */
const normalizeStatus = (val) => {
  const v = String(val || "").toLowerCase();
  const known = [
    "success",
    "failed",
    "unstable",
    "aborted",
    "disabled",
    "notbuilt",
    "pending",
    "building",
    "queued",
  ];
  if (known.includes(v)) return v;
  if (v.includes("anime")) return "building";
  if (v.startsWith("blue")) return "success";
  if (v.startsWith("red")) return "failed";
  if (v.startsWith("yellow")) return "unstable";
  if (v.startsWith("aborted")) return "aborted";
  if (v.startsWith("disabled") || v.startsWith("grey")) return "disabled";
  if (v.startsWith("notbuilt")) return "notbuilt";
  return "pending";
};

/** Sonar measures 응답 파싱 */
const parseMeasures = (measures) => {
  const m = measures?.component?.measures || [];
  const get = (k) => m.find((x) => x.metric === k)?.value;
  return {
    bugs: get("bugs"),
    vulns: get("vulnerabilities"),
    smells: get("code_smells"),
    coverage: get("coverage"),
    dup: get("duplicated_lines_density"),
  };
};

/** 서비스명 → Sonar projectKey 매핑 */
const getSonarKey = (job) => {
  const map = JSON.parse(localStorage.getItem("sonarMap") || "{}");
  return map[job] || job;
};

/** 상대 시간 계산 */
const timeAgo = (d) => {
  if (!d) return "-";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
};

const Dashboard = () => {
  const [services, setServices] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [securityIssues, setSecurityIssues] = useState(null);
  const [avgTps, setAvgTps] = useState(null);
  const [loading, setLoading] = useState(false);

  /** 1) 서비스 목록 */
  useEffect(() => {
    authApi
      .get("/deployment/jobcatalog")
      .then((res) => setServices(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error("[jobcatalog] error:", err);
        setServices([]);
      });
  }, []);

  /** 2) 지표 수집 (최신 라우터 반영) */
  useEffect(() => {
    if (!services.length) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const svcNames = services.map((s) => s.name).filter(Boolean);

        // (A) 최신 배포 시각: perfRoute 통합 버전 사용
        const deployPromises = [];
        for (const name of svcNames) {
          for (const env of envs) {
            deployPromises.push(
              authApi
                .get(`${API}/api/perf/deploy/lastdeploy`, { params: { job: name, env } })
                .then((r) => {
                  const t = r.data?.lastDeploy;
                  if (!t) return null;
                  const parsed = new Date(t);
                  return isNaN(parsed.getTime()) ? null : parsed;
                })
                .catch(() => null)
            );
          }
        }
        const deployResults = await Promise.allSettled(deployPromises);
        const deployDates = deployResults
          .map((p) => (p.status === "fulfilled" ? p.value : null))
          .filter((d) => d instanceof Date);
        const latest = deployDates.length
          ? new Date(Math.max(...deployDates.map((d) => d.getTime())))
          : null;
        setLastUpdated(latest);

        // (B) 보안 이슈 합계
        const sonarPromises = svcNames.map((name) => {
          const key = getSonarKey(name);
          return authApi
            .get(`${API}/api/perf/sonar/summary`, { params: { projectKey: key } })
            .then((r) => {
              const parsed = parseMeasures(r.data);
              const vulns = parsed.vulns ? Number(parsed.vulns) : 0;
              return isNaN(vulns) ? 0 : vulns;
            })
            .catch(() => 0);
        });
        const vulnsArr = await Promise.allSettled(sonarPromises);
        const vulnsSum = vulnsArr.reduce(
          (acc, p) => acc + (p.status === "fulfilled" ? p.value : 0),
          0
        );
        setSecurityIssues(vulnsSum);

        // (C) 평균 TPS
        const tpsPromises = svcNames.map((name) =>
          authApi
            .get(`${API}/api/perf/jmeter/summary`, { params: { job: name } })
            .then((r) => {
              const tp = r.data?.summary?.throughput;
              const n = typeof tp === "number" ? tp : Number(tp);
              return isNaN(n) ? null : n;
            })
            .catch(() => null)
        );
        const tpsArr = await Promise.allSettled(tpsPromises);
        const tpsNums = tpsArr
          .map((p) => (p.status === "fulfilled" ? p.value : null))
          .filter((v) => typeof v === "number");
        const avg = tpsNums.length
          ? tpsNums.reduce((a, b) => a + b, 0) / tpsNums.length
          : null;
        setAvgTps(avg);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [services]);

  const servicesMemo = useMemo(() => services, [services]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          마지막 업데이트: {lastUpdated ? timeAgo(lastUpdated) : loading ? "계산 중…" : "-"}
        </div>
      </div>

      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="활성 빌드"
          value={servicesMemo.length}
          icon={Code}
          color="bg-blue-500"
        />
        <MetricCard
          title="보안 이슈"
          value={securityIssues != null ? String(securityIssues) : loading ? "…" : "-"}
          icon={AlertTriangle}
          color="bg-red-500"
        />
        <MetricCard
          title="평균 TPS"
          value={avgTps != null ? Math.round(avgTps) : loading ? "…" : "-"}
          icon={TrendingUp}
          color="bg-purple-500"
        />
      </div>

      {/* 서비스 배포 상태 */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">서비스 배포 상태</h3>
        </div>
        <div className="p-6 space-y-4">
          {servicesMemo.map((service, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-gray-600" />
                <Link
                  to={`/service/${service.name}/`}
                  className="font-medium text-gray-900 hover:underline"
                >
                  {service.name} <span className="text-blue-500">&gt;</span>
                </Link>
              </div>
              <div className="flex items-center gap-4">
                {envs.map((env) => {
                  const status = normalizeStatus(service?.statuses?.[env]);
                  return (
                    <div key={env} className="flex items-center space-x-1">
                      <span className="text-sm text-gray-600">
                        {env.toUpperCase()} &gt;
                      </span>
                      <StatusBadge status={status} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {!servicesMemo.length && (
            <div className="text-sm text-gray-500 px-1">서비스가 없습니다.</div>
          )}
        </div>
      </section>

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SecurityChart />
        <PerformanceChart />
      </div>
    </div>
  );
};

export default Dashboard;
