// server/userSettings.service.js
const EventEmitter = require("events");
const path = require("path");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync(path.join(__dirname, "db", "account.json"));
const db = low(adapter);
db.defaults({ users: [], refreshTokens: [] }).write();

function normalize(s = {}) {
    // console.log("Normalizing settings:", s);
    const set = s.SettingsForm;
    return {
        JenkinsUrl: s.JenkinsUrl || "",
        JenkinsUser: s.JenkinsUser || "",
        JenkinsApiToken: s.JenkinsApiToken || s.JenkinsApiToken || "", // 키 보정
        SonarQubeUrl: s.SonarQubeUrl || "",
        SonarQubeApiToken: s.SonarQubeApiToken || "",
        JMeterUrl: s.JMeterUrl || "",
        JMeterApiToken: s.JMeterApiToken || "",
        Timeout: typeof s.Timeout === "number" ? s.Timeout : 15000,
    };
}

// JenkinsUser: "",
// JenkinsUrl: "",
// JenkinsApiToken: "",
// GitHubApiToken: "",
// DockerRegistryURL: "",
// KubernetesConfig: "",

class UserSettingsService extends EventEmitter {
    async getByUserId(userId) {
        // console.log("Getting settings for userId:", userId);
        db.read();
        const u = db
            .get("users")
            .find({ id: String(userId) })
            .value();
        return normalize(u?.setting || {});
    }

    async updateByUserId(userId, patch) {
        // console.log("Updating settings with patch:", patch);
        db.read();
        const u = db
            .get("users")
            .find({ id: String(userId) })
            .value();
        if (!u) throw new Error("User not found");

        const current = u.setting || {};
        // console.log("Current settings:", current);
        const next = normalize({ ...current, ...patch });
        // console.log("Next settings:", next);

        db.get("users")
            .find({ id: String(userId) })
            .set("setting", next)
            .write();
        this.emit("changed", { userId: String(userId), setting: next });
        return next;
    }
}

module.exports = new UserSettingsService();
