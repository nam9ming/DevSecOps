const express = require("express");
const cors = require("cors");
const app = express();
const path = require("path");
const port = process.env.PORT || 4000;

const setting_router = require("./routes/setting.js");
const { authenticateToken } = require("./routes/auth/auth_middleware.js");
const auth = require("./routes/auth/auth_controller.js");

const pipelineRoute = require("./routes/pipelineRoute");
const deploymentRoute = require("./routes/deploymentRoute");

app.use(cors());

app.use(
    cors({
        origin: "http://localhost:3000",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })
);

app.use(express.json());
app.use(express.text({ type: "application/xml" }));

// 정적 파일 제공을 위한 미들웨어 설정
app.use(express.static(path.join(__dirname, "../public")));

// 루트 경로에 대한 핸들러
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use("/api/pipeline", pipelineRoute);
app.use("/api/deployment", deploymentRoute);

app.use("/setting", setting_router);

// 인증 라우트
app.post("/api/auth", auth);

// 보호된 라우트 (예시)
app.get("/api/profile", authenticateToken, (req, res) => {
    res.json({ message: `안녕하세요, ${req.user.username}님! 이것은 보호된 정보입니다.` });
});

app.listen(port, () => {
    console.log(`서버가 http://localhost:${port}에서 실행 중입니다.`);
});
