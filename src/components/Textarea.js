import { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { authApi } from "../context/axios.js";

const ProxyURL = process.env.REACT_APP_SERVER_URL || 'http://localhost:4000';

const Textarea = ({ jobName }) => {
  const [code, setCode] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [result, setResult] = useState({ status: '', message: '' });
  const editorRef = useRef(null);

  useEffect(() => {
    if (!jobName) return;
    fetchPipelineScript(jobName);
  }, [jobName]);

  // 해당 job의 Pipeline Script를 받아옴
  const fetchPipelineScript = async (JobName) => {
    try {
      const response = await authApi.get(`${ProxyURL}/api/pipeline/config`, {
        params: { jobName: JobName },
      });

      const xmlParser = new DOMParser();
      const xmlDoc = xmlParser.parseFromString(response.data, 'text/xml');
      const scriptTag = xmlDoc.getElementsByTagName('script')[0];

      if (scriptTag) {
        const fetched = (scriptTag.textContent || '').trim();
        setCode(fetched);         // ← 에디터에 반영
      } else {
        console.warn('스크립트 태그를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('Jenkins 파이프라인 불러오기 실패:', error);
    }
  };

  // 작성한 Pipeline Script를 저장
  const savePipelineScript = async (JobName, newCode) => {
    try {
      // 1. 기존 config 가져오기
      const getRes = await authApi.get(`${ProxyURL}/api/pipeline/config`, {
        params: { jobName: JobName },
      });
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(getRes.data, 'text/xml');

      // 2. script 태그 내용 교체
      const scriptNode = xmlDoc.getElementsByTagName('script')[0];
      if (!scriptNode) throw new Error('<script> 태그를 찾지 못했습니다.');
      scriptNode.textContent = newCode;

      // 3. 문자열로 변환
      const serializer = new XMLSerializer();
      let updatedXML = serializer.serializeToString(xmlDoc);
      console.log('💾 전송할 XML:', updatedXML);

      // 4. Jenkins로 저장 요청
      await authApi.post(`${ProxyURL}/api/pipeline/config`, updatedXML, {
        params: { jobName: JobName },
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      });
      setResult({ status: 'success', message: 'Saved' });
    } catch (error) {
      console.error('저장 실패:', error);
      setResult({ status: 'error', message: 'Failed, ' + error.message });
    }
  };

  const handleSaveClick = useCallback(() => {
    setIsEditing(false);
    savePipelineScript(jobName, code);
  }, [jobName, code]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    fetchPipelineScript(jobName);   // ← 서버 상태도 재확인
  }, [jobName]);

  return (
    <div className="space-y-3">
      {/* 에디터 영역 */}
      <div className="relative border border-gray-300 rounded-md overflow-hidden text-sm font-mono h-[400px]">
        <Editor
          height="100%"
          value={code}
          onChange={(v) => setCode(v ?? '')}
          language="java" // Groovy 플러그인 없으면 java로 하이라이트
          // theme="vs-dark"
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            // Ctrl/Cmd + S → 저장 (편집중일 때만)
            editor.addCommand(
              monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
              () => {
                if (isEditing) handleSaveClick();
              }
            );
          }}
          options={{
            readOnly: !isEditing, // 편집 중이 아니면 잠금
            tabSize: 4,
            insertSpaces: true,
            automaticLayout: true,
            minimap: { enabled: false },
            wordWrap: 'off',
            scrollBeyondLastLine: false,
            renderWhitespace: 'boundary',
            renderLineHighlight: isEditing ? 'all' : 'none',
            occurrencesHighlight: isEditing,
            selectionHighlight: isEditing,
            contextmenu: true,
          }}
        />
      </div>

      {/* 하단 버튼 */}
      <div className="flex items-center gap-2">
        {/* Edit / Cancel 버튼 */}
        <button
          onClick={() => (isEditing ? handleCancel() : setIsEditing(true))}
          className={`px-4 py-2 rounded ${
            isEditing
              ? 'bg-red-500 text-white hover:bg-red-600'   // Cancel
              : 'bg-gray-500 text-white hover:bg-gray-600' // Edit
          }`}
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>

        {/* Save 버튼 */}
        <button
          onClick={() => {
            setIsEditing(false);
            savePipelineScript(jobName, code);
          }}
          disabled={!isEditing}
          className={`px-4 py-2 rounded ${
            isEditing
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Save
        </button>

        {/* 상태 메시지 */}
        <div
          role="alert"
          className={`${
            result.status === 'success'
              ? 'text-green-600'
              : result.status === 'error'
              ? 'text-red-600'
              : ''
          }`}
        >
          {result.message}
        </div>
      </div>
    </div>
  );
};

export default Textarea;