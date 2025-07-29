import React, { useState } from "react";
import axios from "axios";
import { Settings as SettingsIcon, User, Shield, Database, Bell, Palette, Globe, Save, RefreshCw, Trash2, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

const Settings = () => {
    const [SettingsForm, setSettingsForm] = useState({
        JenkinsURL: "",
        JenkinsApiToken: "",
        GitHubApiToken: "",
        DockerRegistryURL: "",
        KubernetesConfig: "",
    });

    const [response, setResponse] = useState("");
    const [Error, setError] = useState("");

    const handleSettingsUpdate = async (e) => {
        const { name, value } = e.target;
        setSettingsForm((prev) => ({
            ...prev,
            [name]: value,
        }));

        try {
            const response = await axios.post("http://localhost:5000/Inter", SettingsForm);
            console.log("서버 응답:", response.data);
        } catch (error) {
            console.error("전송 오류:", error);
        }
    };

    const [activeTab, setActiveTab] = useState("general");
    const [notifications, setNotifications] = useState({
        email: true,
        slack: false,
        webhook: true,
        buildAlerts: true,
        securityAlerts: true,
        deploymentAlerts: false,
    });
    const [security, setSecurity] = useState({
        twoFactor: false,
        sessionTimeout: 30,
        passwordPolicy: "strong",
        ipWhitelist: "",
    });
    const [appearance, setAppearance] = useState({
        theme: "light",
        language: "ko",
        timezone: "Asia/Seoul",
        dateFormat: "YYYY-MM-DD",
    });
    const [integrations, setIntegrations] = useState({
        jenkins: true,
        github: true,
        docker: false,
        kubernetes: true,
    });

    const handleNotificationChange = (key) => {
        console.log("알림 변경:", key);
        setNotifications((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const handleSecurityChange = (key, value) => {
        setSecurity((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleAppearanceChange = (key, value) => {
        setAppearance((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleIntegrationChange = (key) => {
        setIntegrations((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const tabs = [
        { id: "general", name: "일반", icon: SettingsIcon },
        { id: "notifications", name: "알림", icon: Bell },
        { id: "security", name: "보안", icon: Shield },
        { id: "appearance", name: "외관", icon: Palette },
        { id: "integrations", name: "연동", icon: Database },
    ];

    const renderGeneralSettings = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">기본 정보</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">프로젝트 이름</label>
                        <input type="text" defaultValue="DevSecOps Dashboard" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">프로젝트 설명</label>
                        <textarea defaultValue="DevSecOps 파이프라인 모니터링 및 관리 대시보드" rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">관리자 이메일</label>
                        <input type="email" defaultValue="admin@devsecops.com" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">데이터 관리</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-medium text-gray-900">데이터 백업</h4>
                            <p className="text-sm text-gray-500">매일 자동으로 데이터를 백업합니다</p>
                        </div>
                        <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            백업 실행
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-medium text-gray-900">캐시 초기화</h4>
                            <p className="text-sm text-gray-500">시스템 캐시를 초기화합니다</p>
                        </div>
                        <button className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" />
                            초기화
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-medium text-gray-900">데이터 삭제</h4>
                            <p className="text-sm text-gray-500">모든 데이터를 영구적으로 삭제합니다</p>
                        </div>
                        <button className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 flex items-center gap-2">
                            <Trash2 className="w-4 h-4" />
                            삭제
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderNotificationSettings = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">알림 채널</h3>
                </div>
                <div className="p-6 space-y-4">
                    {Object.entries(notifications).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-medium text-gray-900 capitalize">
                                    {key === "email" && "이메일 알림"}
                                    {key === "slack" && "Slack 알림"}
                                    {key === "webhook" && "Webhook 알림"}
                                    {key === "buildAlerts" && "빌드 알림"}
                                    {key === "securityAlerts" && "보안 알림"}
                                    {key === "deploymentAlerts" && "배포 알림"}
                                </h4>
                                <p className="text-sm text-gray-500">
                                    {key === "email" && "이메일로 알림을 받습니다"}
                                    {key === "slack" && "Slack 채널로 알림을 보냅니다"}
                                    {key === "webhook" && "외부 시스템으로 webhook을 전송합니다"}
                                    {key === "buildAlerts" && "빌드 상태 변경 시 알림을 받습니다"}
                                    {key === "securityAlerts" && "보안 이슈 발생 시 알림을 받습니다"}
                                    {key === "deploymentAlerts" && "배포 완료 시 알림을 받습니다"}
                                </p>
                            </div>
                            <button onClick={() => handleNotificationChange(key)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? "bg-blue-500" : "bg-gray-200"}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">알림 설정</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">이메일 주소</label>
                        <input type="email" defaultValue="admin@devsecops.com" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Slack Webhook URL</label>
                        <input type="url" defaultValue="https://hooks.slack.com/services/..." className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">알림 빈도</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option>즉시</option>
                            <option>5분마다</option>
                            <option>15분마다</option>
                            <option>1시간마다</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSecuritySettings = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">인증 및 보안</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-medium text-gray-900">2단계 인증</h4>
                            <p className="text-sm text-gray-500">Google Authenticator를 사용한 2단계 인증</p>
                        </div>
                        <button onClick={() => handleSecurityChange("twoFactor", !security.twoFactor)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${security.twoFactor ? "bg-blue-500" : "bg-gray-200"}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${security.twoFactor ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">세션 타임아웃 (분)</label>
                        <input type="number" value={security.sessionTimeout} onChange={(e) => handleSecurityChange("sessionTimeout", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호 정책</label>
                        <select value={security.passwordPolicy} onChange={(e) => handleSecurityChange("passwordPolicy", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="weak">약함 (최소 6자)</option>
                            <option value="medium">보통 (최소 8자, 영문+숫자)</option>
                            <option value="strong">강함 (최소 10자, 영문+숫자+특수문자)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">IP 화이트리스트</label>
                        <textarea
                            value={security.ipWhitelist}
                            onChange={(e) => handleSecurityChange("ipWhitelist", e.target.value)}
                            placeholder="허용할 IP 주소를 한 줄에 하나씩 입력하세요"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">보안 감사</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <div>
                                <h4 className="text-sm font-medium text-green-900">보안 스캔 완료</h4>
                                <p className="text-sm text-green-700">마지막 스캔: 2시간 전</p>
                            </div>
                        </div>
                        <button className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">스캔 실행</button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                            <div>
                                <h4 className="text-sm font-medium text-yellow-900">업데이트 필요</h4>
                                <p className="text-sm text-yellow-700">3개의 보안 패치가 대기 중</p>
                            </div>
                        </div>
                        <button className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600">업데이트</button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderAppearanceSettings = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">테마 및 언어</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">테마</label>
                        <select value={appearance.theme} onChange={(e) => handleAppearanceChange("theme", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="light">라이트 모드</option>
                            <option value="dark">다크 모드</option>
                            <option value="auto">시스템 설정 따름</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">언어</label>
                        <select value={appearance.language} onChange={(e) => handleAppearanceChange("language", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="ko">한국어</option>
                            <option value="en">English</option>
                            <option value="ja">日本語</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">시간대</label>
                        <select value={appearance.timezone} onChange={(e) => handleAppearanceChange("timezone", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="Asia/Seoul">Asia/Seoul (UTC+9)</option>
                            <option value="UTC">UTC (UTC+0)</option>
                            <option value="America/New_York">America/New_York (UTC-5)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">날짜 형식</label>
                        <select value={appearance.dateFormat} onChange={(e) => handleAppearanceChange("dateFormat", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">대시보드 설정</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-medium text-gray-900">실시간 업데이트</h4>
                            <p className="text-sm text-gray-500">대시보드 데이터를 실시간으로 업데이트</p>
                        </div>
                        <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-500">
                            <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-medium text-gray-900">애니메이션 효과</h4>
                            <p className="text-sm text-gray-500">차트 및 카드 애니메이션 표시</p>
                        </div>
                        <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                            <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderIntegrationSettings = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">서비스 연동</h3>
                </div>
                <div className="p-6 space-y-4">
                    {Object.entries(integrations).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${value ? "bg-green-500" : "bg-gray-300"}`} />
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 capitalize">
                                        {key === "jenkins" && "Jenkins"}
                                        {key === "github" && "GitHub"}
                                        {key === "docker" && "Docker"}
                                        {key === "kubernetes" && "Kubernetes"}
                                    </h4>
                                    <p className="text-sm text-gray-500">
                                        {key === "jenkins" && "CI/CD 파이프라인 연동"}
                                        {key === "github" && "소스 코드 저장소 연동"}
                                        {key === "docker" && "컨테이너 이미지 관리"}
                                        {key === "kubernetes" && "컨테이너 오케스트레이션"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleIntegrationChange(key)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? "bg-blue-500" : "bg-gray-200"}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
                                </button>
                                <button className="text-blue-500 hover:text-blue-700 text-sm">설정</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">API 설정</h3>
                </div>
                <form>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Jenkins URL</label>
                            <input type="url" id="jenkinsUrl" name="jenkinsUrl" defaultValue="http://jenkins.example.com" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Jenkins API Token</label>
                            <div className="relative">
                                <input type="text" id="jenkinsToken" name="jenkinsToken" defaultValue="" className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <button className="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
                                    <Eye className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">GitHub API Token</label>
                            <div className="relative">
                                <input type="text" id="githubToken" name="githubToken" defaultValue="" className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <button className="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
                                    <Eye className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Docker Registry URL</label>
                            <input type="url" id="dockerRegistryUrl" name="dockerRegistryUrl" defaultValue="https://registry.example.com" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Kubernetes Config</label>
                            <textarea defaultValue="apiVersion: v1\nkind: Config\n..." rows={5} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" />
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case "general":
                return renderGeneralSettings();
            case "notifications":
                return renderNotificationSettings();
            case "security":
                return renderSecuritySettings();
            case "appearance":
                return renderAppearanceSettings();
            case "integrations":
                return renderIntegrationSettings();
            default:
                return renderGeneralSettings();
        }
    };

    return (
        <div className="space-y-6">
            {/* 페이지 헤더 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">설정</h1>
                    <p className="text-gray-500">시스템 설정을 관리하세요</p>
                </div>
                <button type="button" onClick={handleSettingsUpdate} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    설정 저장
                </button>
            </div>

            {/* 탭 네비게이션 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.name}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* 탭 콘텐츠 */}
            {renderTabContent()}
        </div>
    );
};

export default Settings;
