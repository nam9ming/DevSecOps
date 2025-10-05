// server.js
require("dotenv").config();
console.log("[BOOT] SONAR_TOKEN length =", (process.env.SONAR_TOKEN || "").length);

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const port = process.env.PORT || 4000;

// 라우트 불러오기
const setting_router = require("./routes/setting.js");
const { authenticateToken } = require("./auth/auth_middleware.js");
const auth = require("./auth/auth_controller.js");

const pipelineRoute = require("./routes/pipelineRoute");
const deploymentRoute = require("./routes/deploymentRoute");
const perfRoute = require("./routes/perfRoute");
const createjobRoute = require("./routes/createjobRoute.js");

// CORS 설정
const cookieParser = require("cookie-parser");
app.use(cookieParser()); // ← refresh 토큰 읽으려면 필수

app.use(
    cors({
        origin: "http://localhost:3000",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization", "X-From"],
        credentials: true,
    })
);

// 바디 파서
app.use(express.json());
app.use(express.text({ type: "application/xml" }));
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공
app.use(express.static(path.join(__dirname, "../public")));

// app.use((req, res, next) => {
//     console.log(`[REQ] ${req.method} ${req.originalUrl}`);
//     console.log(`headers=`, req.headers);
//     console.log(`body=`, req.body);
//     next();
// });
app.use((req, res, next) => {
    if (req.method !== "OPTIONS") {
        console.log(`[REQ] ${req.method} ${req.originalUrl} from=${req.headers["x-from"] || "-"}`);
    }
    next();
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 신규 API 경로
app.use("/api/pipeline", pipelineRoute);
app.use("/api/deployment", deploymentRoute);
app.use("/api/perf", perfRoute);
app.use("/api/jobCreate", createjobRoute);

// 레거시 호환
app.use("/api/jenkins", pipelineRoute); // services, :jobName/executions, :jobName/build/:execId
app.use("/jenkins", pipelineRoute); // /jenkins/config GET/POST

// 설정 페이지
app.use("/api/setting", setting_router);

// 인증 라우트
app.use("/api/auth", auth);

// 보호된 라우트 예시
app.get("/api/profile", authenticateToken, (req, res) => {
    res.json({ message: `안녕하세요, ${req.user.username}님! 이것은 보호된 정보입니다.` });
});

// // 404 캐치(선택)
// app.use((req, res, next) => {
//     const err = new Error(`Not Found: ${req.method} ${req.originalUrl}`);
//     err.status = 404;
//     next(err);
// });

// 전역 에러 핸들러(핵심)
// app.use((err, req, res, next) => {
//     const status = err.status || 500;
//     console.error(`[ERR] ${req.method} ${req.originalUrl} -> ${status}`);
//     console.error(err.stack || err); // 스택 찍기

//     res.status(status).json({
//         ok: false,
//         status,
//         message: err.message || "Internal Server Error",
//     });
// });

// app.use((req, res, next) => {
//     console.log("[REQ]", req.method, req.originalUrl, {
//         auth: !!req.headers.authorization,
//     });
//     next();
// });

// 루트 요청 처리
app.listen(port, () => {
    console.log(`✅ Backend running at http://localhost:${port}`);
});
