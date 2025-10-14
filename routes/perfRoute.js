// routes/perfRoute.js
const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../auth/auth_middleware");
const attachUserSetting = require("../middleware/attachUserSetting");

// const SONAR_URL = process.env.SONAR_URL || "http://localhost:9000";
// const SONAR_TOKEN = process.env.SONAR_TOKEN || ""; // 비워두면 인증 안 붙임

// ✅ 기본 인스턴스
// const sonar = axios.create({
//     baseURL: SONAR_URL,
//     timeout: 10000,
// });

// // ✅ 토큰이 있을 때만 Basic 인증 붙이기
// if (SONAR_TOKEN) {
//     sonar.interceptors.request.use((cfg) => {
//         cfg.auth = { username: SONAR_TOKEN, password: "" }; // token:
//         return cfg;
//     });
// }

// 파일 상단 근처에 추가
async function findStatsPath(job, build) {
    // 1) 먼저 우리가 기대하는 고정 경로 시도
    const fixed = `/job/${encodeURIComponent(job)}/${build}/artifact/jmeter_${build}/html/statistics.json`;
    try {
        await jenkins.head(fixed);
        return fixed;
    } catch (_) {
        /* fallthrough */
    }

    // 2) 아티팩트 목록에서 자동 탐색
    const { data } = await jenkins.get(`/job/${encodeURIComponent(job)}/${build}/api/json`, {
        params: { tree: "artifacts[fileName,relativePath]" },
    });
    const hit = (data.artifacts || []).find((a) => /(^|\/)statistics\.json$/i.test(a.relativePath));
    if (!hit) throw new Error("statistics.json not found in artifacts");
    return `/job/${encodeURIComponent(job)}/${build}/artifact/${hit.relativePath}`;
}

// 마지막 빌드 번호 얻기
async function resolveBuild(job, build) {
    if (build) return String(build);
    try {
        const { data } = await jmeter.get(`/job/${encodeURIComponent(job)}/lastSuccessfulBuild/api/json`);
        console.log("Last successful build:", data.number);
        return String(data.number);
    } catch {
        const { data } = await jmeter.get(`/job/${encodeURIComponent(job)}/lastCompletedBuild/api/json`);
        return String(data.number);
    }
}

// --- Jenkins: 서비스(잡) 목록 ---
router.get("/jenkins/jobs", authenticateToken, attachUserSetting, async (req, res) => {
    try {
        const { jenkins } = req.clients;
        // console.log("Fetching Jenkins jobs from11", jx.defaults.baseURL);
        const { data } = await jenkins.get("/api/json", { params: { tree: "jobs[name,color,lastBuild[number]]" } });

        const jobs = (data.jobs || []).map((j) => ({
            name: j.name,
            color: j.color, // blue/blue_anime/red/…
            lastBuild: j.lastBuild?.number || null,
        }));
        // console.log("Jenkins jobs:", jobs.length);
        res.json(jobs);
    } catch (e) {
        console.error("Error fetching Jenkins jobs:", e.message);
        res.status(500).json({ error: "Jenkins jobs 조회 실패", detail: e.message });
    }
});

// --- Jenkins: 특정 서비스의 빌드 목록 ---
router.get("/jenkins/builds", authenticateToken, attachUserSetting, async (req, res) => {
    try {
        console.log("🔵 /jenkins/builds 실행", req.query);
        const { jenkins } = req.clients;
        const job = req.query.job;
        const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 100));
        if (!job) return res.status(400).json({ error: "job 파라미터 필요" });

        const { data } = await jenkins.get(`/job/${encodeURIComponent(job)}/api/json`, {
            params: { tree: `builds[number,result,timestamp,duration,building]{0,${limit}}` },
        });
        const builds = (data.builds || []).map((b) => ({
            number: b.number,
            result: b.result || (b.building ? "BUILDING" : "UNKNOWN"),
            timestamp: b.timestamp,
            duration: b.duration,
            building: !!b.building,
        }));
        res.json(builds);
    } catch (e) {
        res.status(500).json({ error: "Jenkins builds 조회 실패", detail: e.message });
    }
});

