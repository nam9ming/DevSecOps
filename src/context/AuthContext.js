import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../context/axios";
import { setAccessToken as setAxiosAccessToken } from "../context/axios";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user"));
        } catch {
            return null;
        }
    });

    const [accessToken, setAccessToken] = useState(null);
    const [loading, setLoading] = useState(true); // 로그인 상태 판단중
    const [authReady, setAuthReady] = useState(false); // 라우팅 렌더 게이트

    // ⛳️ 앱 부팅 시 Refresh 시도 (쿠키 기반)
    useEffect(() => {
        (async () => {
            try {
                const { data } = await authApi.post("/auth/refresh", {}, { withCredentials: true });
                if (data?.accessToken) {
                    setAccessToken(data.accessToken);
                    setAxiosAccessToken(data.accessToken);
                    authApi.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
                    // 서버가 유저 정보도 준다면 여기서 setUser(data.user) 가능
                } else {
                    // 토큰 없으면 명시적으로 초기화
                    setAccessToken(null);
                    setAxiosAccessToken(null);
                    delete authApi.defaults.headers.common.Authorization;
                }
            } catch {
                // 실패 시 비로그인 상태로 명시화
                setAccessToken(null);
                setAxiosAccessToken(null);
                delete authApi.defaults.headers.common.Authorization;
            } finally {
                setLoading(false);
                setAuthReady(true);
            }
        })();
    }, []);

    // 🔁 토큰 변경 시 인터셉터/전역 메모리에 반영
    useEffect(() => {
        setAxiosAccessToken(accessToken);
        if (accessToken) {
            authApi.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        } else {
            delete authApi.defaults.headers.common.Authorization;
        }
    }, [accessToken]);

    // 🧳 user 로컬스토리지 동기화
    useEffect(() => {
        if (user) localStorage.setItem("user", JSON.stringify(user));
        else {
            localStorage.removeItem("setting");
            localStorage.removeItem("user");
        }
    }, [user]);

    // ✅ 로그인: 상태 + 헤더 모두 올리기
    const login = async (username, password) => {
        const { data } = await authApi.post("/auth/login", { username, password }, { withCredentials: true });
        setUser({ id: data.id, username: data.username });
        setAccessToken(data.accessToken);
        setAxiosAccessToken(data.accessToken);
        authApi.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
        return data; // 호출부에서 navigate 등에 활용 가능
    };

    // ✅ 로그아웃: 상태 + 헤더 모두 내리기
    const logout = async () => {
        try {
            await authApi.post("/auth/logout", {}, { withCredentials: true });
        } catch {}
        setUser(null);
        setAccessToken(null);
        setAxiosAccessToken(null);
        delete authApi.defaults.headers.common.Authorization;
    };

    // ✅ 인증 여부: token || user 하나만 있어도 true
    const isAuthenticated = useMemo(() => Boolean(accessToken || user), [accessToken, user]);

    const value = {
        user,
        setUser,
        accessToken,
        setAccessToken,
        isAuthenticated,
        loading,
        authReady,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
