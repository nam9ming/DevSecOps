// routes/perfRoute.js
const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../auth/auth_middleware");
const attachUserSetting = require("../middleware/attachUserSetting");

/**
 * JMeter HTML 리포트의 statistics.json 경로를 찾는다.
 * 1) 고정 경로 시도: /job/{job}/{build}/artifact/jmeter_{build}/html/statistics.json
 * 2) 실패 시 아티팩트 목록에서 자동 탐색
 */
async function findStatsPath(jenkinsClient, job, build) {
  const fixed = `/job/${encodeURIComponent(job)}/${build}/artifact/jmeter_${build}/html/statistics.json`;
  try {
    await jenkinsClient.head(fixed);
    return fixed;
  } catch (_) {
    // fallthrough
  }
  const { data } = await jenkinsClient.get(`/job/${encodeURIComponent(job)}/${build}/api/json`, {
    params: { tree: "artifacts[fileName,relativePath]" },
  });
  const hit = (data.artifacts || []).find((a) => /(^|\/)statistics\.json$/i.test(a.relativePath));
  if (!hit) throw new Error("statistics.json not found in artifacts");
  return `/job/${encodeURIComponent(job)}/${build}/artifact/${hit.relativePath}`;
}

/** 마지막 빌드 번호 추론: lastSuccessful → lastCompleted */
async function resolveBuild(jenkinsOrJmeterClient, job, build) {
  if (build) return String(build);
  try {
    const { data } = await jenkinsOrJmeterClient.get(
      `/job/${encodeURIComponent(job)}/lastSuccessfulBuild/api/json`
    );
    return String(data.number);
  } catch {
    const { data } = await jenkinsOrJmeterClient.get(
      `/job/${encodeURIComponent(job)}/lastCompletedBuild/api/json`
    );
    return String(data.number);
  }
}

/* ---------------- Jenkins: 서비스(잡) 목록 ---------------- */
router.get("/jenkins/jobs", authenticateToken, attachUserSetting, async (req, res) => {
  try {
    const { jenkins } = req.clients;
    const { data } = await jenkins.get("/api/json", {
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

/* ---------------- Jenkins: 특정 잡의 빌드 목록 ---------------- */
router.get("/jenkins/builds", authenticateToken, attachUserSetting, async (req, res) => {
  try {
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

/* ---------------- Sonar: 빌드별 품질게이트(아카이브 파일) ---------------- */
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

/* ---------------- [NEW] 최신 배포 시각 ----------------
 * Dashboard가 호출하는 /api/perf/deploy/lastdeploy 에 대응
 * 쿼리: job, env(dev|stage|prod)
 */
router.get("/deploy/lastdeploy", authenticateToken, attachUserSetting, async (req, res) => {
  try {
    const { jenkins } = req.clients;
    const { job, env } = req.query;
    if (!job || !env) return res.status(400).json({ error: "job, env 필요" });

    // 조직별 네이밍 케이스를 몇 가지 시도
    const candidates = [`${job}-${env}`, `${job}_${env}`, `${job}/${env}`, job];

    let lastTimestamp = null;
    let lastBuildNum = null;
    let resolvedJob = null;

    for (const name of candidates) {
      // lastSuccessful → 없으면 lastCompleted
      const s = await jenkins.get(
        `/job/${encodeURIComponent(name)}/lastSuccessfulBuild/api/json`,
        { validateStatus: () => true }
      );
      if (s.status === 200 && s.data?.timestamp) {
        lastTimestamp = s.data.timestamp;
        lastBuildNum = s.data.number;
        resolvedJob = name;
        break;
      }
      const c = await jenkins.get(
        `/job/${encodeURIComponent(name)}/lastCompletedBuild/api/json`,
        { validateStatus: () => true }
      );
      if (c.status === 200 && c.data?.timestamp) {
        lastTimestamp = c.data.timestamp;
        lastBuildNum = c.data.number;
        resolvedJob = name;
        break;
      }
    }

    if (!lastTimestamp) {
      return res.status(404).json({ error: "last deploy not found" });
    }

    res.json({
      job,
      env,
      resolvedJob,
      build: lastBuildNum ?? null,
      lastDeploy: new Date(lastTimestamp).toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: "lastdeploy 조회 실패", detail: e.message });
  }
});

/* ---------------- JMeter 요약 (statistics.json → 필요한 값만) ---------------- */
router.get("/jmeter/summary", authenticateToken, attachUserSetting, async (req, res) => {
  try {
    const { jenkins: jmx } = req.clients; // JMeter HTML 리포트는 Jenkins 아티팩트로 가정
    const job = req.query.job;
    if (!job) return res.status(400).json({ error: "job 파라미터 필요" });

    const build = await resolveBuild(jmx, job, req.query.build);
    const statsPath = await findStatsPath(jmx, job, build);
    const { data: stats } = await jmx.get(statsPath);

    // 대/소문자 다양성 대응
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
    // 404 대신 200 + summary:null 로 내려 콘솔 에러를 줄인다.
    res.json({ summary: null, error: "JMeter 통계 파일을 찾지 못함", detail: e.message });
  }
});

/* ---------------- Sonar 핵심 지표 ---------------- */
router.get("/sonar/summary", authenticateToken, attachUserSetting, async (req, res) => {
  try {
    const { sonar } = req.clients;
    const projectKey = req.query.projectKey;
    if (!projectKey) return res.status(400).json({ error: "projectKey 필요" });

    const metrics = "bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density";
    const r = await sonar.get("/api/measures/component", {
      params: { component: projectKey, metricKeys: metrics },
    });
    res.json(r.data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json({
      error: "SonarQube 조회 실패",
      status,
      detail: e.response?.data || e.message,
    });
  }
});

/* ---------------- Sonar 품질게이트 상태 ---------------- */
router.get("/sonar/quality-gate", authenticateToken, attachUserSetting, async (req, res) => {
  try {
    const { sonar } = req.clients;
    const projectKey = req.query.projectKey;
    if (!projectKey) return res.status(400).json({ error: "projectKey 필요" });

    const { data } = await sonar.get("/api/qualitygates/project_status", {
      params: { projectKey },
    });
    res.json({
      status: data.projectStatus.status,
      conditions: data.projectStatus.conditions,
    });
  } catch (e) {
    res.status(500).json({ error: "Quality Gate 조회 실패", detail: e.message });
  }
});

/* ---------------- Sonar Ping (토큰/세션 유효성 확인) ---------------- */
router.get("/sonar/ping", authenticateToken, attachUserSetting, async (req, res) => {
  try {
    const { sonar } = req.clients;
    const r = await sonar.get("/api/authentication/validate", { validateStatus: () => true });
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
