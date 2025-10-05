import React, { useState } from "react";
import axios from "axios";
import { authApi } from "../context/axios";

const ProxyURL = process.env.REACT_APP_SERVER_URL || "http://localhost:4000";

function AddService({ open, onClose, onCreated }) {
    const [jobName, setJobName] = useState("");
    const [pipelineScript, setPipelineScript] = useState(
        `pipeline {
    agent any
  
    parameters {
        choice(
        name: 'ENV',
        choices: ['dev', 'stage', 'prod'],
        description: '배포 대상'
    )
  }

  stages {
    stage('hello') {
      steps {
        echo "hello 👋  selected ENV = \${params.ENV}"
      }
    }
  }

  post {
    always {
      echo "Pipeline finished: \${currentBuild.currentResult}"
    }
  }
}`
    );
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    if (!open) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg("");

        const name = jobName.trim().toLowerCase().replace(/\s+/g, "-");
        if (!name) {
            setErrorMsg("잡 이름을 입력하세요.");
            return;
        }
        if (!pipelineScript.trim()) {
            setErrorMsg("파이프라인 스크립트를 입력하세요.");
            return;
        }

        // ENV choice 파라미터는 고정으로 전송
        const payload = {
            jobName: name,
            pipelineScript,
            parameters: [{ type: "choice", name: "ENV", description: "배포 대상", choices: ["dev", "stage", "prod"] }],
        };

        try {
            setLoading(true);
            const res = await authApi.post(`/jobCreate/jobs`, payload, {
                headers: { "Content-Type": "application/json" },
                validateStatus: (s) => s >= 200 && s < 500,
            });

            if (res.status >= 200 && res.status < 300) {
                onCreated?.(res.data);
                onClose?.();
            } else {
                setErrorMsg(res.data?.error || "생성에 실패했습니다.");
            }
        } catch (err) {
            setErrorMsg(err?.response?.data?.error || err.message || "네트워크 오류");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4">
            <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-5 py-3">
                    <h3 className="text-lg font-semibold">서비스 추가</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
                    {/* 잡 이름 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">젠킨스 잡 이름</label>
                        <input type="text" placeholder="ex) shopping-service" value={jobName} onChange={(e) => setJobName(e.target.value)} className="w-full rounded border px-3 py-2" />
                        <p className="mt-1 text-xs text-gray-500">
                            공백은 자동으로 <code>-</code>로 변환됩니다.
                        </p>
                    </div>

                    {/* 파라미터(읽기 전용 안내) */}
                    <div className="rounded-md bg-blue-50 border border-blue-100 px-4 py-3">
                        <div className="text-sm font-medium text-gray-800 mb-2">파이프라인 매개변수</div>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="inline-flex items-center rounded-full bg-white px-2 py-1 border">
                                <span className="font-semibold mr-1">ENV</span>
                                <span className="text-gray-500">(choice)</span>
                            </span>
                            <span className="text-gray-500">=</span>
                            <div className="flex gap-2">
                                {["dev", "stage", "prod"].map((v) => (
                                    <span key={v} className="rounded-full bg-white border px-2 py-1 text-xs">
                                        {v}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">이 매개변수는 고정이며 수정할 수 없습니다.</div>
                    </div>

                    {/* 파이프라인 스크립트 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">파이프라인 스크립트 (Jenkinsfile)</label>
                        <textarea rows={10} value={pipelineScript} onChange={(e) => setPipelineScript(e.target.value)} className="w-full rounded border px-3 py-2 font-mono text-sm" spellCheck="false" />
                    </div>

                    {errorMsg && <div className="rounded bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">{errorMsg}</div>}

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded border hover:bg-gray-50">
                            취소
                        </button>
                        <button type="submit" disabled={loading} className={`px-4 py-2 rounded text-white ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
                            {loading ? "생성 중..." : "생성"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddService;
