// server/auth/serviceClients.js
const { createAxios } = require("./axiosClient");

function createServiceClients(setting) {
    console.log("Creating service clients with setting:", setting);
    const clients = {};

    const s = {
        JenkinsUrl: setting.JenkinsUrl || "",
        JenkinsUser: setting.JenkinsUser || "",
        JenkinsApiToken: setting.JenkinsApiToken || "",
        SonarQubeUrl: setting.SonarQubeUrl || "",
        SonarQubeApiToken: setting.SonarQubeApiToken || "",
        JMeterUrl: setting.JMeterUrl || "",
        JMeterToken: setting.JMeterToken || "",
        Timeout: Number.isFinite(setting.Timeout) ? setting.Timeout : 15000,
    };

    // Jenkins: Basic 또는 Bearer(사용자 선택 가능)
    clients.jenkins = createAxios({
        baseURL: s.JenkinsUrl,
        username: s.JenkinsUser,
        token: s.JenkinsApiToken,
        timeout: s.Timeout,
        authMode: "basic", // "basic" 또는 "bearer" 선택 가능
    });

    // SonarQube: 권장 방식 — 토큰을 username, 비밀번호는 빈 문자열 (Basic)
    clients.sonar = createAxios({
        baseURL: s.SonarQubeUrl,
        token: s.SonarQubeApiToken, // 빈 문자열 권장
        authMode: "sonar-basic-token",
    });

    // JMeter: 보통 자체 Auth가 없거나 프록시/게이트웨이를 통해 Bearer/Basic 적용
    clients.jmeter = createAxios({
        baseURL: s.JMeterUrl,
        token: s.JMeterToken,
        timeout: s.Timeout,
        authMode: "bearer",
    });

    return clients;
}

module.exports = { createServiceClients };
