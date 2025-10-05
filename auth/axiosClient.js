// server/auth/axiosClient.js  (이름 유지해도 되고 lib/apiClient.js로 옮겨도 됩니다)
const axios = require("axios");

function createApiClient(conf = {}) {
    const baseURL = (conf.JenkinsUrl || "").replace(/\/+$/, "");
    // if (!baseURL) {
    //     const err = new Error("JenkinsUrl not set");
    //     err.status = 503;
    //     throw err;
    // }
    const ax = axios.create({
        baseURL,
        timeout: conf.Timeout || 15000,
        ...(conf.Username && conf.ApiToken ? { auth: { username: conf.Username, password: conf.ApiToken } } : {}),
        headers: { "Content-Type": "application/json" },
    });

    // Username 없이 토큰만 있으면 Bearer 헤더로
    if (!(conf.Username && conf.ApiToken) && conf.ApiToken) {
        ax.interceptors.request.use((cfg) => {
            if (!cfg.headers.Authorization) cfg.headers.Authorization = `Bearer ${conf.ApiToken}`;
            return cfg;
        });
    }
    return ax;
}

module.exports = { createApiClient };
