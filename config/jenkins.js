// config/jenkins.js
require("dotenv").config();

const JENKINS_URL = process.env.JENKINS_BASE_URL || "http://localhost:8080";
const AUTH = {
    username: process.env.JENKINS_USER || "ksh",
    password: process.env.JENKINS_TOKEN || "", // API Token
};

module.exports = { JENKINS_URL, AUTH };
