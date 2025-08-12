const express = require("express");
const router = express.Router();
const axios = require('axios');

const JenkinsConfig = require('../config/jenkins');

const { JENKINS_URL, AUTH } = JenkinsConfig;

router.get('/config', getConfigXml = async (req, res) => {
    const jobName = req.query.job;
    try {
        const xml = await axios.get(`${JENKINS_URL}/job/${jobName}/config.xml`, {
        auth: AUTH,
        headers: { Accept: 'application/xml' }
        });
        res.send(xml.data);
    } catch (err) {
        res.status(500).send('Jenkins  요청 실패');
    }
    }
);
router.post('/config', saveConfigXml = async (req, res) => {
    const jobName = req.query.job;
    const xmlData = req.body;
    try {
        const crumbRes = await axios.get(`${JENKINS_URL}/crumbIssuer/api/json`, { auth: AUTH });
        const crumb = crumbRes.data.crumb;
        const crumbField = crumbRes.data.crumbRequestField;
        
        await axios.post(`${JENKINS_URL}/job/${jobName}/config.xml`, xmlData, {
            auth: AUTH,
            headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            [crumbField]: crumb
            }
        });
        res.send('Jenkins config 저장 성공');
    } catch (err) {
        res.status(500).send('Jenkins 저장 실패: ' + err.message);
    }
    }
);

module.exports = router;
