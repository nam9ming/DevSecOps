// routes/deploymentRoute.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const { JENKINS_URL, AUTH } = require("../config/jenkins"); // named export 가정

const { authenticateToken } = require("../auth/auth_middleware");
const attachUserSetting = require("../middleware/attachUserSetting");
const { createApiClient } = require("../auth/axiosClient");

// Jenkins 색상 → 상태 매핑(폴백용)
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

// CSRF crumb 얻기(미사용 환경 고려)
const getCrumb = async () => {
    try {
        const { data } = await jenkins.get("/crumbIssuer/api/json");
        return { [data.crumbRequestField]: data.crumb };
    } catch {
        // crumb 미사용 환경일 수 있음
        return {};
    }
};

const mapNetworkError = (err) => {
    // 응답이 없고(request만 존재) 네트워크 계열 코드인 경우만 처리
    if (!err || err.response) return null;
    const c = err.code || "";
    if (c === "ECONNREFUSED" || c === "ENOTFOUND") {
        return { status: 503, body: { error: "Jenkins에 연결할 수 없습니다", code: "JENKINS_UNREACHABLE" } };
    }
    if (c === "ETIMEDOUT" || c === "ECONNABORTED") {
        return { status: 504, body: { error: "Jenkins 응답 타임아웃", code: "JENKINS_TIMEOUT" } };
    }
    return { status: 503, body: { error: "네트워크 오류", code: "NETWORK_ERROR" } };
};

