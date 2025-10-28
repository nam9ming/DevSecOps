const express = require("express");
const router = express.Router();

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const adapter = new FileSync("db/account.json");
const db = low(adapter);

const userSettings = require("../userSettings.service");
const { authenticateToken } = require("../auth/auth_middleware");
const attachUserSetting = require("../middleware/attachUserSetting");

db.defaults({ users: [], refreshTokens: [] }).write();

// /api/setting

// router.put("/inter", (req, res) => {
//     const body = req.body || {};

//     console.log(body.SettingsForm);

//     const Userinfo = req.body.user;
//     JenkinsUrl = body.SettingsForm.JenkinsUrl;
//     JenkinsApiToken = body.SettingsForm.JenkinsApiToken;
//     GithubApiToken = body.SettingsForm.GitHubApiToken;
//     DockerRegistryUrl = body.SettingsForm.DockerRegistryURL;
//     KubernetesConfig = body.SettingsForm.KubernetesConfig;
//     JenkinsUser = body.SettingsForm.JenkinsUser;

//     console.log(req.body.SettingForm);

//     console.log("프론트엔드로부터 받은 여러 데이터:");
//     console.log(`  URL: ${JenkinsUrl}`);
//     console.log(`  API: ${JenkinsApiToken}`);
//     console.log(`  GAPI: ${GithubApiToken}`);
//     console.log(`  DURL: ${DockerRegistryUrl}`);
//     console.log(`  KCONFIG: ${KubernetesConfig}`);

//     // 여기에서 받은 데이터를 데이터베이스에 저장하거나 다른 백엔드 로직을 수행합니다.
//     // 예: saveContactEntry({ firstName, lastName, email, message });

//     db.get("users").find({ id: Userinfo.id }).set("setting", { JenkinsUrl, JenkinsApiToken, GithubApiToken, DockerRegistryUrl, KubernetesConfig }).write();

//     res.status(200).json({
//         message: "모든 정보가 성공적으로 수신되었습니다!",
//         receivedData: { JenkinsUser, JenkinsUrl, JenkinsApiToken, GithubApiToken, DockerRegistryUrl, KubernetesConfig },
//     });
// });

router.get("/", authenticateToken, attachUserSetting, async (req, res, next) => {
    try {
        const conf = await userSettings.getByUserId(req.query.user);
        console.log("Fetched settings:", conf);
        res.json(conf);
    } catch (e) {
        console.log(conf);
        next(e);
    }
});

router.put("/inter", authenticateToken, attachUserSetting, async (req, res, next) => {
    try {
        // console.log("body =", req.body);
        const updated = await userSettings.updateByUserId(req.body.user.id, req.body.SettingsForm);
        const conf = await userSettings.getByUserId(req.body.user.id);
        console.log("sss", conf);
        // console.log("Updated settings:", updated);
        res.json("update:", updated);
    } catch (e) {
        console.error(e);
        next(e);
    }
});

module.exports = router;
