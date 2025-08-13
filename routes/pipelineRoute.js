// routes/pipelineRoute.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { JENKINS_URL, AUTH } = require('../config/jenkins');

// axios instance
const jx = axios.create({ baseURL: JENKINS_URL, auth: AUTH, timeout: 10000 });

// color → status 매핑 (프런트 뱃지 표시용)
const mapStatus = (color = '') => {
  const c = String(color).toLowerCase();
  if (c.includes('anime')) return 'Building';
  if (c.startsWith('blue')) return 'Success';
  if (c.startsWith('red')) return 'Failed';
  if (c.startsWith('yellow')) return 'Unstable';
  if (c.startsWith('aborted')) return 'Aborted';
  if (c.startsWith('disabled') || c.startsWith('grey')) return 'Disabled';
  if (c.startsWith('notbuilt') || c === 'notbuilt') return 'NotBuilt';
  return 'Pending';
};

// env 토큰 추출(-dev/-stage/-prod)
const pickEnv = (name) => {
  const m = name.match(/-(dev|stage|prod)$/i);
  return m ? m[1].toLowerCase().replace('stg', 'stage') : null;
};

/** ---------- 신규/추천 라우트 ---------- **/

// Job 목록 요약(서비스 단위, env별 상태)
router.get('/jobcatalog', async (req, res) => {
  try {
    const { data } = await jx.get('/api/json', { params: { tree: 'jobs[name,color]' } });
    const serviceMap = {};
    for (const j of data.jobs ?? []) {
      const env = pickEnv(j.name);
      if (!env) continue;
      const service = j.name.replace(/-(dev|stage|prod)$/i, '');
      if (!serviceMap[service]) {
        serviceMap[service] = {
          name: service.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          statuses: {},
        };
      }
      serviceMap[service].statuses[env] = mapStatus(j.color);
    }
    res.json(Object.values(serviceMap));
  } catch (err) {
    console.error('💥 jobcatalog 실패:', err.message);
    res.status(500).json({ error: 'Jenkins 목록 조회 실패' });
  }
});

// 특정 잡의 실행 이력
router.get('/:jobName/executions', async (req, res) => {
  try {
    const { jobName } = req.params;
    const { data } = await jx.get(`/job/${encodeURIComponent(jobName)}/api/json`, {
      params: { tree: 'builds[number,result,timestamp,duration]' },
    });
    res.json({ executions: data.builds || [] });
  } catch (err) {
    console.error('🔴 executions 실패:', err.message);
    res.status(500).json({ error: '실행 이력 조회 실패' });
  }
});

// 특정 실행 상세 + 파이프라인(stage) 정보
router.get('/:jobName/build/:execId', async (req, res) => {
  try {
    const { jobName, execId } = req.params;
    const [buildRes, wfapiRes] = await Promise.all([
      jx.get(`/job/${encodeURIComponent(jobName)}/${execId}/api/json`),
      jx.get(`/job/${encodeURIComponent(jobName)}/${execId}/wfapi/describe`),
    ]);
    const buildInfo = buildRes.data || {};
    const stageInfo = wfapiRes.data || {};
    res.json({
      ...buildInfo,
      stages: stageInfo.stages || [],
      pipelineStatus: stageInfo.status || buildInfo.result,
    });
  } catch (err) {
    console.error('🔴 build 상세 실패:', err.message);
    res.status(500).json({ error: '빌드 상세 조회 실패' });
  }
});

// config.xml 읽기/저장
router.get('/config', async (req, res) => {
  try {
    const jobName = req.query.job;
    if (!jobName) return res.status(400).send('job 파라미터 필요');
    const xml = await jx.get(`/job/${encodeURIComponent(jobName)}/config.xml`, {
      headers: { Accept: 'application/xml' },
    });
    res.send(xml.data);
  } catch (err) {
    res.status(404).send('Jenkins config 조회 실패: ' + err.message);
  }
});

router.post('/config', async (req, res) => {
  try {
    const jobName = req.query.job;
    if (!jobName) return res.status(400).send('job 파라미터 필요');

    // crumb (CSRF) 처리
    let crumbHeaders = {};
    try {
      const { data } = await jx.get('/crumbIssuer/api/json');
      crumbHeaders = { [data.crumbRequestField]: data.crumb };
    } catch (_) {}

    await jx.post(`/job/${encodeURIComponent(jobName)}/config.xml`, req.body, {
      headers: { 'Content-Type': 'application/xml', ...crumbHeaders },
    });
    res.send('Jenkins config 저장 성공');
  } catch (err) {
    res.status(500).send('Jenkins config 저장 실패: ' + err.message);
  }
});

/** ---------- 레거시 호환 라우트(기존 프런트 유지용) ---------- **/

// 기존: GET /api/jenkins/services  (현재 구현과 결과 포맷 동일)
router.get('/services', async (_req, res) => {
  try {
    const { data } = await jx.get('/api/json', { params: { tree: 'jobs[name,color]' } });
    const services = (data.jobs || []).map(j => ({ name: j.name, status: j.color }));
    res.json({ services });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
