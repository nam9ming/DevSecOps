// src/components/SecurityChart.js
import React, { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { authApi } from "../context/axios";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

const API = process.env.REACT_APP_API_BASE || "http://localhost:4000";

// 서비스명 → Sonar 프로젝트 키 매핑(없으면 서비스명 그대로)
const sonarKey = (name) => {
  const map = JSON.parse(localStorage.getItem("sonarMap") || "{}");
  return map[name] || name;
};

const lastNDaysLabels = (n) => {
  const now = new Date();
  const labels = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    labels.push(`${d.getMonth() + 1}/${String(d.getDate()).padStart(2, "0")}`);
  }
  return labels;
};

export default function SecurityChart() {
  const [labels] = useState(() => lastNDaysLabels(7));
  const [dataset, setDataset] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        // 1) 서비스 목록
        const { data: svcRes } = await authApi.get(`${API}/api/perf/jenkins/jobs`)
        const services = (svcRes?.services || []).map((s) => s.name);
        if (!services.length) {
          setDataset(new Array(labels.length).fill(0));
          return;
        }

        // 2) 프로젝트별 현재 vulnerabilities를 합산
        let totalVulns = 0;
        for (const name of services) {
          try {
            const key = sonarKey(name);
            const { data: sm } = await authApi.get(`${API}/api/perf/sonar/summary`, {
              params: { projectKey: key },
            });
            const measures = sm?.component?.measures || [];
            const v = Number(measures.find((m) => m.metric === "vulnerabilities")?.value || 0);
            if (!Number.isNaN(v)) totalVulns += v;
          } catch {
            /* 개별 프로젝트 실패는 무시 */
          }
        }

        // 3) 최근 7일 라벨에 “현재 총합”을 평평하게 그려 콘솔 404 없이 표시
        setDataset(new Array(labels.length).fill(totalVulns));
      } catch (e) {
        setErr(e.response?.data?.error || e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [labels]);

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "보안 이슈 수(총합)",
          data: dataset,
          backgroundColor: "rgba(239, 68, 68, 0.15)", // #ef4444
          borderColor: "#ef4444",
          borderWidth: 2,
          tension: 0.35,
          fill: true,
          pointRadius: 3,
        },
      ],
    }),
    [labels, dataset]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      plugins: { legend: { display: true, position: "top" } },
      scales: { y: { beginAtZero: true } },
    }),
    []
  );

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <h4 className="text-lg font-semibold mb-2 text-gray-800">보안 이슈 트렌드 (최근 7일)</h4>
      {err && <div className="text-sm text-red-600 mb-2">에러: {err}</div>}
      {loading ? <div className="text-sm text-gray-500">불러오는 중…</div> : <Line data={data} options={options} />}
      <div className="text-xs text-gray-400 mt-2">
        * 서버의 히스토리 API 없이 요약값으로 표시합니다.
      </div>
    </div>
  );
}
