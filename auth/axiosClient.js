// server/auth/axiosClient.js
const axios = require("axios");

/**
 * createAxios
 * 각 서비스(Jenkins, SonarQube, JMeter)별로 인증 방식과 baseURL을 설정해 axios 인스턴스를 반환
 * @param {Object} conf 설정 객체
 * @param {string} conf.baseURL API 서버 기본 주소
 * @param {string} [conf.username] 사용자 이름 (Basic용)
 * @param {string} [conf.token] API 토큰 (Bearer/Basic용)
 * @param {string} [conf.authMode] 인증 방식: "basic" | "bearer" | "sonar-basic-token"
 * @param {number} [conf.timeout=15000] 요청 제한 시간 (ms)
 * @param {Object} [conf.defaultHeaders] 추가 헤더
 */
function createAxios(conf = {}) {
    // console.log("-----------axiosClient---------------\n", conf, "\n------------axiosClient--------");

    if (!conf.baseURL) {
        console.warn("[WARN] baseURL이 설정되지 않았습니다. 요청 시 오류가 발생할 수 있습니다.");
    }

    // 기본 axios 인스턴스 생성
    const ax = axios.create({
        baseURL: (conf.baseURL || "").replace(/\/+$/, ""), // URL 끝 슬래시 제거
        timeout: conf.timeout || 15000,
        headers: {
            "Content-Type": "application/json",
            ...conf.defaultHeaders,
        },
    });

    console.log(conf.authMode, conf.username, conf.token ? "토큰 있음" : "토큰 없음");

    // ✅ 인증 설정 구분
    switch (conf.authMode) {
        case "basic":
            if (conf.username && conf.token) {
                ax.defaults.auth = { username: conf.username, password: conf.token };
            }
            break;

        case "bearer":
            if (conf.token) {
                ax.interceptors.request.use((cfg) => {
                    if (!cfg.headers.Authorization) cfg.headers.Authorization = `Bearer ${conf.token}`;
                    return cfg;
                });
            }
            break;

        case "sonar-basic-token":
            // SonarQube 전용: username 없이 토큰만 Basic Auth 형태로 전송
            if (conf.token) {
                console.log("Setting SonarQube Basic Auth with token");
                ax.interceptors.request.use((cfg) => {
                    cfg.auth = { username: conf.token, password: "" }; // token:
                    return cfg;
                });
            }
            break;

        default:
            // 인증 없는 경우
            break;
    }

    // ✅ 요청/응답 로깅 (디버그용)
    ax.interceptors.request.use(
        (cfg) => {
            console.log(`[API REQ] ${cfg.method?.toUpperCase()} ${cfg.baseURL}${cfg.url}`);
            console.log("headers=", cfg.headers);
            return cfg;
        },
        (err) => Promise.reject(err)
    );

    ax.interceptors.response.use(
        (res) => res,
        (err) => {
            console.error("[API ERROR]", err.response?.status, err.response?.data || err.message);
            return Promise.reject(err);
        }
    );

    return ax;
}

module.exports = { createAxios };

// // server/auth/axiosClient.js  (이름 유지해도 되고 lib/apiClient.js로 옮겨도 됩니다)
// const axios = require("axios");

// function createApiClient(conf = {}) {
//     const baseURL = (conf.JenkinsUrl || "").replace(/\/+$/, "");
//     // if (!baseURL) {
//     //     const err = new Error("JenkinsUrl not set");
//     //     err.status = 503;
//     //     throw err;
//     // }
//     console.log("Creating API client with baseURL:", conf);
//     const ax = axios.create({
//         baseURL,
//         timeout: conf.Timeout || 15000,
//         ...(conf.JenkinsUser && conf.JenkinsApiToken ? { auth: { username: conf.JenkinsUser, password: conf.JenkinsApiToken } } : {}),

//         headers: { "Content-Type": "application/json" },
//     });

//     // Username 없이 토큰만 있으면 Bearer 헤더로
//     if (!(conf.JenkinsUser && conf.JenkinsApiToken) && conf.JenkinsApiToken) {
//         ax.interceptors.request.use((cfg) => {
//             if (!cfg.headers.Authorization) cfg.headers.Authorization = `Bearer ${conf.JenkinsApiToken}`;
//             return cfg;
//         });
//     }
//     return ax;
// }

// module.exports = { createApiClient };
