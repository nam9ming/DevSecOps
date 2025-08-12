import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 페이지 로드 시 인증 상태 확인
        const token = localStorage.getItem("token");
        if (token) {
            // TODO: 토큰 유효성 검증 API 호출
            setIsAuthenticated(true);
            setUser({
                id: 1,
                name: "사용자",
                email: "user@example.com",
                avatar: "남",
            });
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            // TODO: 실제 로그인 API 호출
            // const response = await fetch('/api/auth/login', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify({ email, password })
            // });

            // 임시 로그인 로직
            if (email && password) {
                const mockUser = {
                    id: 1,
                    name: "사용자",
                    email: email,
                    avatar: "남",
                };

                // 토큰 저장 (실제 구현 시 서버에서 받은 토큰 사용)
                localStorage.setItem("token", "mock-jwt-token");
                localStorage.setItem("user", JSON.stringify(mockUser));

                setIsAuthenticated(true);
                setUser(mockUser);

                return { success: true };
            } else {
                throw new Error("이메일과 비밀번호를 입력해주세요.");
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsAuthenticated(false);
        setUser(null);
    };

    const value = {
        isAuthenticated,

        user,
        loading,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
