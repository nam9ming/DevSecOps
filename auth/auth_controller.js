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
    let UserData = db.get("users").find({ id: user.id }).get("setting").value();

    console.log(UserData);
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

    res.json({ accessToken, username: user.username, id: user.id, setting: UserData });
});

// Access Token 재발급
router.post("/refresh", (req, res) => {
    const rt = req.cookies?.refreshToken;
    if (!rt) return res.status(401).send("No refresh");
    try {
        const p = jwt.verify(rt, JWT_REFRESH_SECRET);
        const u = db.get("users").find({ id: p.id }).value();
        const accessToken = jwt.sign({ id: u.id, username: u.username }, JWT_ACCESS_SECRET, { expiresIn: "15m" });
        // 가능하면 user도 같이 주기
        res.json({ accessToken, id: u.id, username: u.username });
    } catch {
        res.status(401).send("Invalid refresh");
    }
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
