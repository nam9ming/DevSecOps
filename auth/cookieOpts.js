// server/auth/cookieOpts.js
const dev = process.env.NODE_ENV !== "production";
exports.refreshCookieOpts = {
    httpOnly: true,
    sameSite: "lax", // localhost:3000 -> :4000 는 same-site
    secure: !dev ? true : false, // prod https에서만 true
    path: "/api/auth/refresh", // 이 경로로만 전송
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
};
