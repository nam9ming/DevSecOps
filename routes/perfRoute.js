// routes/perfRoute.js
const express = require("express");
const router = express.Router();
const axios = require("axios");

const { authenticateToken } = require("../auth/auth_middleware");
const attachUserSetting = require("../middleware/attachUserSetting");
const { createApiClient } = require("../auth/axiosClient");

/* ---------------- SonarQube 클라이언트 ---------------- */
function makeSonarClient(userSetting) {
  const baseURL =
    userSetting?.SonarUrl || process.env.SONAR_URL || "http://localhost:9000";
  const token =
    userSetting?.SonarToken || process.env.SONAR_TOKEN || "";

  const sx = axios.create({ baseURL, timeout: 10000 });

  // 토큰 있으면 Basic token: 스킴
  if (token) {
    sx.interceptors.request.use((cfg) => {
      cfg.auth = { username: token, password: "" };
      return cfg;
    });
  }
  return sx;
}

/* ---------------- Jenkins 헬퍼 ---------------- */
async function findStatsPath(jx, job, build) {
  // 1) 우리가 기대하는 고정 경로 먼저 시도
  const fixed = `/job/${encodeURIComponent(job)}/${build}/artifact/jmeter_${build}/html/statistics.json`;
  try {
    const head = await jx.head(fixed, { validateStatus: () => true });
    if (head.status >= 200 && head.status < 400) return fixed;
  } catch (_) { /* ignore */ }

  // 2) 아티팩트 목록 탐색
  const { data } = await jx.get(`/job/${encodeURIComponent(job)}/${build}/api/json`, {
    params: { tree: "artifacts[fileName,relativePath]" },
    validateStatus: () => true,
  });
  const hit = (data.artifacts || []).find((a) => /(^|\/)statistics\.json$/i.test(a.relativePath));
  if (!hit) throw new Error("statistics.json not found in artifacts");
  return `/job/${encodeURIComponent(job)}/${build}/artifact/${hit.relativePath}`;
}

async function resolveBuild(jx, job, build) {
  if (build) return String(build);
  try {
    const { data } = await jx.get(`/job/${encodeURIComponent(job)}/lastSuccessfulBuild/api/json`);
    return String(data.number);
  } catch {
    const { data } = await jx.get(`/job/${encodeURIComponent(job)}/lastCompletedBuild/api/json`);
    return String(data.number);
  }
}

/* ---------------- Jenkins: 서비스(잡) 목록 ---------------- */
router.get("/jenkins/jobs", authenticateToken, attachUserSetting, async (req, res) => {
  try {
    const jx = createApiClient(req.userSetting);
    const { data } = await jx.get("/api/json", {
      params: { tree: "jobs[name,color,lastBuild[number]]" },
    });
    const jobs = (data.jobs || []).map((j) => ({
      name: j.name,
      color: j.color,
      lastBuild: j.lastBuild?.number || null,
    }));
    res.json(jobs);
  } catch (e) {
    console.error("Error fetching Jenkins jobs:", e.message);
    res.status(500).json({ error: "Jenkins jobs 조회 실패", detail: e.message });
  }
});

