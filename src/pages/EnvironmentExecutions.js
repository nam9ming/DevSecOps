import React from 'react';
import ExecutionCard from '../components/ExecutionCard';
import { useParams } from 'react-router-dom';

const EnvironmentExecutions = () => {
  const { serviceName, env } = useParams();

  const mockExecutions = [
    { id: 1, message: 'Update TEST1234-pipelines.yml for Jenkins', result: 'Success', job: 'Deployed' },
    { id: 2, message: 'Update TEST1234-pipelines.yml for Jenkins', result: 'Success', job: 'DeployWeb' },
    { id: 3, message: 'Update TEST1234-pipelines.yml for Jenkins', result: 'Failed', job: 'Deploy' },
  ];

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">{env.toUpperCase()} 환경 실행 이력</h2>
      <div className="space-y-4">
        {mockExecutions.map(exec => (
          <ExecutionCard key={exec.id} data={exec} serviceName={serviceName} env={env} />
        ))}
      </div>
    </div>
  );
};

export default EnvironmentExecutions;
