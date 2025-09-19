// src/components/PipelineEditor.jsx
import React, { useState, useRef } from "react";
import { useEffect } from "react";
import axios from "axios";

export default function PipelineEditor(props) {
    const [mode, setMode] = useState("default");
    const [isEditing, setIsEditing] = useState(false);
    const [code, setCode] = useState(`pipeline {
    agent any
    stages {
        stage('Clone Repository') {
            steps {
                echo 'hello world!'
            }
        }
    }
}`);
    const codeRef = useRef(null);

    const jobName = props?.jobName ?? "default";
    let xmlParser = new DOMParser(); //DOM파서 객체를 생성

    useEffect(() => {
        console.log("jobName:", jobName);
        axios
            .get("http://localhost:4000/api/pipeline/config", {
                params: { jobName: jobName },
            })
            .then((res) => {
                let xmldoc = xmlParser.parseFromString(res.data, "application/xml");
                let value = xmldoc.getElementsByTagName("script")[0].childNodes[0].nodeValue;
                setCode(value);
                console.log("파이프라인 설정:", value);
                // TODO: setState 등으로 상태 저장
            })
            .catch((err) => {
                console.error("파이프라인 설정 조회 실패:", err);
            });
    }, [jobName]);

    const toggleEdit = () => {
        setIsEditing((s) => !s);
        setTimeout(() => codeRef.current && codeRef.current.focus(), 50);
    };

    const save = () => {
        // 실제 서버 저장이 필요하면 fetch/axios 호출 추가
        setIsEditing(false);
    };

    const lines = code.split("\n");
    const lineCount = Math.max(10, lines.length);
    const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

    return (
        <div className="bg-white rounded-lg shadow-md border p-4">
            <div className="flex items-center gap-3 mb-4">
                <label className="text-sm text-gray-600">모드 선택:</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)} className="border rounded px-3 py-1 text-sm bg-gray-50">
                    <option value="default">default</option>
                    <option value="dev">dev</option>
                    <option value="prod">prod</option>
                </select>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <div className="flex bg-white">
                    {/* 좌측 줄번호 */}
                    <div className="bg-gray-50 text-gray-400 text-xs select-none py-4 px-3 border-r" style={{ width: 64 }}>
                        <div className="font-mono">
                            {lineNumbers.map((n) => (
                                <div key={n} className="h-5 leading-5">
                                    {n}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 코드 */}
                    <div className="flex-1 p-4">
                        {!isEditing && (
                            <pre className="whitespace-pre-wrap break-words font-mono text-sm text-gray-800" style={{ minHeight: 220 }}>
                                {code}
                            </pre>
                        )}

                        {isEditing && <textarea ref={codeRef} value={code} onChange={(e) => setCode(e.target.value)} className="w-full h-56 resize-none font-mono text-sm border rounded p-3 outline-none" />}
                    </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 border-t">
                    <button onClick={toggleEdit} className="px-4 py-2 rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-800 text-sm">
                        {isEditing ? "Cancel" : "Edit"}
                    </button>

                    <button onClick={save} disabled={!isEditing} className={`px-4 py-2 rounded-md text-sm ${isEditing ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                        Save
                    </button>
                </div>
            </div>

            <p className="text-xs text-gray-500 mt-3">편집 모드에서 코드를 수정한 뒤 Save를 누르면 로컬 상태에 반영됩니다.</p>
        </div>
    );
}
