// src/pages/Security.js
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_BASE || 'http://localhost:4000';
const JENKINS = process.env.REACT_APP_JENKINS_BASE || 'http://localhost:8080';

const cx = (...a) => a.filter(Boolean).join(' ');

function Badge({ children }) {
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
      {children}
    </span>
  );
}

function Panel({ title, children, right }) {
  return (
    <div className="bg-white border rounded-xl shadow-sm h-[70vh] flex flex-col">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {right}
      </div>
      <div className="p-3 overflow-auto">{children}</div>
    </div>
  );
}

export default function Security() {
  // URL 파라미터 (자동 로딩용)
  const params = new URLSearchParams(window.location.search);
  const initialJob = params.get('job') || '';
  const initialBuild = params.get('build') ? Number(params.get('build')) : null;

  // 1) 서비스(잡) 목록
  const [jobs, setJobs] = useState([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/api/perf/jenkins/jobs`);
        setJobs(data);
      } catch (e) {
        setErr(e.response?.data?.error || e.message);
      }
    })();
  }, []);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return jobs;
    return jobs.filter((j) => j.name.toLowerCase().includes(s));
  }, [jobs, q]);

  // 2) 선택된 서비스/빌드
  const [selJob, setSelJob] = useState(initialJob || null);
  const [builds, setBuilds] = useState([]);
  const [selBuild, setSelBuild] = useState(initialBuild);

  // 3) JMeter 결과만
  const [jm, setJm] = useState(null);

  const pickJob = async (name) => {
    setSelJob(name);
    setSelBuild(null);
    setBuilds([]);
    setJm(null);
    setErr('');
    setInfo('');
    try {
      const { data } = await axios.get(`${API}/api/perf/jenkins/builds`, {
        params: { job: name, limit: 30 },
      });
      setBuilds(data);

      // 최신 성공/완료 빌드 자동 로드 (URL에 build가 없을 때)
      if (!initialBuild) {
        setLoading(true);
        try {
          const r = await axios.get(`${API}/api/perf/jmeter/summary`, { params: { job: name } });
          setSelBuild(r.data.summary?.build ?? null);
          setJm(r.data.summary || null);
        } catch (e) {
          // 최신 빌드에도 요약이 없을 수 있음 → 무시하고 사용자 선택 대기
        } finally {
          setLoading(false);
        }
      }
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  };

  const pickBuild = async (n) => {
    if (!selJob) return;
    setSelBuild(n);
    setLoading(true);
    setErr('');
    setInfo('');
    setJm(null);
    try {
      // 1차: 지정 빌드로 시도
      const { data } = await axios.get(`${API}/api/perf/jmeter/summary`, {
        params: { job: selJob, build: n },
      });
      setJm(data.summary || null);
    } catch (e) {
      // 404면 해당 빌드에 아티팩트 없음 → 최신 성공/완료 빌드로 재시도
      if (e?.response?.status === 404) {
        try {
          const fallback = await axios.get(`${API}/api/perf/jmeter/summary`, { params: { job: selJob } });
          const fb = fallback.data.summary?.build ?? null;
          setSelBuild(fb);
          setJm(fallback.data.summary || null);
          setInfo(`지정 빌드 #${n}에 JMeter 통계가 없어 최신 빌드 #${fb}로 표시합니다.`);
        } catch (e2) {
          setErr(e2.response?.data?.error || e2.message);
        }
      } else {
        setErr(e.response?.data?.error || e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // URL에 job/build가 있으면 자동 로딩
  useEffect(() => {
    (async () => {
      if (initialJob) {
        await pickJob(initialJob);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJob]);

  useEffect(() => {
    (async () => {
      if (initialJob && initialBuild != null) {
        await pickBuild(initialBuild);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBuild]);

  const jReport =
    selJob && selBuild
      ? `${JENKINS}/job/${encodeURIComponent(selJob)}/${selBuild}/artifact/jmeter_${selBuild}/html/index.html`
      : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Security (JMeter Results Only)</h1>

      {err ? <div className="text-red-600 text-sm">에러: {err}</div> : null}
      {info ? <div className="text-amber-600 text-sm">{info}</div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1) 서비스 리스트 */}
        <div className="lg:col-span-3">
          <Panel
            title="서비스"
            right={
              <input
                placeholder="검색"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            }
          >
            <ul className="space-y-1">
              {filtered.map((j) => (
                <li key={j.name}>
                  <button
                    onClick={() => pickJob(j.name)}
                    className={cx(
                      'w-full text-left px-3 py-2 rounded hover:bg-gray-50 border',
                      selJob === j.name ? 'bg-gray-50 border-gray-300' : 'border-transparent'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{j.name}</span>
                      <Badge>{j.color}</Badge>
                    </div>
                    {j.lastBuild ? (
                      <div className="text-xs text-gray-500 mt-1">last build #{j.lastBuild}</div>
                    ) : null}
                  </button>
                </li>
              ))}
              {!filtered.length && <div className="text-sm text-gray-500">서비스 없음</div>}
            </ul>
          </Panel>
        </div>

        {/* 2) 빌드 리스트 */}
        <div className="lg:col-span-4">
          <Panel title={selJob ? `빌드 - ${selJob}` : '빌드'}>
            {selJob ? (
              <ul className="space-y-2">
                {builds.map((b) => (
                  <li key={b.number}>
                    <button
                      onClick={() => pickBuild(b.number)}
                      className={cx(
                        'w-full text-left px-3 py-2 rounded border hover:bg-gray-50',
                        selBuild === b.number ? 'bg-gray-50 border-gray-300' : 'border-transparent'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">#{b.number}</div>
                        <Badge>{b.result || (b.building ? 'BUILDING' : 'UNKNOWN')}</Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {b.timestamp ? new Date(b.timestamp).toLocaleString('ko-KR') : '-'} ·{' '}
                        {b.duration ? (b.duration / 1000).toFixed(1) : '-'}s{b.building ? ' · running' : ''}
                      </div>
                    </button>
                  </li>
                ))}
                {!builds.length && <div className="text-sm text-gray-500">빌드를 선택하려면 서비스를 먼저 클릭</div>}
              </ul>
            ) : (
              <div className="text-sm text-gray-500">서비스를 먼저 선택하세요.</div>
            )}
          </Panel>
        </div>

        {/* 3) JMeter 결과만 */}
        <div className="lg:col-span-5">
          <Panel title={selBuild ? `JMeter 결과 - #${selBuild}` : 'JMeter 결과'}>
            {!selBuild && <div className="text-sm text-gray-500">빌드를 선택하세요.</div>}
            {selBuild && (
              <div className="space-y-4">
                {loading && <div className="text-sm">불러오는 중…</div>}
                {jm ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded bg-gray-50">
                        <div className="text-xs text-gray-500">Samples</div>
                        <div className="text-lg font-semibold">{jm.samples}</div>
                      </div>
                      <div className="p-3 rounded bg-gray-50">
                        <div className="text-xs text-gray-500">Error %</div>
                        <div className="text-lg font-semibold">
                          {typeof jm.errorPct === 'number' ? jm.errorPct : '-'}
                        </div>
                      </div>
                      <div className="p-3 rounded bg-gray-50">
                        <div className="text-xs text-gray-500">Avg (ms)</div>
                        <div className="text-lg font-semibold">{jm.avgMs}</div>
                      </div>
                      <div className="p-3 rounded bg-gray-50">
                        <div className="text-xs text-gray-500">P90 (ms)</div>
                        <div className="text-lg font-semibold">{jm.p90Ms}</div>
                      </div>
                      <div className="p-3 rounded bg-gray-50">
                        <div className="text-xs text-gray-500">Throughput</div>
                        <div className="text-lg font-semibold">{jm.throughput}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-2">
                      {jReport && (
                        <a
                          href={jReport}
                          target="_blank"
                          rel="noreferrer"
                          className="underline text-blue-600 text-sm"
                        >
                          Jenkins HTML 리포트 열기
                        </a>
                      )}
                      {selJob && selBuild && (
                        <a
                          href={`${JENKINS}/job/${encodeURIComponent(selJob)}/${selBuild}/artifact/jmeter-summary.json`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline text-blue-600 text-sm"
                        >
                          jmeter-summary.json
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  !loading && <div className="text-sm text-gray-500">JMeter 요약이 없습니다.</div>
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
