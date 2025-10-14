// server/middleware/attachUserSetting.js
const userSettings = require("../userSettings.service");
const { createServiceClients } = require("../auth/serviceClient");

module.exports = async (req, res, next) => {
    try {
        // const auth = req.headers.authorization || "";
        // console.log("[auth] Authorization:", auth);
        // console.log("🔵 attachUserSetting 실행", req.user?.id);
        const uid = req.user?.id;
        if (!uid) return res.status(401).json({ error: "Unauthorized" });
        req.userSetting = await userSettings.getByUserId(uid);

        const setting = await userSettings.getByUserId(uid);

        // 서비스별 axios 인스턴스 생성
        req.clients = createServiceClients(setting);

        next();
    } catch (e) {
        console.log("🔴 attachUserSetting 실패:", e.message);
        next(e);
    }
};
