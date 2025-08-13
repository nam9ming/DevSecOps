// routes/deploymentRoute.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { JENKINS_URL, AUTH } = require('../config/jenkins');

const jx = axios.create({ baseURL: JENKINS_URL, auth: AUTH, timeout: 10000 });

// crumb 얻기(미사용 환경 대비)
const getCrumb = async () => {
  try {
    const { data } = await jx.get('/crumbIssuer/api/json');
    return { [data.crumbRequestField]: data.crumb };
  } catch {
    return {};
  }
};

// 빌드(배포) 트리거
router.post('/deployments', async (req, res) => {
  try {
    const { jobName, params } = req.body;
    if (!jobName) return res.status(400).json({ error: 'jobName이 필요합니다.' });

    const crumb = await getCrumb();
    const isParam = params && Object.keys(params).length > 0;
    const path = isParam ? `/job/${encodeURIComponent(jobName)}/buildWithParameters`
                         : `/job/${encodeURIComponent(jobName)}/build`;

    const resp = await jx.post(path, null, { params: params || {}, headers: { ...crumb } });
    const queueUrl = resp.headers?.location || null;  // Jenkins 201/302 Location
    res.json({ message: '빌드 요청됨', jobName, queueUrl });
  } catch (err) {
    console.error('❌ 배포 요청 실패:', err.message);
    res.status(500).json({ error: '배포 요청 실패' });
  }
});

// 마지막 배포시간 조회
router.get('/lastdeploy', async (req, res) => {
  try {
    const jobName = req.query.service;
    const kind = (req.query.kind || 'lastCompletedBuild').toString(); // or lastSuccessfulBuild
    if (!jobName) return res.json({ lastDeploy: null });

    const { data } = await jx.get(`/job/${encodeURIComponent(jobName)}/${kind}/api/json`);
    if (!data?.timestamp) return res.json({ lastDeploy: null });

    const date = new Date(data.timestamp);
    const formatted = date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    res.json({ lastDeploy: formatted, buildNumber: data.number, result: data.result || 'UNKNOWN' });
  } catch (err) {
    if (err.response?.status === 404) return res.json({ lastDeploy: null });
    console.error('🔴 lastdeploy 실패:', err.message);
    res.status(500).json({ error: '배포 시간 조회 실패' });
  }
});

module.exports = router;
