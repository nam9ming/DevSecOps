import React, { useState } from 'react';

function ConfigView() {
  const [jenkinsUrl, setJenkinsUrl] = useState('');
  const [jenkinsToken, setJenkinsToken] = useState('');
  const [gitUrl, setGitUrl] = useState('');
  const [gitToken, setGitToken] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('설정 정보:', { jenkinsUrl, jenkinsToken, gitUrl, gitToken });
    // TODO: axios로 백엔드로 전송
  };

  return (
    <div>
      <h2>환경 설정</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Jenkins URL:</label>
          <input
            type="text"
            value={jenkinsUrl}
            onChange={(e) => setJenkinsUrl(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Jenkins Token:</label>
          <input
            type="password"
            value={jenkinsToken}
            onChange={(e) => setJenkinsToken(e.target.value)}
            required
          />
        </div>
        <div>
          <label>GitLab Repository URL:</label>
          <input
            type="text"
            value={gitUrl}
            onChange={(e) => setGitUrl(e.target.value)}
            required
          />
        </div>
        <div>
          <label>GitLab Access Token:</label>
          <input
            type="password"
            value={gitToken}
            onChange={(e) => setGitToken(e.target.value)}
            required
          />
        </div>
        <button type="submit">저장</button>
      </form>
    </div>
  );
}

export default ConfigView;
