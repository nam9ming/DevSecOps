// src/pages/Security.js
import React, { useEffect, useMemo, useState } from "react";
import { authApi } from "../context/axios";

const JENKINS = process.env.REACT_APP_JENKINS_BASE || "http://localhost:8080";

// className 조합 헬퍼
const cx = (...a) => a.filter(Boolean).join(" ");

// 상태 → 색상 매핑 함수
const tone = (result) => {
    const r = String(result || "").toUpperCase();
    if (r.includes("BLUE") || r === "SUCCESS" || r === "OK") return "green";
    if (r.includes("ANIME") || r === "BUILDING") return "yellow";
    if (r === "FAILURE" || r.startsWith("RED") || r === "ERROR") return "red";
    return "gray";
};

// 색상 지원 Badge 컴포넌트
function Badge({ children, color = "gray" }) {
    const map = {
        gray: "bg-gray-100 text-gray-800",
        green: "bg-green-100 text-green-800",
        red: "bg-red-100 text-red-800",
        yellow: "bg-yellow-100 text-yellow-800",
        blue: "bg-blue-100 text-blue-800",
    };
    return <span className={cx("px-2 py-0.5 rounded text-xs font-medium", map[color] || map.gray)}>{children}</span>;
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
    const params = new URLSearchParams(window.location.search);
    const initialJob = params.get("job") || "";
    const initialBuild = params.get("build") ? Number(params.get("build")) : null;

    const [jobs, setJobs] = useState([]);
    const [q, setQ] = useState("");
    const [err, setErr] = useState("");
    const [info, setInfo] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await authApi.get(`/perf/jenkins/jobs`);
                setJobs(data);
            } catch (e) {
                setErr(e?.response?.data?.error || e.message);
            }
        })();
    }, []);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return jobs;
        return jobs.filter((j) => j.name.toLowerCase().includes(s));
    }, [jobs, q]);

    const [selJob, setSelJob] = useState(initialJob || null);
    const [builds, setBuilds] = useState([]);
    const [selBuild, setSelBuild] = useState(initialBuild);
    const [jm, setJm] = useState(null);

    const pickJob = async (name) => {
        setSelJob(name);
        setSelBuild(null);
        setBuilds([]);
        setJm(null);
        setErr("");
        setInfo("");
        try {
            const { data } = await authApi.get(`/perf/jenkins/builds`, {
                params: { job: name, limit: 30 },
            });
            setBuilds(data);

            if (!initialBuild) {
                setLoading(true);
                try {
                    const r = await authApi.get(`/perf/jmeter/summary`, {
                        params: { job: name },
                    });
                    setSelBuild(r.data.summary?.build ?? null);
                    setJm(r.data.summary || null);
                } catch {
                    // ignore
                } finally {
                    setLoading(false);
                }
            }
        } catch (e) {
            setErr(e?.response?.data?.error || e.message);
        }
    };

    const pickBuild = async (n) => {
        if (!selJob) return;
        setSelBuild(n);
        setLoading(true);
        setErr("");
        setInfo("");
        setJm(null);
        try {
            const { data } = await authApi.get(`/perf/jmeter/summary`, {
                params: { job: selJob, build: n },
            });
            setJm(data.summary || null);
        } catch (e) {
            if (e?.response?.status === 404) {
                try {
                    const fallback = await authApi.get(`/perf/jmeter/summary`, {
                        params: { job: selJob },
                    });
                    const fb = fallback.data.summary?.build ?? null;
                    setSelBuild(fb);
                    setJm(fallback.data.summary || null);
                    setInfo(`지정 빌드 #${n}에 JMeter 통계가 없어 최신 빌드 #${fb}로 표시합니다.`);
                } catch (e2) {
                    setErr(e2?.response?.data?.error || e2.message);
                }
            } else {
                setErr(e?.response?.data?.error || e.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        (async () => {
            if (initialJob) await pickJob(initialJob);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialJob]);

    useEffect(() => {
        (async () => {
            if (initialJob && initialBuild != null) await pickBuild(initialBuild);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialBuild]);

    const jReport = selJob && selBuild ? `${JENKINS}/job/${encodeURIComponent(selJob)}/${selBuild}/artifact/jmeter_${selBuild}/html/index.html` : null;

    return (
        <div className="space-y-6">
            {/* <h1 className="text-2xl font-bold">Security (JMeter Results Only)</h1> */}

            {err ? <div className="text-red-600 text-sm">에러: {err}</div> : null}
            {info ? <div className="text-amber-600 text-sm">{info}</div> : null}

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
                                                <Badge color={tone(b.result || (b.building ? "BUILDING" : "UNKNOWN"))}>{b.result || (b.building ? "BUILDING" : "UNKNOWN")}</Badge>
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

                {/* 3) JMeter 결과 */}
                <div className="lg:col-span-5">
                    <Panel title={selBuild ? `JMeter 결과 - #${selBuild}` : "JMeter 결과"}>
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
                                                <div className="text-lg font-semibold">{typeof jm.errorPct === "number" ? jm.errorPct : "-"}</div>
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

                                        {jReport ? (
                                            <a href={jReport} target="_blank" rel="noreferrer" className="inline-block text-sm text-blue-600 hover:underline">
                                                전체 HTML 리포트 열기
                                            </a>
                                        ) : null}
                                    </>
                                ) : (
                                    <div className="text-sm text-gray-500">JMeter 요약을 불러오지 못했습니다.</div>
                                )}
                            </div>
                        )}
                    </Panel>
                </div>
            </div>
        </div>
    );
}
