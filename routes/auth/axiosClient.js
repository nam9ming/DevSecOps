// utils/axiosClient.js
import axios from "axios";

// 방법 A: auth 옵션 사용 (자동 Basic Auth 헤더 추가)
const apiClient = axios.create({
    baseURL: "https://api.example.com",
    auth: {
        username: process.env.JENKINS_USER,
        password: process.env.JENKINS_TOKEN,
    },
});
