const jwt = require("jsonwebtoken");

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, user) => {
        if (err) {
            // Access Token이 만료되었다면 403 Forbidden 에러를 보냅니다.
            // 클라이언트는 이 에러를 보고 토큰 재발급을 요청해야 합니다.
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};
