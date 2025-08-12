const express = require("express");
const cors = require("cors");
const path = require("path");
const setting_router = require("./routes/setting.js");
const { authenticateToken } = require("./routes/auth/auth_middleware.js");
const auth = require("./routes/auth/auth_controller.js");

const app = express();
const port = 5000;

app.use(
    cors({
        origin: "http://localhost:3000",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })
);

app.use(express.json()); // JSON 요청 본문 파싱 미들웨어

// 정적 파일 제공을 위한 미들웨어 설정
app.use(express.static(path.join(__dirname, "../public")));

// 루트 경로에 대한 핸들러
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
    console.log(`서버가 http://localhost:${port}에서 실행 중입니다.`);
});

app.use("/setting", setting_router);

// 인증 라우트
app.post("/api/auth", auth);

// 보호된 라우트 (예시)
app.get("/api/profile", authenticateToken, (req, res) => {
    res.json({ message: `안녕하세요, ${req.user.username}님! 이것은 보호된 정보입니다.` });
});
