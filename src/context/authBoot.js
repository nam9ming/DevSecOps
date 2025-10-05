// src/libs/authBoot.js
import { authApi } from "./axios";

export async function bootAuth(setAccessToken) {
    try {
        const { data } = await authApi.post("/auth/refresh", {}, { withCredentials: true });
        if (data?.accessToken) setAccessToken(data.accessToken);
    } catch {
        // refresh 쿠키가 없거나 만료 → 무시하고 비로그인 상태로 시작
    }
}
