import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ServicePage from "./pages/ServicePage";
import EnvPage from "./pages/EnvPage";
import Repositories from "./pages/Repositories";
import Pipelines from "./pages/Pipelines";
import Deployments from "./pages/Deployments";
import Security from "./pages/Security";
import Testing from "./pages/Testing";
import Settings from "./pages/Setting";
// 다른 페이지들 import

// 보호된 라우트 컴포넌트
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// 로그인 페이지용 라우트 컴포넌트
const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return isAuthenticated ? <Navigate to="/" replace /> : children;
};

function AppRoutes() {
    return (
        <Router>
            <Routes>
                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    }
                />
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Dashboard />} />
                    <Route path="/service/:serviceId" element={<ServicePage />} />
                    <Route path="/service/:serviceId/env/:envId" element={<EnvPage />} />
                    <Route path="repositories" element={<Repositories />} />
                    <Route path="pipelines" element={<Pipelines />} />
                    <Route path="deployments" element={<Deployments />} />
                    <Route path="security" element={<Security />} />
                    <Route path="testing" element={<Testing />} />
                    <Route path="settings" element={<Settings />} />
                    {/* 추가 페이지들 */}
                </Route>
            </Routes>
        </Router>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );
}

export default App;
