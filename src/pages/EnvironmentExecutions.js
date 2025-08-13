import React, { useEffect, useState } from 'react';
import ExecutionCard from '../components/ExecutionCard';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const EnvironmentExecutions = () => {
  const { serviceId, env } = useParams();
  const [executions, setExecutions] = useState([]);

  useEffect(() => {
    // 예시: /api/jenkins/chat-service-dev/executions
    axios
      .get(`http://localhost:4000/api/jenkins/${serviceId}/executions`)
      .then(res => setExecutions(res.data.executions))
      .catch(err => console.error(err));
  }, [serviceId]);

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">{env.toUpperCase()} 환경 실행 이력</h2>
      <div className="space-y-4">
        {executions.length === 0 ? (
          <div className="text-gray-500">실행 이력이 없습니다.</div>
        ) : (
          executions.map(exec => (
            <ExecutionCard
              key={exec.number}
              data={{
                id: exec.number,
                message: `빌드 #${exec.number}`,
                result: exec.result,
                job: exec.duration > 0 ? 'Deployed' : '',
              }}
              serviceId={serviceId}
              env={env}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default EnvironmentExecutions;
