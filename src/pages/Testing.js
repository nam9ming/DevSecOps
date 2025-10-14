// src/pages/Testing.js
import React, { useEffect, useMemo, useState } from "react";

import { authApi } from "../context/axios";

const API = process.env.REACT_APP_API_BASE || "http://localhost:4000";
const JENKINS = process.env.REACT_APP_JENKINS_BASE || "http://192.168.0.4:8080";

const cx = (...a) => a.filter(Boolean).join(" ");
const tone = (result) => {
    const r = String(result || "").toUpperCase();
    if (r.includes("BLUE") || r === "SUCCESS" || r === "OK") return "green";
    if (r.includes("ANIME") || r === "BUILDING") return "yellow";
    if (r === "FAILURE" || r.startsWith("RED") || r === "ERROR") return "red";
    return "gray";
};

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

// 필요 시 “예외 매핑”만 로컬에 저장해두고(설정 페이지에서 관리하는 식으로)
// 없으면 기본값(job 이름)을 사용
const getSonarKey = (job) => {
    const map = JSON.parse(localStorage.getItem("sonarMap") || "{}"); // { "weird-job": "real-sonar-key" }
    return map[job] || job;
};

function Badge({ children, color = "gray" }) {
    const map = {
        gray: "bg-gray-100 text-gray-800",
        green: "bg-green-100 text-green-800",
        red: "bg-red-100 text-red-800",
        yellow: "bg-yellow-100 text-yellow-800",
        blue: "bg-blue-100 text-blue-800",
    };
    return <span className={cx("px-2 py-0.5 rounded text-xs font-medium", map[color])}>{children}</span>;
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

export default function Testing() {
    // 1) 서비스(잡) 목록
    const [jobs, setJobs] = useState([]);
    const [q, setQ] = useState("");
    const [err, setErr] = useState("");
    useEffect(() => {
        (async () => {
            try {
                const { data } = await authApi.get(`${API}/api/perf/jenkins/jobs`);
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
    const [selJob, setSelJob] = useState(null);
    const [builds, setBuilds] = useState([]);
    const [selBuild, setSelBuild] = useState(null);

    // 3) 결과
    const [jm, setJm] = useState(null); // JMeter summary
    const [gate, setGate] = useState(null); // sonar gate by build
    const [sonar, setSonar] = useState(null); // Sonar metrics
    const [loading, setLoading] = useState(false);

    const pickJob = async (name) => {
        setSelJob(name);
        setSelBuild(null);
        setBuilds([]);
        setJm(null);
        setGate(null);
        setSonar(null);
        setErr("");
        try {
            const { data } = await authApi.get(`${API}/api/perf/jenkins/builds`, {
                params: { job: name, limit: 30 },
            });
            setBuilds(data);
        } catch (e) {
            setErr(e.response?.data?.error || e.message);
        }
    };

    const loadSonar = async (projectKey) => {
        if (!projectKey) return setSonar(null);
        try {
            const sm = await authApi.get(`${API}/api/perf/sonar/summary`, { params: { projectKey } });
            setSonar(parseMeasures(sm.data));
        } catch (e) {
            setSonar(null);
            setErr("Sonar 조회 실패: " + (e.response?.data?.error || e.message));
        }
    };

    const pickBuild = async (n) => {
        setSelBuild(n);
        setLoading(true);
        setErr("");
        setJm(null);
        setGate(null);

        try {
            const [jmres, gateres] = await Promise.all([authApi.get(`${API}/api/perf/jmeter/summary`, { params: { job: selJob, build: n } }), authApi.get(`${API}/api/perf/sonar/gate-by-build`, { params: { job: selJob, build: n } }).catch(() => ({ data: { status: "UNKNOWN" } }))]);
            setJm(jmres.data.summary || null);
            setGate(gateres.data || { status: "UNKNOWN" });

            // ✅ 자동으로 Sonar 지표 로딩 (projectKey = job or 매핑)
            await loadSonar(getSonarKey(selJob));
        } catch (e) {
            setErr(e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    };

    const jReport = selJob && selBuild ? `${JENKINS}/job/${encodeURIComponent(selJob)}/${selBuild}/artifact/jmeter_${selBuild}/html/index.html` : null;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">테스트 결과</h1>
            {err ? <div className="text-red-600 text-sm">에러: {err}</div> : null}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1) 서비스 리스트 */}
                <div className="lg:col-span-3">
                    <Panel title="서비스" right={<input placeholder="검색" value={q} onChange={(e) => setQ(e.target.value)} className="border rounded px-2 py-1 text-sm" />}>
                        <ul className="space-y-1">
                            {filtered.map((j) => (
                                <li key={j.name}>
                                    <button onClick={() => pickJob(j.name)} className={cx("w-full text-left px-3 py-2 rounded hover:bg-gray-50 border", selJob === j.name ? "bg-gray-50 border-gray-300" : "border-transparent")}>
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">{j.name}</span>
                                            <Badge color={tone(j.color)}>{j.color}</Badge>
                                        </div>
                                        {j.lastBuild ? <div className="text-xs text-gray-500 mt-1">last build #{j.lastBuild}</div> : null}
                                    </button>
                                </li>
                            ))}
                            {!filtered.length && <div className="text-sm text-gray-500">서비스 없음</div>}
                        </ul>
                    </Panel>
                </div>

                {/* 2) 빌드 리스트 */}
                <div className="lg:col-span-4">
                    <Panel title={selJob ? `빌드 - ${selJob}` : "빌드"}>
                        {selJob ? (
                            <ul className="space-y-2">
                                {builds.map((b) => (
                                    <li key={b.number}>
                                        <button onClick={() => pickBuild(b.number)} className={cx("w-full text-left px-3 py-2 rounded border hover:bg-gray-50", selBuild === b.number ? "bg-gray-50 border-gray-300" : "border-transparent")}>
                                            <div className="flex items-center justify-between">
                                                <div className="font-medium">#{b.number}</div>
                                                <Badge color={tone(b.result)}>{b.result}</Badge>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {b.timestamp ? new Date(b.timestamp).toLocaleString("ko-KR") : "-"} · {b.duration ? (b.duration / 1000).toFixed(1) : "-"}s{b.building ? " · running" : ""}
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

                {/* 3) 결과 패널 */}
                <div className="lg:col-span-5">
                    <Panel title={selBuild ? `결과 - #${selBuild}` : "결과"} right={gate?.status ? <Badge color={tone(gate.status)}>Quality Gate: {gate.status}</Badge> : null}>
                        {!selBuild && <div className="text-sm text-gray-500">빌드를 선택하세요.</div>}

                        {selBuild && (
                            <div className="space-y-5">
                                {loading && <div className="text-sm">불러오는 중…</div>}

                                {/* SonarQube 상세 지표 (자동 로딩) */}
                                <div className="space-y-3">
                                    <div className="font-semibold">SonarQube</div>
                                    <div className="text-xs text-gray-500">
                                        프로젝트 키: <span className="font-mono">{selJob ? getSonarKey(selJob) : "-"}</span>
                                    </div>

                                    {sonar ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            <div className="p-3 rounded bg-gray-50">
                                                <div className="text-xs text-gray-500">Bugs</div>
                                                <div className="text-lg font-semibold">{sonar.bugs ?? "-"}</div>
                                            </div>
                                            <div className="p-3 rounded bg-gray-50">
                                                <div className="text-xs text-gray-500">Vulnerabilities</div>
                                                <div className="text-lg font-semibold">{sonar.vulns ?? "-"}</div>
                                            </div>
                                            <div className="p-3 rounded bg-gray-50">
                                                <div className="text-xs text-gray-500">Code Smells</div>
                                                <div className="text-lg font-semibold">{sonar.smells ?? "-"}</div>
                                            </div>
                                            <div className="p-3 rounded bg-gray-50">
                                                <div className="text-xs text-gray-500">Coverage</div>
                                                <div className="text-lg font-semibold">{sonar.coverage ? `${Number(sonar.coverage).toFixed(1)}%` : "-"}</div>
                                            </div>
                                            <div className="p-3 rounded bg-gray-50">
                                                <div className="text-xs text-gray-500">Duplications</div>
                                                <div className="text-lg font-semibold">{sonar.dup ? `${Number(sonar.dup).toFixed(1)}%` : "-"}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500">Sonar 지표가 없습니다.</div>
                                    )}

                                    {selJob && (
                                        <a href={`http://localhost:9000/dashboard?id=${encodeURIComponent(getSonarKey(selJob))}`} target="_blank" rel="noreferrer" className="underline text-blue-600 text-sm">
                                            Sonar 대시보드 열기
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </Panel>
                </div>
            </div>
        </div>
    );
}
