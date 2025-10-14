const express = require("express");
const router = express.Router();

//const { JENKINS_URL, AUTH } = require("../config/jenkins");

const { authenticateToken } = require("../auth/auth_middleware");
const attachUserSetting = require("../middleware/attachUserSetting");
const { createApiClient } = require("../auth/axiosClient");

/** Axios Jenkins 클라이언트 */
/*const jx = axios.create({
  baseURL: JENKINS_URL,
  auth: AUTH,
  timeout: 10000,
});*/

/** CSRF Crumb 가져오기 (미사용 환경 고려) */
async function getCrumb() {
    try {
        const { data } = await jenkins.get("/crumbIssuer/api/json");
        return { [data.crumbRequestField]: data.crumb };
    } catch {
        return {};
    }
}

/** 네트워크 오류 매핑 */
function mapNetworkError(err) {
    if (!err || err.response) return null;
    const c = err.code || "";
    if (c === "ECONNREFUSED" || c === "ENOTFOUND") {
        return { status: 503, body: { error: "Jenkins에 연결할 수 없습니다", code: "JENKINS_UNREACHABLE" } };
    }
    if (c === "ETIMEDOUT" || c === "ECONNABORTED") {
        return { status: 504, body: { error: "Jenkins 응답 타임아웃", code: "JENKINS_TIMEOUT" } };
    }
    return { status: 503, body: { error: "네트워크 오류", code: "NETWORK_ERROR" } };
}

/** Jenkins “이미 존재” 에러 탐지 */
function looksLikeExistsError(err) {
    const status = err?.response?.status;
    const raw = err?.response?.data;
    const txt = typeof raw === "string" ? raw : raw?.message || raw?.error || JSON.stringify(raw || {});
    const msg = (txt || "").toLowerCase();
    return (status === 400 || status === 409) && (msg.includes("already exists") || msg.includes("exists with the name") || msg.includes("a job already exists"));
}

/** XML 내 CDATA로 스크립트 안전 삽입 */
function cdata(script) {
    return `<![CDATA[${String(script).replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

/** Jenkins Pipeline Job config.xml 생성 (ENV choice 고정) */
function buildConfigXml(pipelineScript) {
    return `<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <actions/>
  <description></description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <hudson.model.ParametersDefinitionProperty>
      <parameterDefinitions>
        <hudson.model.ChoiceParameterDefinition>
          <name>ENV</name>
          <description>배포 대상</description>
          <choices class="java.util.Arrays$ArrayList">
            <a class="string-array">
              <string>dev</string>
              <string>stage</string>
              <string>prod</string>
            </a>
          </choices>
        </hudson.model.ChoiceParameterDefinition>
      </parameterDefinitions>
    </hudson.model.ParametersDefinitionProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps">
    <script>${cdata(pipelineScript)}</script>
    <sandbox>true</sandbox>
  </definition>
  <triggers/>
  <disabled>false</disabled>
</flow-definition>`;
}

/** 잡 생성 */
router.post("/jobs", authenticateToken, attachUserSetting, async (req, res) => {
    try {
        const { jobName, pipelineScript } = req.body;
        const { jenkins } = req.clients;

        // 입력 검증
        if (!jobName || typeof jobName !== "string") {
            return res.status(400).json({ error: "jobName이 필요합니다.", code: "JOBNAME_REQUIRED" });
        }
        if (!pipelineScript || typeof pipelineScript !== "string") {
            return res.status(400).json({ error: "파이프라인 스크립트가 필요합니다.", code: "PIPELINE_REQUIRED" });
        }
        const name = jobName.trim();
        if (!name || /[\\/:*?"<>|]/.test(name)) {
            return res.status(400).json({ error: "잡 이름에 허용되지 않는 문자가 포함되어 있습니다.", code: "INVALID_JOBNAME" });
        }

        // config.xml 생성
        const configXml = buildConfigXml(pipelineScript);

        // CSRF crumb + 생성 요청
        const crumb = await getCrumb();
        const resp = await jenkins.post(`/createItem?name=${encodeURIComponent(name)}`, configXml, {
            headers: { "Content-Type": "application/xml", ...crumb },
            maxRedirects: 0,
            validateStatus: (s) => s >= 200 && s < 500, // 200/201/302/400/409 등 받아서 처리
        });

        if (resp.status >= 200 && resp.status < 300) {
            return res.status(201).json({
                message: "잡 생성 완료",
                jobName: name,
                location: resp.headers?.location || null,
            });
        }

        if (resp.status === 400 || resp.status === 409) {
            return res.status(409).json({ error: "이미 존재하는 잡 이름입니다.", code: "JOB_EXISTS" });
        }

        return res.status(500).json({ error: "잡 생성 실패", code: "JENKINS_ERROR" });
    } catch (err) {
        // 네트워크 계열 먼저
        const net = mapNetworkError(err);
        if (net) {
            console.error("❌ Jenkins 네트워크 오류:", err.code || err.message);
            return res.status(net.status).json(net.body);
        }

        if (looksLikeExistsError(err)) {
            return res.status(409).json({ error: "이미 존재하는 잡 이름입니다.", code: "JOB_EXISTS" });
        }

        console.error("❌ 잡 생성 실패:", err.response?.status || err.message);
        return res.status(500).json({ error: "잡 생성 실패", code: "INTERNAL_ERROR" });
    }
});

module.exports = router;