/* ---------------- Jenkins: 특정 잡 빌드 목록 ---------------- */
router.get("/jenkins/builds", authenticateToken, attachUserSetting, async (req, res) => {
  try {
    const jx = createApiClient(req.userSetting);
    const job = req.query.job;
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 100));
    if (!job) return res.status(400).json({ error: "job 파라미터 필요" });

    const { data } = await jx.get(`/job/${encodeURIComponent(job)}/api/json`, {
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

/* ---------------- Sonar: 빌드별 품질게이트(아카이브 파일) ---------------- */
router.get("/sonar/gate-by-build", authenticateToken, attachUserSetting, async (req, res) => {
  try {
    const jx = createApiClient(req.userSetting);
    const { job, build } = req.query;
    if (!job || !build) return res.status(400).json({ error: "job, build 필요" });
    const path = `/job/${encodeURIComponent(job)}/${build}/artifact/sonar-gate.json`;
    const { data } = await jx.get(path);
    res.json(data);
  } catch (e) {
    // 아티팩트 없으면 200 + UNKNOWN 으로 회신 (프론트가 안전하게 처리)
    res.json({ status: "UNKNOWN", error: "sonar-gate.json 아티팩트 없음", detail: e.message });
  }
});

/* ---------------- JMeter 요약 ---------------- */
router.get("/jmeter/summary", authenticateToken, attachUserSetting, async (req, res) => {
  try {
    const jx = createApiClient(req.userSetting);
    const job = req.query.job;
    if (!job) return res.status(400).json({ error: "job 파라미터 필요" });

    const build = await resolveBuild(jx, job, req.query.build);
    const path  = await findStatsPath(jx, job, build);
    const { data: stats } = await jx.get(path);

    // JMeter 5.6.x 기준 statistics.json Total 키가 존재
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
    // ⬇️ 파일 없을 때도 200 + summary:null 로 리턴해서 차트가 깨지지 않도록
    res.json({ summary: null, error: "JMeter 통계 파일을 찾지 못함", detail: e.message });
  }
});

/* --------- 레거시 호환: /jmeter-summary -> /jmeter/summary --------- */
router.get("/jmeter-summary", authenticateToken, attachUserSetting, async (req, res) => {
  try {
    const jx = createApiClient(req.userSetting);
    const job = req.query.job;
    if (!job) return res.status(400).json({ error: "job 파라미터 필요" });

    const build = await resolveBuild(jx, job, req.query.build);
    const path  = await findStatsPath(jx, job, build);
    const { data: stats } = await jx.get(path);

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
    res.json({ summary: null, error: "JMeter 통계 파일을 찾지 못함", detail: e.message });
  }
});

/* ---------------- Sonar: 핵심 지표 ---------------- */
router.get("/sonar/summary", authenticateToken, attachUserSetting, async (req, res) => {
  try {
    const sonar = makeSonarClient(req.userSetting);
    const projectKey = req.query.projectKey;
    if (!projectKey) return res.status(400).json({ error: "projectKey 필요" });

    const metrics = "bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density";
    const r = await sonar.get("/api/measures/component", {
      params: { component: projectKey, metricKeys: metrics },
      validateStatus: () => true, // 404도 잡아서 ok:false로 내려줌
    });

    // ⬇️ 상태코드를 그대로 전달하지 않고, 항상 200 + ok/data 로 통일
    res.json({
      ok: r.status === 200,
      data: r.status === 200 ? r.data : null,
      status: r.status,
      message: r.status === 200 ? "ok" : "Project not found or no access",
    });
  } catch (e) {
    console.error("[SONAR] summary error:", e.message);
    res.json({
      ok: false,
      data: null,
      status: e.response?.status || 500,
      message: "SonarQube 조회 실패",
      detail: e.response?.data || e.message,
    });
  }
});

/* --------- 레거시 호환: /sonar -> /sonar/summary --------- */
router.get("/sonar", authenticateToken, attachUserSetting, async (req, res) => {
  try {
    const sonar = makeSonarClient(req.userSetting);
    const projectKey = req.query.projectKey;
    if (!projectKey) return res.status(400).json({ error: "projectKey 필요" });

    const metrics = "bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density";
    const r = await sonar.get("/api/measures/component", {
      params: { component: projectKey, metricKeys: metrics },
      validateStatus: () => true,
    });

    res.json({
      ok: r.status === 200,
      data: r.status === 200 ? r.data : null,
      status: r.status,
      message: r.status === 200 ? "ok" : "Project not found or no access",
    });
  } catch (e) {
    res.json({
      ok: false,
      data: null,
      status: e.response?.status || 500,
      message: "SonarQube 조회 실패",
      detail: e.response?.data || e.message,
    });
  }
});

/* ---------------- Sonar: 품질게이트 ---------------- */
router.get("/sonar/quality-gate", authenticateToken, attachUserSetting, async (req, res) => {
  try {
    const sonar = makeSonarClient(req.userSetting);
    const projectKey = req.query.projectKey;
    if (!projectKey) return res.status(400).json({ error: "projectKey 필요" });

    const r = await sonar.get("/api/qualitygates/project_status", {
      params: { projectKey },
      validateStatus: () => true,
    });

    // 품질게이트도 통일된 응답 포맷
    if (r.status === 200 && r.data?.projectStatus) {
      return res.json({
        ok: true,
        status: r.data.projectStatus.status,
        conditions: r.data.projectStatus.conditions,
      });
    }
    res.json({
      ok: false,
      status: "UNKNOWN",
      conditions: [],
      message: "Quality Gate 조회 실패",
    });
  } catch (e) {
    res.json({
      ok: false,
      status: "UNKNOWN",
      conditions: [],
      message: "Quality Gate 조회 실패",
      detail: e.message,
    });
  }
});

/* ---------------- Sonar: Ping ---------------- */
router.get("/sonar/ping", authenticateToken, attachUserSetting, async (req, res) => {
  try {
    const sonar = makeSonarClient(req.userSetting);
    const r = await sonar.get("/api/authentication/validate", { validateStatus: () => true });
    // {valid:true|false} 또는 에러 → 통일
    res.json({
      ok: r.status === 200,
      ...(typeof r.data === "object" ? r.data : { valid: false }),
      status: r.status,
    });
  } catch (e) {
    res.json({ ok: false, valid: false, status: e.response?.status || 500, message: "Ping 실패" });
  }
});

module.exports = router;
