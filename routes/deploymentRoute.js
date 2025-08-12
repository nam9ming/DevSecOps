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

const mapBuildStatus = (b = {}) => {
  if (b.building) return "Building";
  const r = String(b.result || "").toUpperCase();
  if (r === "SUCCESS") return "Success";
  if (r === "FAILURE") return "Failed";
  if (r === "UNSTABLE") return "Unstable";
  if (r === "ABORTED") return "Aborted";
  return "Pending";
};

router.get("/jobcatalog", async (req, res) => {
  try {
    const { data } = await jx.get("/api/json", {
      params: { tree: "jobs[name,color]" },
    });

    const serviceMap = {};
    const envs = ["dev", "stage", "prod"];

    // 잡별 상세 조회로 ENV 파라미터별 최신 상태 계산
    await Promise.all(
      (data.jobs ?? []).map(async (j) => {
        const service = j.name;

        if (!serviceMap[service]) {
          serviceMap[service] = {
            name: service
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase()),
            statuses: {},
          };
        }

        // 서비스의 dev/stage/prod 네임스페이스별 상태 조회
        try {
          const detail = await jx.get(`/job/${encodeURIComponent(service)}/api/json`, {
            params: {
              tree:
                "builds[number,result,building,timestamp,actions[parameters[name,value]]]",
            },
          });

          const builds = detail.data?.builds || [];
          const sts = {};

          for (const env of envs) {
            const filtered = builds
              .filter((b) => {
                const params = (b.actions || []).flatMap((a) => a.parameters || []);
                const p = params.find((p) => p && p.name === "ENV");
                return p && String(p.value).toLowerCase() === env;
              })
              .sort((a, b) => b.number - a.number);

            sts[env] = filtered.length ? mapBuildStatus(filtered[0]) : "Pending";
          }

          serviceMap[service].statuses = sts;
        } catch (_) {
          // 상세 조회 실패 시 color 기반 동일 상태로 폴백
          const st = mapStatus(j.color);
          serviceMap[service].statuses = {
            dev: st,
            stage: st,
            prod: st,
          };
        }
      })
    );

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

    const queueUrl = resp.headers?.location || null;
    res.status(200).json({ message: "빌드 요청됨", jobName, queueUrl });
  } catch (err) {
    console.error("❌ Jenkins 배포 요청 실패:", err.message);
    res.status(500).json({ error: "배포 요청에 실패했습니다." });
  }
});

router.get("/lastdeploy", async (req, res) => {
  try {
    const job = (req.query.job || "").toString();
    const env = (req.query.env || "").toString().toLowerCase();

    // ✅ 신규 방식: 단일 잡 + ENV 파라미터 필터
    if (job && env) {
      const { data } = await jx.get(`/job/${encodeURIComponent(job)}/api/json`, {
        params: {
          // 빌드 목록 + 파라미터 포함
          tree: "builds[number,timestamp,result,building,actions[parameters[name,value]]]",
        },
      });

      const builds = data.builds || [];
      // ENV=env 인 빌드만 추출, 최신순
      const filtered = builds
        .filter((b) => {
          const params = (b.actions || []).flatMap((a) => a.parameters || []);
          const p = params.find((p) => p && p.name === "ENV");
          return p && String(p.value).toLowerCase() === env;
        })
        .sort((a, b) => b.number - a.number);

      if (!filtered.length) return res.json({ lastDeploy: null });

      const latest = filtered[0];
      const formatted = new Date(latest.timestamp).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
      return res.json({
        lastDeploy: formatted,
        buildNumber: latest.number,
        result: (latest.result || "UNKNOWN"),
      });
    }

    const jobName = req.query.service;
    const kind = (req.query.kind || "lastCompletedBuild").toString();
    if (!jobName) return res.status(400).json({ error: "job/env 또는 service 파라미터가 필요합니다." });

    const { data } = await jx.get(`/job/${encodeURIComponent(jobName)}/${kind}/api/json`);
    if (!data?.timestamp) return res.json({ lastDeploy: null });

    const date = new Date(data.timestamp);
    const formatted = date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    res.json({ lastDeploy: formatted, buildNumber: data.number, result: data.result || "UNKNOWN" });
  } catch (err) {
    if (err.response?.status === 404) return res.json({ lastDeploy: null });
    console.error("🔴 배포 시간 불러오기 실패:", err.message);
    res.status(500).json({ error: "배포 시간 조회 실패" });
  }
});


module.exports = router;
