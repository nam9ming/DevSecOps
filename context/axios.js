import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

// 기본 API 요청을 위한 인스턴스
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});

// 토큰 재발급 등 인증이 필요 없는 요청을 위한 인스턴스
const authApi = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
    withCredentials: true, // 쿠키를 포함하여 요청
});

let accessToken = "";

export const setAccessToken = (token) => {
    accessToken = token;
};

// 요청 인터셉터: 모든 API 요청에 Access Token을 헤더에 추가
api.interceptors.request.use(
    (config) => {
        if (accessToken) {
            config.headers["Authorization"] = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 응답 인터셉터: Access Token 만료 시(403 에러) Refresh Token으로 재발급 시도
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        // 403 에러이고, 재시도한 요청이 아닐 경우
        if (error.response.status === 403 && !originalRequest._retry) {
            originalRequest._retry = true; // 재시도 플래그 설정
            try {
                // 토큰 재발급 요청
                const res = await authApi.post("/auth/refresh");
                const newAccessToken = res.data.accessToken;
                setAccessToken(newAccessToken); // 새로 발급받은 토큰 저장

                // 원래 요청의 헤더에 새로운 토큰을 설정하여 재요청
                originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // 리프레시 토큰도 만료되었거나 문제가 발생한 경우
                // 로그아웃 처리
                console.error("Unable to refresh token", refreshError);
                // 여기서 로그인 페이지로 리디렉션하는 등의 처리를 할 수 있습니다.
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export { api, authApi };
