export const Config = {
  // ═══ Backend API URL ═══
  apiUrl: "http://localhost:8080",

  // ═══ API Key สำหรับยืนยัน request จาก Frontend ═══
  // ใช้ส่งใน header "x-api-key" ทุก request
  // ต้องตั้งค่าเดียวกันใน Backend (application.properties)
  apiKey: "bk_live_7f3a9c2e1d4b8f6a0e5c3d9b2a7f1e4d",

  // ═══ ชื่อ key สำหรับเก็บ JWT token ใน localStorage ═══
  tokenKey: "token_mybakery",

  // ═══ ชื่อ key สำหรับเก็บ user data ใน localStorage ═══
  userKey: "user_mybakery",

  // ═══ ชื่อ key สำหรับเก็บ userType ใน localStorage ═══
  userTypeKey: "userType_mybakery",
};