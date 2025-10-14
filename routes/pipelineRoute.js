// routes/pipelineRoute.js
const express = require("express");
const router = express.Router();

const { AUTH } = require("../config/jenkins");

// axios instance

const { authenticateToken } = require("../auth/auth_middleware");
const attachUserSetting = require("../middleware/attachUserSetting");
const { createApiClient } = require("../auth/axiosClient");

// color → status 매핑 (프런트 뱃지 표시용)
const mapStatus = (color = "") => {
    const c = String(color).toLowerCase();
    if (c.includes("anime")) return "Building";
    if (c.startsWith("blue")) return "Success";
    if (c.startsWith("red")) return "Failed";
    if (c.startsWith("yellow")) return "Unstable";
    if (c.startsWith("aborted")) return "Aborted";
    if (c.startsWith("disabled") || c.startsWith("grey")) return "Disabled";
    if (c.startsWith("notbuilt") || c === "notbuilt") return "NotBuilt";
    return "Pending";
};

// env 토큰 추출(-dev/-stage/-prod)
const pickEnv = (name) => {
    const m = name.match(/-(dev|stage|prod)$/i);
    return m ? m[1].toLowerCase().replace("stg", "stage") : null;
};

// CSRF crumb (미사용 환경 대비)
const getCrumb = async () => {
    try {
        const { data } = await jenkins.get("/crumbIssuer/api/json");
        return { [data.crumbRequestField]: data.crumb };
    } catch {
        return {};
    }
};

/** ---------- 신규/추천 라우트 ---------- **/

// Job 목록 요약(서비스 단위, env별 상태)
router.get("/jobcatalog", authenticateToken, attachUserSetting, async (req, res) => {
    try {
        const { jenkins } = req.clients;

        const { data } = await jenkins.get("/api/json", { params: { tree: "jobs[name,color]" } });
        const serviceMap = {};
        for (const j of data.jobs ?? []) {
            const env = pickEnv(j.name);
            if (!env) continue;
            const service = j.name.replace(/-(dev|stage|prod)$/i, "");
            if (!serviceMap[service]) {
                serviceMap[service] = {
                    name: service.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                    statuses: {},
                };
            }
            serviceMap[service].statuses[env] = mapStatus(j.color);
        }
        res.json(Object.values(serviceMap));
    } catch (err) {
        console.error("💥 jobcatalog 실패:", err.message);
        res.status(500).json({ error: "Jenkins 목록 조회 실패" });
    }
});

// 특정 잡의 실행 이력
router.get("/:jobName/executions", authenticateToken, attachUserSetting, async (req, res) => {
    try {
        const { jenkins } = req.clients;
        const { jobName } = req.params;
        const { data } = await jenkins.get(`/job/${encodeURIComponent(jobName)}/api/json`, {
            params: { tree: "builds[number,result,timestamp,duration]" },
        });
        res.json({ executions: data.builds || [] });
    } catch (err) {
        console.error("🔴 executions 실패:", err.message);
        res.status(500).json({ error: "실행 이력 조회 실패" });
    }
});

// 특정 실행 상세 + 파이프라인(stage) 정보
router.get("/:jobName/build/:execId", authenticateToken, attachUserSetting, async (req, res) => {
    try {
        const { jenkins } = req.clients;
        const { jobName, execId } = req.params;
        const [buildRes, wfapiRes] = await Promise.all([jenkins.get(`/job/${encodeURIComponent(jobName)}/${execId}/api/json`), jenkins.get(`/job/${encodeURIComponent(jobName)}/${execId}/wfapi/describe`)]);
        const buildInfo = buildRes.data || {};
        const stageInfo = wfapiRes.data || {};
        res.json({
            ...buildInfo,
            stages: stageInfo.stages || [],
            pipelineStatus: stageInfo.status || buildInfo.result,
        });
    } catch (err) {
        console.error("🔴 build 상세 실패:", err.message);
        res.status(500).json({ error: "빌드 상세 조회 실패" });
    }
});

// config.xml 읽기
router.get("/config", authenticateToken, attachUserSetting, async (req, res) => {
    try {
        const { jenkins } = req.clients;

        console.log(req.query);
        console.log(AUTH);
        const jobName = req.query.jobName;
        if (!jobName) return res.status(400).send("job 파라미터 필요");
        const xml = await jenkins.get(`/job/${encodeURIComponent(jobName)}/config.xml`, {
            headers: { Accept: "application/xml" },
        });
        res.send(xml.data);
    } catch (err) {
        console.log(req.body);
        res.status(500).send("Jenkins config 조회 실패: " + err.message);
    }
});

// config.xml 저장
router.post("/config", authenticateToken, attachUserSetting, async (req, res) => {
    try {
        const { jenkins } = req.clients;

        console.log(req.body);
        const jobName = req.query.job;
        console.log(req.body);
        if (!jobName) return res.status(400).send("job 파라미터 필요");

        const crumb = await getCrumb();
        await jenkins.get(`/job/${encodeURIComponent(jobName)}/config.xml`, req.body, {
            headers: { "Content-Type": "application/xml; charset=utf-8", ...crumb },
        });
        res.send("Jenkins config 저장 성공");
    } catch (err) {
        res.status(500).send("Jenkins config 저장 실패: " + err.message);
    }
});

/** ---------- 레거시 호환 라우트(기존 프런트 유지용) ---------- **/

// 기존: GET /api/jenkins/services  (간단 목록)
router.get("/services", authenticateToken, attachUserSetting, async (req, res) => {
    try {
        // console.log("🔵 /services 실행");
        const jx = createApiClient(req.userSetting);
        // console.log(req.userSetting);
        const { data } = await jx.get("/api/json", { params: { tree: "jobs[name,color]" } });
        const services = (data.jobs || []).map((j) => ({ name: j.name, status: j.color }));
        res.json({ services });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
