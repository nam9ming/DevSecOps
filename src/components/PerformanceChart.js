// src/components/PerformanceChart.js
import React, { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { authApi } from "../context/axios";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const API = process.env.REACT_APP_API_BASE || "http://localhost:4000";
const ENVS = ["dev", "stage", "prod"];

export default function PerformanceChart() {
  const [labels] = useState(["Dev", "Stage", "Prod"]);
  const [tps, setTps] = useState([0, 0, 0]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        // 1) 서비스 목록
        const { data: svcRes } = await authApi.get(`${API}/api/perf/jenkins/jobs`)
        const services = (svcRes?.services || []).map((s) => s.name);
        if (!services.length) {
          setTps([0, 0, 0]);
          return;
        }

        const sums = [0, 0, 0];
        const counts = [0, 0, 0];

        for (const name of services) {
          for (let i = 0; i < ENVS.length; i++) {
            const env = ENVS[i];

            // (A) env의 마지막 배포 빌드 번호 조회
            let buildNumber = null;
            try {
              const { data: last } = await authApi.get(`${API}/api/deploy/lastdeploy`, {
                params: { job: name, env },
              });
              buildNumber = last?.buildNumber ?? null;
            } catch {
              /* env가 없거나 실패 → 건너뜀 */
            }
            if (!buildNumber) continue;

            // (B) 해당 빌드의 JMeter summary → throughput
            try {
              const { data: jm } = await authApi.get(`${API}/api/perf/jmeter/summary`, {
                params: { job: name, build: buildNumber },
              });
              const tp = jm?.summary?.throughput;
              const v = typeof tp === "number" ? tp : Number(tp);
              if (Number.isFinite(v)) {
                sums[i] += v;
                counts[i] += 1;
              }
            } catch {
              /* 아티팩트 없음 → 건너뜀 */
            }
          }
        }

        const avg = sums.map((s, i) => (counts[i] ? s / counts[i] : 0));
        setTps(avg);
      } catch (e) {
        setErr(e.response?.data?.error || e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "TPS",
          data: tps.map((v) => Math.round(v)),
          backgroundColor: ["#3b82f6", "#10b981", "#f59e0b"],
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    }),
    [labels, tps]
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
      <h4 className="text-lg font-semibold mb-4 text-gray-800">평균 TPS (환경별)</h4>
      {err && <div className="text-sm text-red-600 mb-2">에러: {err}</div>}
      {loading ? <div className="text-sm text-gray-500">계산 중…</div> : <Bar data={data} options={options} />}
      <div className="text-xs text-gray-400 mt-2">
        * 각 환경의 마지막 배포 빌드에서 추출한 JMeter Throughput의 평균값입니다.
      </div>
    </div>
  );
}
