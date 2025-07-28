import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StageDiagram from '../components/StageDiagram';

const ExecutionDetail = () => {
  const { serviceName, env, execId } = useParams();
  const navigate = useNavigate();

  const handlePipelineClick = () => {
    navigate(`/service/${serviceName}/env/${env}`);
  };

  return (
    <div className="p-6">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-4xl mx-auto mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            실행 상세: <span className="text-blue-600">#{execId}</span>
          </h2>
          <div className="text-sm text-gray-600">
            <span className="mr-4">서비스: <span className="text-black">{serviceName}</span></span>
            <span>환경: <span className="text-black">{env}</span></span>
          </div>
        </div>

        <StageDiagram execId={execId} />

        <div className="flex justify-end mt-6 pb-6">
          <button
            onClick={handlePipelineClick}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md shadow-sm"
          >
            Pipeline
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExecutionDetail;
