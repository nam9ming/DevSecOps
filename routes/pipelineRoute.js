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
    const job = (req.params.jobName || "").toString();
    const env = (req.query.env || "").toString().toLowerCase(); // dev | stage | prod
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
    const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

    if (!job) return res.status(400).json({ error: "job 파라미터가 필요합니다." });
    if (!env) return res.status(400).json({ error: "env 쿼리 파라미터가 필요합니다.(dev|stage|prod)" });

    // Jenkins에서 빌드 목록을 가져올 때 필요한 필드만 받도록 tree 압축
    const { data } = await jenkins.get(`/job/${encodeURIComponent(job)}/api/json`, {
      params: {
        tree: "builds[number,result,building,timestamp,duration,fullDisplayName,actions[parameters[name,value]]]",
      },
    });
    
    const builds = Array.isArray(data?.builds) ? data.builds : [];

    // ENV 파라미터로 필터링
    const filtered = builds.filter((b) => {
      const actions = Array.isArray(b.actions) ? b.actions : [];
      const params = actions.flatMap((a) => a?.parameters || []);
      const p = params.find((p) => p?.name === "ENV");
      return p && String(p.value).toLowerCase() === env;
    });

    // 최신순 정렬(번호 내림차순) → 페이징
    filtered.sort((a, b) => b.number - a.number);
    const sliced = filtered.slice(offset, offset + limit);

    // 결과 매핑
    const mapResult = (r, building, inQueue) => {
        if (inQueue) return "Queued";
        if (building) return "Building";
        const R = String(r || "").toUpperCase();
        if (R === "SUCCESS")   return "Success";
        if (R === "FAILURE")   return "Failed";
        if (R === "UNSTABLE")  return "Unstable";
        if (R === "ABORTED")   return "Aborted";
        if (R === "NOT_BUILT") return "NotBuilt"; // 컴파일 실패/미빌드 등
        if (R === "UNKNOWN" || R === "") return "Unknown";
        return "Pending";
    };

    const executions = sliced.map((b) => ({
      number: b.number,
      result: mapResult(b.result, b.building),
      building: !!b.building,
      timestamp: b.timestamp || null,
      duration: b.duration || 0,
      fullDisplayName: b.fullDisplayName || `#${b.number}`,
    }));

    return res.json({
      job,
      env,
      count: filtered.length,
      offset,
      limit,
      executions,
    });
  } catch (err) {
    if (err.response?.status === 404) {
      return res.json({ job: req.params.job, env: req.query.env, count: 0, executions: [] });
    }
    console.error("🔴 executions 조회 실패:", err.message);
    return res.status(500).json({ error: "실행 이력 조회 실패" });
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

router.get("/:jobName/build/:execId/console", authenticateToken, attachUserSetting, async (req, res) => {
  try {
    const { jenkins } = req.clients;
    const { jobName, execId } = req.params;

    // 전체 로그: /consoleText
    const { data } = await jenkins.get(`/job/${encodeURIComponent(jobName)}/${execId}/consoleText`, {
      responseType: "text",
      headers: { Accept: "text/plain" },
      // timeout: 20000, // 필요시
    });

    res.type("text/plain").send(data || "");
  } catch (err) {
    console.error("🔴 consoleText 조회 실패:", err.message);
    res.status(500).json({ error: "콘솔 로그 조회 실패" });
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
        const jobName = req.query.jobName;
        console.log(req.body);
        if (!jobName) return res.status(400).send("job 파라미터 필요");

        const crumb = await getCrumb();
        await jenkins.post(`/job/${encodeURIComponent(jobName)}/config.xml`, req.body, {
            headers: { "Content-Type": "application/xml; charset=utf-8", ...crumb },
        });
        res.send("Jenkins config 저장 성공");
    } catch (err) {
        res.status(500).send("Jenkins config 저장 실패: " + err.message);
    }
});

module.exports = router;
