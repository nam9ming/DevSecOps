const express = require("express");
const router = express.Router();
const axios = require("axios");
const JenkinsConfig = require("../config/jenkins");
const { JENKINS_URL, AUTH } = JenkinsConfig;

const jx = axios.create({
  baseURL: JENKINS_URL,
  auth: AUTH,
  timeout: 10000,
});

// color → status 매핑
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

// env 토큰 판별
const pickEnv = (name) => {
  const m = name.match(/-(dev|stage|prod)$/i);
  return m ? m[1].toLowerCase().replace("stg", "stage") : null;
};

// /jobcatalog: 목록 한 번에(color 포함) → 빠르고 가벼움
router.get("/jobcatalog", async (req, res) => {
  try {
    // 필요한 필드만
    const { data } = await jx.get("/api/json", {
      params: { tree: "jobs[name,color]" },
    });

    const serviceMap = {};
    for (const j of data.jobs ?? []) {
      const env = pickEnv(j.name);
      if (!env) continue;

      // 서비스명은 env 토큰 제거
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
    console.error("💥 Jenkins 연동 오류:", err.message);
    res.status(500).json({ error: "Jenkins에서 Job 정보를 가져오지 못했습니다." });
  }
});

// CSRF crumb 얻기
const getCrumb = async () => {
  try {
    const { data } = await jx.get("/crumbIssuer/api/json");
    return { [data.crumbRequestField]: data.crumb };
  } catch {
    // crumb 미사용 환경일 수 있으니
    return {};
  }
};

router.post("/deployments", async (req, res) => {
  try {
    const { jobName, params } = req.body;
    if (!jobName) return res.status(400).json({ error: "jobName이 필요합니다." });

    const crumb = await getCrumb();
    const isParamJob = params && Object.keys(params).length > 0;
    const path = isParamJob ? `/job/${encodeURIComponent(jobName)}/buildWithParameters`
                            : `/job/${encodeURIComponent(jobName)}/build`;

    const resp = await jx.post(path, null, { params: params || {}, headers: { ...crumb } });

    // Jenkins는 201/302로 queue item Location 제공
    const queueUrl = resp.headers?.location || null;
    res.status(200).json({ message: "빌드 요청됨", jobName, queueUrl });
  } catch (err) {
    console.error("❌ Jenkins 배포 요청 실패:", err.message);
    res.status(500).json({ error: "배포 요청에 실패했습니다." });
  }
});

router.get("/lastdeploy", async (req, res) => {
  try {
    const jobName = req.query.service;
    const kind = (req.query.kind || "lastCompletedBuild").toString(); // or lastSuccessfulBuild

    const { data } = await jx.get(`/job/${encodeURIComponent(jobName)}/${kind}/api/json`);
    if (!data?.timestamp) return res.json({ lastDeploy: null });

    const date = new Date(data.timestamp);
    const formatted = date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    res.json({ lastDeploy: formatted, buildNumber: data.number, result: data.result || 'UNKNOWN'});
  } catch (err) {
    // 빌드 전 404 대비
    if (err.response?.status === 404) return res.json({ lastDeploy: null });
    console.error("🔴 배포 시간 불러오기 실패:", err.message);
    res.status(500).json({ error: "배포 시간 조회 실패" });
  }
});

module.exports = router;
