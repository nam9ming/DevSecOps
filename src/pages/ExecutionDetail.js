import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StageDiagram from '../components/StageDiagram';
import axios from 'axios';

// Jenkins REST Proxy URL
const API_BASE = 'http://localhost:4000';

const statusColor = {
  SUCCESS: 'bg-green-50 border-green-300 text-green-600',
  SUCCESSFUL: 'bg-green-50 border-green-300 text-green-600',
  FAILURE: 'bg-red-50 border-red-300 text-red-600',
  FAILED: 'bg-red-50 border-red-300 text-red-600',
  ERROR: 'bg-red-50 border-red-300 text-red-600',
  ABORTED: 'bg-gray-100 border-gray-300 text-gray-600',
  SKIPPED: 'bg-gray-50 border-gray-200 text-gray-400',
  IN_PROGRESS: 'bg-blue-50 border-blue-300 text-blue-600',
  RUNNING: 'bg-blue-50 border-blue-300 text-blue-600',
  DEFAULT: 'bg-gray-50 border-gray-200 text-gray-800',
};

const statusLabel = {
  SUCCESS: 'Success',
  SUCCESSFUL: 'Success',
  FAILURE: 'Error',
  FAILED: 'Error',
  ERROR: 'Error',
  ABORTED: 'Aborted',
  SKIPPED: 'Skipped',
  IN_PROGRESS: 'Running',
  RUNNING: 'Running',
};

const ExecutionDetail = () => {
  const { serviceId, env, execId } = useParams();
  const navigate = useNavigate();

  const [jobName, setJobName] = useState('');
  const [buildInfo, setBuildInfo] = useState(null);

  useEffect(() => {
    setJobName(`${serviceId}`);
  }, [serviceId, env]);

  useEffect(() => {
    if (!jobName || !execId) return;
    axios
      .get(`${API_BASE}/api/jenkins/${jobName}/build/${execId}`)
      .then(res => setBuildInfo(res.data))
      .catch(err => setBuildInfo(null));
  }, [jobName, execId]);

  const handlePipelineClick = () => {
    navigate(`/service/${serviceId}/env/${env}`);
  };

  // Jenkins Job 이름 prettify (chat-service-dev → Chat Service Dev)
  const prettify = (name) =>
    name
      ? name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      : '';


  return (
    <div className="p-6">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-4xl mx-auto mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            실행 상세: <span className="text-blue-600">#{execId}</span>
          </h2>
          <div className="text-sm text-gray-600">
            <span className="mr-4">
              서비스: <span className="text-black">{prettify(serviceId)}</span>
            </span>
            <span>
              환경: <span className="text-black">{env?.toUpperCase()}</span>
            </span>
          </div>
        </div>

        {/* 빌드 정보 동적 표시 */}
        {buildInfo ? (
          <div className="mb-6 text-sm">
            <div>
              결과: <b>{buildInfo.result || '진행 중'}</b>
            </div>
            <div>빌드 시간: {new Date(buildInfo.timestamp).toLocaleString()}</div>
            <div>빌드 소요: {buildInfo.duration / 1000}s</div>
          </div>
        ) : (
          <div className="text-gray-400 mb-6">빌드 정보를 불러오는 중...</div>
        )}

        {/* StageDiagram에 실제 빌드정보도 props로 전달할 수 있음 */}
        <StageDiagram serviceId={serviceId} execId={execId} buildInfo={buildInfo} />

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
