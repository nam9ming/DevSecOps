// src/libs/axios.js
import axios from "axios";
import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

export const authApi = axios.create({
    baseURL: "http://localhost:4000/api",
    withCredentials: true,
});

// ✅ 동시 401에 대해 refresh 1회만 날리고 나머지는 그 Promise를 기다리도록
let refreshInFlight = null;
let installed = false;

let ACCESS_TOKEN = null;

// ✅ AuthContext에서 사용할 setter를 export
export function setAccessToken(token) {
    ACCESS_TOKEN = token || null;
    if (ACCESS_TOKEN) {
        authApi.defaults.headers.common.Authorization = `Bearer ${ACCESS_TOKEN}`;
    } else {
        delete authApi.defaults.headers.common.Authorization;
    }
}

export function useAttachInterceptors() {
    const { accessToken, setAccessToken, logout } = useAuth();
    const mountedRef = useRef(true);

    // ... request/response interceptors

    useEffect(() => {
        mountedRef.current = true;
        // 요청 인터셉터
        const reqId = authApi.interceptors.request.use((config) => {
            if (accessToken) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${accessToken}`;
            }
            return config;
        });
        if (installed) return; // 중복 설치 방지
        installed = true;

        // 응답 인터셉터
        const resId = authApi.interceptors.response.use(
            (res) => res,
            async (err) => {
                console.log("interceptors");
                const res = err.response;
                const original = err.config || {};
                const url = original.url || "";

                // 네트워크 에러 등은 통과
                if (!res) return Promise.reject(err);

                // 이미 재시도한 요청은 더 이상 만지지 않음
                if (original._retry) return Promise.reject(err);

                // 401이 아니면 통과
                if (res.status !== 403) return Promise.reject(err);

                // ❌ 로그인/회원가입/refresh 자신에서 난 401은 재시도 금지(무한루프 원인)
                if (url.includes("/auth/login") || url.includes("/auth/register") || url.includes("/auth/refresh")) {
                    console.log("401222");
                    return Promise.reject(err);
                }

                // 여기서부터는 액세스 토큰 만료로 간주 → refresh 시도 (1회만)
                try {
                    console.log("AccessToken expired, trying refresh…", original);
                    original._retry = true;

                    if (!refreshInFlight) {
                        refreshInFlight = authApi
                            .post("/auth/refresh", {}, { withCredentials: true })
                            .then(({ data }) => {
                                // 서버가 accessToken만 주는 경우
                                if (data?.accessToken) {
                                    setAccessToken?.(data.accessToken);
                                    return data.accessToken;
                                }
                                throw new Error("No accessToken from refresh");
                            })
                            .finally(() => {
                                // 다음 401들을 위해 reset
                                refreshInFlight = null;
                            });
                    }

                    const newToken = await refreshInFlight;
                    // 새 토큰으로 원요청 재시도
                    original.headers = { ...(original.headers || {}), Authorization: `Bearer ${newToken}` };
                    return authApi(original);
                } catch (e) {
                    // refresh 실패 → 확실히 로그아웃하고 에러 반환 (루프 차단)
                    try {
                        await logout?.();
                    } catch {}
                    return Promise.reject(e);
                }
            }
        );

        return () => {
            mountedRef.current = false;
            authApi.interceptors.request.eject(reqId);
            authApi.interceptors.response.eject(resId);
        };
    }, [accessToken, setAccessToken, logout]);
}
