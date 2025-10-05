import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AuthProvider, { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ServicePage from "./pages/ServicePage";
import EnvPage from "./pages/EnvPage";
import EnvironmentExecutions from "./pages/EnvironmentExecutions";
import ExecutionDetail from "./pages/ExecutionDetail";
import Repositories from "./pages/Repositories";
import Pipelines from "./pages/Pipelines";
import Deployments from "./pages/Deployments";
import DeploymentDetail from "./pages/DeploymentDetail";
import Security from "./pages/Security";
import Testing from "./pages/Testing";
import Settings from "./pages/Setting";
import Login from "./pages/Login";
import Service from "./pages/service";
import { useAttachInterceptors } from "./context/axios";
import { useEffect } from "react";
import { bootAuth } from "./context/authBoot"; // 새로고침시 토큰 재발급 시도

// 다른 페이지들 import

// 보호된 라우트 컴포넌트
// const ProtectedRoute = ({ children }) => {
//     const { isAuthenticated, loading } = useAuth();

//     if (loading) {
//         return (
//             <div className="min-h-screen flex items-center justify-center">
//                 <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
//             </div>
//         );
//     }

//     return isAuthenticated ? children : <Navigate to="/login" replace />;
// };

// // 로그인 페이지용 라우트 컴포넌트
// const PublicRoute = ({ children }) => {
//     const { isAuthenticated, loading } = useAuth();

//     if (loading) {
//         return (
//             <div className="min-h-screen flex items-center justify-center">
//                 <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
//             </div>
//         );
//     }

//     return isAuthenticated ? <Navigate to="/" replace /> : children;
// };

function AppRoutes() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="service/:serviceId" element={<ServicePage />} />
                    <Route path="service/:serviceId/env/:envId" element={<EnvPage />} />
                    <Route path="service/:serviceId/:env" element={<EnvironmentExecutions />} />
                    <Route path="service/:serviceId/:env/execution/:execId" element={<ExecutionDetail />} />
                    <Route path="repositories" element={<Repositories />} />
                    <Route path="pipelines" element={<Pipelines />} />
                    <Route path="deployments" element={<Deployments />} />
                    <Route path="deployments/:serviceId/" element={<DeploymentDetail />} />
                    <Route path="security" element={<Security />} />
                    <Route path="testing" element={<Testing />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="service" element={<Service />} />
                    {/* 추가 페이지들 */}
                </Route>
                <Route path="login" element={<Login />} />
            </Routes>
        </Router>
    );
}
function AppInner() {
    const { authReady } = useAuth();
    useAttachInterceptors(); // 인터셉터는 Provider 안에서 장착

    if (!authReady) return null; // ← ★ 준비 전엔 렌더하지 않음(스피너 넣어도 OK)
    return <AppRoutes />;
}

function App() {
    const { setAccessToken } = useAuth();

    useAttachInterceptors();

    useEffect(() => {
        bootAuth(setAccessToken);
    }, [setAccessToken]);

    return (
        <AuthProvider>
            <AppInner />
        </AuthProvider>
    );
}

export default App;
