const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const express = require("express");
const cookieParser = require("cookie-parser");

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db/account.json");
const db = low(adapter);

// DB 초기화
db.defaults({ users: [], refreshTokens: [] }).write();

const auth = express.Router();
auth.use(cookieParser()); // 쿠키 파싱

// 회원가입
router.post("/register", async (req, res) => {
    try {
        const { username, password } = req.body;

        // 중복 체크
        const existingUser = db.get("users").find({ username }).value();
        if (existingUser) {
            return res.status(409).send("이미 존재하는 사용자 이름입니다.");
        }

        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = Date.now().toString();

        // DB 저장
        db.get("users").push({ id, username, password: hashedPassword }).write();

        res.status(201).send("회원가입이 성공적으로 완료되었습니다.");
    } catch (error) {
        res.status(500).send("서버 오류가 발생했습니다.");
    }
});

// 로그인
router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const user = db.get("users").find({ username }).value();
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).send("Invalid credentials");
    }

    // Access Token
    const accessToken = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m" });

    // Refresh Token
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });

    // DB에 Refresh Token 저장
    db.get("refreshTokens").push(refreshToken).write();

    // HttpOnly 쿠키에 저장
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
});

// Access Token 재발급
router.post("/refresh", async (req, res) => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) return res.sendStatus(401);

    // DB에서 토큰 존재 여부 확인
    const tokenExists = db.get("refreshTokens").includes(refreshToken).value();
    if (!tokenExists) return res.sendStatus(403);

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const accessToken = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
        res.json({ accessToken });
    });
});

// 로그아웃
router.post("/logout", (req, res) => {
    const { refreshToken } = req.cookies;
    db.get("refreshTokens")
        .remove((token) => token === refreshToken)
        .write();
    res.clearCookie("refreshToken");
    res.sendStatus(204);
});

module.exports = auth;
