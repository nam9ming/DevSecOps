// server/userSettings.service.js
const EventEmitter = require("events");
const fs = require("fs");
const path = require("path");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const DB_PATH = path.join(__dirname, "db", "account.json");
const adapter = new FileSync(DB_PATH);
const db = low(adapter);

// 서버 부팅 1회만 기본 구조 보장 (요청 중엔 defaults 호출 금지)
db.defaults({ users: [], refreshTokens: [] }).write();

// --- 파일 변경 감지: account.json이 바뀌면 메모리 재로딩 ---
let _reloadTimer = null;
fs.watchFile(DB_PATH, () => {
    clearTimeout(_reloadTimer);
    _reloadTimer = setTimeout(() => {
        try {
            db.read();
            console.log("[DB WATCH] account.json changed → reloaded");
        } catch (e) {
            console.error("[DB WATCH] reload error:", e.message);
        }
    }, 200); // 디바운스
});

// --- 기본값 & 병합 유틸 ---
const DEFAULTS = {
    JenkinsUrl: "",
    JenkinsUser: "",
    JenkinsApiToken: "",
    SonarQubeUrl: "",
    SonarQubeApiToken: "",
    JMeterUrl: "",
    JMeterApiToken: "",
    Timeout: 700, // 짧은 기본 타임아웃 원하던 요구 반영(원하면 숫자 조정)
};

// 응답 직전에만 기본값을 채우는 용도
function normalize(s = {}) {
    return { ...DEFAULTS, ...(s || {}) };
}

// patch에서 "정의된 값"만 덮어쓰기 (undefined로 기존값 날려버리는 것 방지)
function mergeDefined(base = {}, patch = {}) {
    const out = { ...base };
    for (const [k, v] of Object.entries(patch || {})) {
        if (v !== undefined) out[k] = v;
    }
    return out;
}

class UserSettingsService extends EventEmitter {
    async getByUserId(userId) {
        console.log("Getting settings for userId:", userId);
        db.read(); // 최신 파일 반영

        const u = db
            .get("users")
            .find({ id: String(userId) })
            .value();

        if (!u) {
            // ❗ 없으면 404 → 프론트는 기존/로컬 설정을 유지하도록 분기하게 됨
            const err = new Error("User not found");
            err.status = 404;
            throw err;

            // (대안: 최초 접근 시 자동 생성하고 싶다면 아래 업서트 사용)
            // db.get("users").push({ id: String(userId), setting: {} }).write();
            // return normalize({});
        }

        // 저장된 값에 "응답 시"만 기본값 보강
        return normalize(u.setting || {});
    }

    async updateByUserId(userId, patch) {
        // 안전하게 최신 읽기
        db.read();

        const u = db
            .get("users")
            .find({ id: String(userId) })
            .value();
        if (!u) {
            const err = new Error("User not found");
            err.status = 404;
            throw err;

            // (대안: 저장 시 업서트 원하면)
            // db.get("users").push({ id: String(userId), setting: {} }).write();
            // const current = {};
            // const next = normalize(mergeDefined(current, patch));
            // db.get("users").find({ id: String(userId) }).set("setting", next).write();
            // this.emit("changed", { userId: String(userId), setting: next });
            // return next;
        }

        const current = u.setting || {};
        // patch의 정의된 키만 반영 → 빈/undefined로 기존값이 사라지는 롤백 방지
        const merged = mergeDefined(current, patch);
        // 응답 일관성을 위해 normalize
        const next = normalize(merged);

        db.get("users")
            .find({ id: String(userId) })
            .set("setting", next)
            .write();
        this.emit("changed", { userId: String(userId), setting: next });

        return next;
    }
}

module.exports = new UserSettingsService();
