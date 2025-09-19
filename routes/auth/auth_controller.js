// routes/auth/auth_controller.js
const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db/account.json");
const db = low(adapter);

// DB 초기화(최초 1회)
db.defaults({ users: [], refreshTokens: [] }).write();

// 라우터 전용 미들웨어
router.use(cookieParser());
router.use(express.json());

// 헬퍼
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access-secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh-secret";

// 회원가입
router.post("/register", async (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || !password) return res.status(400).send("username/password 필요");

        const existing = db.get("users").find({ username }).value();
        if (existing) return res.status(409).send("이미 존재하는 사용자 이름입니다.");

        const hashed = await bcrypt.hash(password, 10);
        const id = Date.now().toString();

        db.get("users").push({ id, username, password: hashed }).write();

        res.status(201).send("회원가입이 성공적으로 완료되었습니다.");
    } catch (err) {
        res.status(500).send("서버 오류가 발생했습니다.");
    }
});

// 로그인
router.post("/login", async (req, res) => {
    const { username, password } = req.body || {};
    console.log(req.body);
    const user = db.get("users").find({ username }).value();

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).send("Invalid credentials");
    }

    const uid = user.id ?? user.username; // user.id가 있으면 그걸 우선 사용
    const accessToken = jwt.sign({ id: user.id, username: user.username }, JWT_ACCESS_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    // 기존 토큰 제거 후 새로 저장
    db.get("refreshTokens").remove({ id: uid }).write();
    db.get("refreshTokens")
        .push({
            id: uid,
            token: refreshToken,
            createdAt: Date.now(),
        })
        .write();

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
});

// Access Token 재발급
router.post("/refresh", (req, res) => {
    const { refreshToken } = req.cookies || {};
    if (!refreshToken) return res.sendStatus(401);

    const exists = db.get("refreshTokens").includes(refreshToken).value();
    if (!exists) return res.sendStatus(403);

    jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, payload) => {
        if (err) return res.sendStatus(403);
        const accessToken = jwt.sign({ id: payload.id, username: payload.username }, JWT_ACCESS_SECRET, { expiresIn: "15m" });
        res.json({ accessToken });
    });
});

// 로그아웃
router.post("/logout", (req, res) => {
    const { refreshToken } = req.cookies || {};
    if (refreshToken) {
        db.get("refreshTokens")
            .remove((t) => t === refreshToken)
            .write();
    }
    res.clearCookie("refreshToken");
    res.sendStatus(204);
});

module.exports = router;
