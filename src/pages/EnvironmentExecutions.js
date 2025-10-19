// EnvironmentExecutions.jsx
import React, { useEffect, useState } from 'react';
import ExecutionCard from '../components/ExecutionCard';
import { useParams } from 'react-router-dom';
import { authApi } from "../context/axios";

const EnvironmentExecutions = () => {
  const { serviceId, env } = useParams(); // env: 'dev' | 'stage' | 'prod'
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  function formatDate(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setErrMsg("");
      try {
        const { data } = await authApi.get(
          `http://localhost:4000/api/jenkins/${serviceId}/executions`,
          { params: { env, limit: 20, offset: 0 } }
        );

        if (!mounted) return;

        const list = Array.isArray(data?.executions) ? data.executions : [];
        setExecutions(
          list.map((exec) => ({
            id: exec.number,
            message: `빌드 #${exec.number}`,
            result: exec.result,       // "Success" | "Failed" | "Building" | ...
            duration: exec.duration || 0,
            building: !!exec.building,
            timestamp: formatDate(exec.timestamp),
          }))
        );
      } catch (e) {
        console.error(e);
        if (mounted) setErrMsg("실행 이력을 불러오는 중 오류가 발생했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (serviceId && env) load();
    return () => { mounted = false; };
  }, [serviceId, env]);

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">{env.toUpperCase()} 환경 실행 이력</h2>

      {loading ? (
        <div className="text-gray-500">불러오는 중…</div>
      ) : errMsg ? (
        <div className="text-red-600">{errMsg}</div>
      ) : executions.length === 0 ? (
        <div className="text-gray-500">실행 이력이 없습니다.</div>
      ) : (
        <div className="space-y-4">
          {executions.map((exec) => (
            <ExecutionCard
              key={exec.id}
              data={{
                id: exec.id,
                message: exec.message,
                result: exec.result,
                lastDeploy: exec.timestamp || null,
              }}
              serviceId={serviceId}
              env={env}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EnvironmentExecutions;
