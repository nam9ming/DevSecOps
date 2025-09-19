import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const ProxyURL = process.env.REACT_APP_SERVER_URL || "http://localhost:4000";

// 배포 폼 컴포넌트
const DeploymentForm = ({ target, lastDeploy, lastResult }) => {
    return (
        <div className="border rounded-md p-4 bg-white shadow-sm space-y-4">
            <div className="flex">
                <div className="w-1/4 font-semibold text-gray-700">배포 Target</div>
                <div className="w-3/4">{target}</div>
            </div>
            <div>
                <div className="flex">
                    <div className="w-1/4 font-semibold text-gray-700">마지막 배포일</div>
                    <div className="w-3/4">{lastDeploy}</div>
                </div>
            </div>
            <div>
                <div className="flex">
                    <div className="w-1/4 font-semibold text-gray-700">마지막 배포 결과</div>
                    <div className="w-3/4">{lastResult}</div>
                </div>
            </div>
        </div>
    );
};

// 메인
const DeploymentDetail = () => {
    const navigate = useNavigate();
    const { serviceId, env } = useParams(); // URL에서 서비스명과 환경 추출
    // 현재 활성화된 탭
    const [activeTab, setActiveTab] = useState(env || "dev");
    // 마지막 배포 시간
    const [lastDeploy, setLastDeploy] = useState({
        dev: "",
        stage: "",
        prod: "",
    });
    const [lastResult, setLastResult] = useState({
        dev: "UNKNOWN",
        stage: "UNKNOWN",
        prod: "UNKNOWN",
    });
    const serviceName = serviceId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const handleTabClick = (env) => {
        setActiveTab(env);
    };

    const requestDeploy = async (serviceName, target) => {
        const jobName = serviceName.toLowerCase().replace(/\s+/g, "-");
        try {
            const res = await axios.post(`${ProxyURL}/api/deployment/deployments`, {
                jobName,
                params: { ENV: target.toLowerCase() }, // Jenkins에 전달할 파라미터
            });
            if (res.status === 200) {
                alert("배포 요청이 성공적으로 전송되었습니다.");
                const now = new Date().toLocaleString();
                setLastDeploy((prev) => ({
                    ...prev,
                    [target]: now,
                }));
            } else {
                alert("배포 요청에 실패했습니다.");
            }
        } catch (error) {
            console.error("배포 요청 중 오류 발생:", error);
            alert("배포 요청 중 오류가 발생했습니다.");
        }
    };

    // 모든 환경의 마지막 배포 시간 및 배포 결과를 가져옴
    useEffect(() => {
        const load = async () => {
            try {
                const baseJobName = serviceName.toLowerCase().replace(/\s+/g, "-");
                const envs = ["dev", "stage", "prod"];

                // ENV별 최근 배포 시간/결과를 단일 잡에서 필터링
                const reqs = envs.map((e) =>
                    axios.get(`${ProxyURL}/api/deployment/lastdeploy`, {
                        params: { job: baseJobName, env: e },
                    })
                );
                const resps = await Promise.all(reqs);

                const times = {};
                const results = {};
                envs.forEach((e, i) => {
                    const data = resps[i].data || {};
                    times[e] = data.lastDeploy || "배포 이력이 없습니다.";
                    results[e] = (data.result || "UNKNOWN").toUpperCase();
                });

                setLastDeploy(times);
                setLastResult(results);
            } catch (err) {
                console.error("배포 정보 로드 실패:", err);
            }
        };
        load();
    }, [serviceName]);

    return (
        <div className="p-6">
            {/* <button onClick={() => navigate("/deployments")} className="text-blue-500 mb-4">
                ← 뒤로가기
            </button> */}
            {/* <h2 className="text-2xl font-bold mb-4">{serviceName} 배포 관리</h2> */}

            <div className="flex space-x-4 mb-6">
                {["dev", "stage", "prod"].map((env) => (
                    <button key={env} onClick={() => handleTabClick(env)} className={`px-4 py-2 rounded border font-medium ${activeTab === env ? "bg-blue-500 text-white" : "bg-white text-gray-800 hover:bg-gray-100"}`}>
                        {env.toUpperCase()}
                    </button>
                ))}
            </div>

            <DeploymentForm target={activeTab.toUpperCase()} lastDeploy={lastDeploy[activeTab]} lastResult={lastResult[activeTab]} />

            <button className="mt-6 px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600" onClick={() => requestDeploy(serviceName, activeTab)}>
                배포 요청
            </button>
        </div>
    );
};

export default DeploymentDetail;