// Jenkins 잡 카탈로그(서비스별 dev/stage/prod 상태)
router.get("/jobcatalog", authenticateToken, attachUserSetting, async (req, res) => {
    try {
        const { jenkins } = req.clients;

        const { data } = await jenkins.get("/api/json", { params: { tree: "jobs[name,color]" } });

        const serviceMap = {};
        const envs = ["dev", "stage", "prod"];

        await Promise.all(
            (data.jobs ?? []).map(async (j) => {
                const service = j.name;

                if (!serviceMap[service]) {
                    serviceMap[service] = {
                        name: service,
                        statuses: {},
                    };
                }

                try {
                    // 잡 상세에서 ENV 파라미터별 최신 빌드 상태 계산
                    const detail = await jenkins.get(`/job/${encodeURIComponent(service)}/api/json`, {
                        params: {
                            tree: "builds[number,result,building,timestamp,actions[parameters[name,value]]]",
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
                } catch {
                    // 상세 조회 실패 시 color 기반 동일 상태로 폴백
                    const st = mapStatus(j.color);
                    serviceMap[service].statuses = { dev: st, stage: st, prod: st };
                }
            })
        );

        res.json(Object.values(serviceMap));
    } catch (err) {
        console.error("💥 Jenkins 연동 오류:", err.message);
        res.status(500).json({ error: "Jenkins에서 Job 정보를 가져오지 못했습니다." });
    }
});

// Jenkins job 삭제
router.delete("/jobcatalog/:name", authenticateToken, attachUserSetting,async (req, res) => {
    const { jenkins } = req.clients;
    const raw = req.params.name || "";
    if (!raw) return res.status(400).json({ error: "name 파라미터가 필요합니다." });

    try {
        const exists = await jenkins
            .get(`/job/${encodeURIComponent(raw)}/api/json`)
            .then(() => true)
            .catch((e) =>
                e?.response?.status === 404
                    ? false
                    : (() => {
                          throw e;
                      })()
            );

        if (!exists) {
            return res.status(404).json({ error: "해당 잡을 찾을 수 없습니다.", name: raw });
        }

        const crumb = await getCrumb();

        await jenkins.post(`/job/${encodeURIComponent(raw)}/doDelete`, null, {
            headers: { ...crumb },
            maxRedirects: 0,
            validateStatus: (s) => (s >= 200 && s < 300) || s === 302 || s === 303,
        });

        return res.status(200).json({ message: "삭제 완료", name: raw });
    } catch (err) {
        if (err.request && !err.response) {
            const mapped = mapNetworkError(err);
            console.error("❌ 삭제 네트워크 오류:", err.code || err.message);
            return res.status(mapped.status).json(mapped.body);
        }

        const status = err.response?.status;
        const msg = status === 403 ? "권한이 없습니다(403). Jenkins 권한/crumb 설정을 확인하세요." : status === 404 ? "대상 잡을 찾지 못했습니다(404)." : "삭제 중 오류가 발생했습니다.";

        console.error("❌ 삭제 실패:", status || err.message);
        return res.status(500).json({ error: msg, code: "DELETE_FAILED", detail: status || err.message });
    }
});

// 빌드(배포) 트리거
router.post("/deployments", authenticateToken, attachUserSetting, async (req, res) => {
    try {
        const { jenkins } = req.clients;
        const { jobName, params } = req.body;

        if (!jobName) return res.status(400).json({ error: "jobName이 필요합니다." });

        const crumb = await getCrumb();
        const isParam = params && Object.keys(params).length > 0;
        const path = isParam ? `/job/${encodeURIComponent(jobName)}/buildWithParameters` : `/job/${encodeURIComponent(jobName)}/build`;

        const resp = await jenkins.post(path, null, { params: params || {}, headers: { ...crumb } });
        const queueUrl = resp.headers?.location || null; // Jenkins 201/302 Location

        res.status(200).json({ message: "빌드 요청됨", jobName, queueUrl });
    } catch (err) {
        // 1) 네트워크(백엔드→Jenkins) 오류 우선 처리
        if (err.request && !err.response) {
            const mapped = mapNetworkError(err);
            console.error("❌ 네트워크 오류:", err.code || err.message);
            return res.status(mapped.status).json(mapped.body);
        }
        // 2) 그 외( Jenkins가 응답은 했지만 실패 / 기타 내부 오류 )
        console.error("❌ 배포 요청 실패:", err.response?.status || err.message);
        return res.status(500).json({ error: "배포 요청 실패", code: "INTERNAL_ERROR" });
    }
});

// 마지막 배포시간 조회
// - 신형: /lastdeploy?job=<잡명>&env=<dev|stage|prod>
// - 구형: /lastdeploy?service=<잡명>&kind=<lastCompletedBuild|lastSuccessfulBuild>
router.get("/lastdeploy", authenticateToken, attachUserSetting, async (req, res) => {
    try {
        const { jenkins } = req.clients;

        const job = (req.query.job || "").toString();
        const env = (req.query.env || "").toString().toLowerCase();

        // ✅ 단일 잡 + ENV 파라미터 기반
        if (job && env) {
            const { data } = await jenkins.get(`/job/${encodeURIComponent(job)}/api/json`, {
                params: {
                    tree: "builds[number,timestamp,result,building,actions[parameters[name,value]]]",
                },
            });

            const builds = data.builds || [];
            const filtered = builds
                .filter((b) => {
                    const params = (b.actions || []).flatMap((a) => a.parameters || []);
                    const p = params.find((p) => p && p.name === "ENV");
                    return p && String(p.value).toLowerCase() === env;
                })
                .sort((a, b) => b.number - a.number);

            if (!filtered.length) return res.json({ lastDeploy: null });

            const latest = filtered[0];
            const formatted = new Date(latest.timestamp).toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
            });

            return res.json({
                lastDeploy: formatted,
                buildNumber: latest.number,
                result: latest.result || "UNKNOWN",
            });
        }

        // ◀️ 구형 파라미터(서비스 + kind) 지원
        const jobName = req.query.service;
        const kind = (req.query.kind || "lastCompletedBuild").toString(); // or lastSuccessfulBuild
        if (!jobName) return res.status(400).json({ error: "job/env 또는 service 파라미터가 필요합니다." });

        if (!job) {
            return res.status(400).json({ error: "job 파라미터가 필요합니다." });
        }

        if (!env || env === "default") {
            const { data } = await jenkins.get(`/job/${encodeURIComponent(job)}/lastBuild/api/json`);
            if (!data?.timestamp) return res.json({ lastDeploy: null });

            const formatted = new Date(data.timestamp).toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
            });

            return res.json({
                lastDeploy: formatted,
                buildNumber: data.number,
                result: data.result || "UNKNOWN",
            });
        }

        const { data } = await jenkins.get(`/job/${encodeURIComponent(job)}/api/json`, {
            params: {
                tree: "builds[number,timestamp,result,building,actions[parameters[name,value]]]",
            },
        });

        const builds = data.builds || [];
        const filtered = builds
            .filter((b) => {
                const params = (b.actions || []).flatMap((a) => a.parameters || []);
                const p = params.find((p) => p && p.name === "ENV");
                return p && String(p.value).toLowerCase() === env;
            })
            .sort((a, b) => b.number - a.number);

        if (!filtered.length) return res.json({ lastDeploy: null });

        const latest = filtered[0];
        const formatted = new Date(latest.timestamp).toLocaleString("ko-KR", {
            timeZone: "Asia/Seoul",
        });

        return res.json({
            lastDeploy: formatted,
            buildNumber: latest.number,
            result: latest.result || "UNKNOWN",
        });
    } catch (err) {
        if (err.response?.status === 404) return res.json({ lastDeploy: null });
        console.error("🔴 배포 시간 조회 실패:", err.message);
        res.status(500).json({ error: "배포 시간 조회 실패" });
    }
});

module.exports = router;