// --- Sonar: 빌드별 품질게이트(파이프라인에서 아카이브한 파일 사용) ---
router.get("/sonar/gate-by-build", authenticateToken, attachUserSetting, async (req, res) => {
    try {
        const { sonar } = req.clients;
        const { job, build } = req.query;
        if (!job || !build) return res.status(400).json({ error: "job, build 필요" });
        const path = `/job/${encodeURIComponent(job)}/${build}/artifact/sonar-gate.json`;
        const { data } = await sonar.get(path);
        res.json(data); // { status: 'OK' | 'ERROR' ... }
    } catch (e) {
        res.status(404).json({ error: "sonar-gate.json 아티팩트 없음", detail: e.message });
    }
});

/** JMeter 요약 (statistics.json → 필요한 값만) */
router.get("/jmeter/summary", authenticateToken, attachUserSetting, async (req, res) => {
    try {
        const { jmeter } = req.clients;

        const job = req.query.job;
        if (!job) return res.status(400).json({ error: "job 파라미터 필요" });

        const build = await resolveBuild(job, req.query.build);
        const path = `/job/${encodeURIComponent(job)}/${build}/artifact/jmeter_${build}/html/statistics.json`;
        const { data: stats } = await jmeter.get(path);

        // JMeter 5.6.x HTML 리포트 statistics.json에 'Total' 키가 존재 (환경에 따라 대소문자 차이 대비)
        const total = stats.Total || stats.total || stats.ALL || stats.all || stats;
        const summary = {
            build: Number(build),
            samples: total.sampleCount,
            errorPct: total.errorPercentage,
            avgMs: total.meanResTime,
            p90Ms: total.p90,
            throughput: total.throughput,
        };
        res.json({ summary, raw: stats });
    } catch (e) {
        res.status(404).json({ error: "JMeter 통계 파일을 찾지 못함", detail: e.message });
    }
});

/** Sonar 핵심 지표 */
router.get("/sonar/summary", authenticateToken, attachUserSetting, async (req, res) => {
    try {
        console.log("🔵 /sonar/summary 실행", req.query);
        const { sonar } = req.clients;

        const projectKey = req.query.projectKey;
        const metrics = "bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density";
        const r = await sonar.get("/api/measures/component", { params: { component: projectKey, metricKeys: metrics } });
        res.json(r.data);
    } catch (e) {
        console.log("[SONAR]", e.response?.status, e.response?.data);
        res.status(e.response?.status || 500).json({ error: "SonarQube 조회 실패", status: e.response?.status, detail: e.response?.data || e.message });
    }
});

/** Sonar 품질게이트 상태 (웹훅 없어도 바로 조회) */
router.get("/sonar/quality-gate", authenticateToken, attachUserSetting, async (req, res) => {
    try {
        const { sonar } = req.clients;
        const projectKey = req.query.projectKey;
        if (!projectKey) return res.status(400).json({ error: "projectKey 필요" });
        const { data } = await sonar.get("/api/qualitygates/project_status", {
            params: { projectKey },
        });
        res.json({ status: data.projectStatus.status, conditions: data.projectStatus.conditions });
    } catch (e) {
        res.status(500).json({ error: "Quality Gate 조회 실패", detail: e.message });
    }
});

/**ping 라우트 */
router.get("/sonar/ping", authenticateToken, attachUserSetting, async (req, res) => {
    try {
        const { sonar } = req.clients;
        const { data } = await sonar.get("/api/authentication/validate"); // {valid:true} or {valid:false}
        res.json(data);
    } catch (e) {
        res.status(e.response?.status || 500).json({ error: "Ping 실패", detail: e.response?.data || e.message });
    }
});

module.exports = router;
