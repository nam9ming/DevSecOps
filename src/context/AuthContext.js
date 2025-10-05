// src/context/AuthContext.jsx (요지)
import { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../context/axios";
import { setAccessToken as setAxiosAccessToken } from "../context/axios";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user")) || null;
        } catch {
            return null;
        }
    });
    const [accessToken, setAccessToken] = useState(null);
    const [authReady, setAuthReady] = useState(false); // ← 부팅 게이트

    useEffect(() => {
        (async () => {
            try {
                const { data } = await authApi.post("/auth/refresh", {}, { withCredentials: true });
                if (data?.accessToken) {
                    setAccessToken(data.accessToken); // Context 상태
                    setAxiosAccessToken(data.accessToken); // (전역 변수) 인터셉터용
                    authApi.defaults.headers.common.Authorization =
                        // ★ 첫 요청도 커버
                        `Bearer ${data.accessToken}`;
                }
                setAuthReady(true);
            } catch (_) {
                // refresh 실패 → 비로그인 상태로 시작
            } finally {
                setAuthReady(true);
            }
        })();
    }, []);

    useEffect(() => {
        // 인터셉터에서 참조하는 토큰 메모리 갱신
        setAxiosAccessToken(accessToken);
    }, [accessToken]);

    useEffect(() => {
        if (user) localStorage.setItem("user", JSON.stringify(user));
        else localStorage.removeItem("user");
    }, [user]);

    const login = async (username, password) => {
        const { data } = await authApi.post("/auth/login", { username, password }, { withCredentials: true });
        setUser({ id: data.id, username: data.username });
        setAccessToken(data.accessToken);
    };

    const logout = async () => {
        try {
            await authApi.post("/auth/logout", {}, { withCredentials: true });
        } catch {}
        setUser(null);
        setAccessToken(null);
    };

    const value = { user, setUser, accessToken, setAccessToken, login, logout, authReady };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
