import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import StageDiagram from '../components/StageDiagram';
import { authApi } from "../context/axios";

const API_BASE = 'http://localhost:4000';

const ExecutionDetail = () => {
  const { serviceId, env, execId } = useParams();

  const [jobName, setJobName] = useState('');
  const [buildInfo, setBuildInfo] = useState(null);

  // 👇 로그 관련 상태
  const [showLog, setShowLog] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState('');
  const [logText, setLogText] = useState('');
  const logBoxRef = useRef(null);

  useEffect(() => {
    setJobName(`${serviceId}`);
  }, [serviceId, env]);

  useEffect(() => {
    if (!jobName || !execId) return;
    authApi
      .get(`${API_BASE}/api/jenkins/${jobName}/build/${execId}`)
      .then(res => setBuildInfo(res.data))
      .catch(() => setBuildInfo(null));
  }, [jobName, execId]);

  // Jenkins Job 이름 prettify (chat-service-dev → Chat Service Dev)
  const prettify = (name) =>
    name ? name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

  // 👇 로그 가져오기
  const fetchLog = async () => {
    if (!jobName || !execId) return;
    setLogLoading(true);
    setLogError('');
    try {
      const res = await authApi.get(
        `${API_BASE}/api/jenkins/${jobName}/build/${execId}/console`,
        { responseType: 'text' } // text로 받기
      );
      setLogText(typeof res.data === 'string' ? res.data : String(res.data || ''));
      // 자동 스크롤 맨 아래
      setTimeout(() => {
        if (logBoxRef.current) {
          logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
        }
      }, 0);
    } catch (e) {
      console.error(e);
      setLogError('로그를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLogLoading(false);
    }
  };

  // 👇 버튼 토글: 처음 펼칠 때만 페치 (필요시 매번 새로고침해도 OK)
  const handleToggleLog = () => {
    const next = !showLog;
    setShowLog(next);
    if (next && !logText && !logLoading) {
      fetchLog();
    }
  };

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
            <div>빌드 소요: {Math.round((buildInfo.duration || 0) / 1000)}s</div>
          </div>
        ) : (
          <div className="text-gray-400 mb-6">빌드 정보를 불러오는 중...</div>
        )}

        {/* StageDiagram */}
        <StageDiagram serviceId={serviceId} execId={execId} buildInfo={buildInfo} />

        {/* 실행 로그 버튼 + 패널 */}
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleLog}
              className="px-3 py-1.5 rounded-md border bg-gray-50 hover:bg-gray-100 text-sm"
            >
              {showLog ? '로그 닫기' : '실행 로그 보기'}
            </button>

            
          </div>

          {showLog && (
            <div className="mt-3">
              {logError ? (
                <div className="text-red-600 text-sm">{logError}</div>
              ) : (
                <div
                  ref={logBoxRef}
                  className="bg-white border border-black text-gray-800 font-mono text-xs rounded-md p-3 h-80 overflow-auto whitespace-pre-wrap"
                >
                {logLoading && !logText ? '불러오는 중…' : (logText || '표시할 로그가 없습니다.')}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ExecutionDetail;
