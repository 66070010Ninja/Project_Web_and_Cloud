// ==========================
// config/swagger.js
// ตั้งค่า Swagger + OpenAPI สำหรับ Express MVC
// ==========================

// --------------------------
// 1️⃣ Import Dependencies
// --------------------------
const swaggerUi = require('swagger-ui-express'); // ใช้แสดงหน้า UI ของเอกสาร API
const swaggerJsdoc = require('swagger-jsdoc');   // สร้างเอกสาร OpenAPI จาก JSDoc comment

// --------------------------
// 2️⃣ Swagger Configuration Options
// --------------------------
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '🎮 Game Management API',
      version: '1.0.0',
      description: `
📘 **Game Management System API Documentation**

เอกสารนี้รวบรวม API ทั้งหมดของระบบ เช่น:
- ระบบผู้ใช้ (User)
- ระบบแอดมิน (Admin)
- ระบบจัดการเกม (Game CRUD)
      `,
      contact: {
        name: 'Developer Team',
        email: 'support@example.com',
      },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local Development Server' },
      { url: 'https://api.yourdomain.com', description: 'Production Server' }
    ],

    // --------------------------
    // 2.1 Security & Auth
    // --------------------------
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'ใช้ session จาก cookie หลัง login',
        },
      },

      // --------------------------
      // 2.2 Schemas / Models
      // --------------------------
      schemas: {
        // 🧍 User Schema
        User: {
          type: 'object',
          properties: {
            User_id: { type: 'integer', example: 1 },
            User_Name: { type: 'string', example: 'JohnDoe' },
            Email: { type: 'string', example: 'john@example.com' },
            Roles: { type: 'string', example: 'user' },
            Profile_Image_Path: { type: 'string', example: '/user/img/john.png' },
          },
        },

        // 🎮 Game Schema
        Game: {
          type: 'object',
          properties: {
            Game_id: { type: 'integer', example: 101 },
            Game_Title: { type: 'string', example: 'Elden Ring' },
            Game_Description: { type: 'string', example: 'Open world action RPG.' },
            Genre: { type: 'string', example: 'Action RPG' },
            Developer: { type: 'string', example: 'FromSoftware' },
            Release_Date: { type: 'string', example: '2022-02-25' },
            Game_Image_Path: { type: 'string', example: '/game/img/elden_ring.jpg' },
          },
        },

        // 👑 Admin Schema
        Admin: {
          type: 'object',
          properties: {
            Admin_id: { type: 'integer', example: 1 },
            Admin_Name: { type: 'string', example: 'SuperAdmin' },
            Email: { type: 'string', example: 'admin@example.com' },
            Role: { type: 'string', example: 'admin' },
          },
        },

        // 📝 Review Schema
        Review: {
          type: 'object',
          properties: {
            Review_id: { type: 'integer', example: 1 },
            Game_id: { type: 'integer', example: 101 },
            User_id: { type: 'integer', example: 1 },
            Comment: { type: 'string', example: 'เกมสนุกมาก!' },
            Created_At: { type: 'string', format: 'date-time', example: '2025-10-15T12:00:00Z' },
          },
        },

        // 🏷️ Tags Schema
        Tags: {
          type: 'object',
          properties: {
            Game_id: { type: 'integer', example: 101 },
            Action: { type: 'integer', example: 1 },
            Adventure: { type: 'integer', example: 0 },
            Card_Game: { type: 'integer', example: 0 },
            Educational: { type: 'integer', example: 0 },
            Fighting: { type: 'integer', example: 0 },
            Interactive_Fiction: { type: 'integer', example: 0 },
            Puzzle: { type: 'integer', example: 0 },
            Racing: { type: 'integer', example: 0 },
            Other: { type: 'integer', example: 0 },
          },
        },

        // 🖼️ User Image Schema
        UserImage: {
          type: 'object',
          properties: {
            User_Image_id: { type: 'integer', example: 1 },
            Path: { type: 'string', example: '/user/img/john.png' },
            User_id: { type: 'integer', example: 1 },
          },
        },

        // 🖼️ Game Image Schema
        GameImage: {
          type: 'object',
          properties: {
            Game_Image_id: { type: 'integer', example: 1 },
            Path: { type: 'string', example: '/game/img/game1.jpg' },
            Game_id: { type: 'integer', example: 101 },
          },
        },
      },
    },

    // ใช้ sessionAuth เป็น security สำหรับ endpoint ที่ต้องล็อกอิน
    security: [{ sessionAuth: [] }],
  },

  // --------------------------
  // 2.3 APIs to Scan for JSDoc
  // --------------------------
  apis: ['./routes/**/*.js'], // Scan routes ทั้งหมด
};

// --------------------------
// 3️⃣ Generate Swagger Spec
// --------------------------
const swaggerSpec = swaggerJsdoc(options);

// --------------------------
// 4️⃣ Export Setup Function
// --------------------------
module.exports = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('📄 Swagger Docs available at: http://localhost:3000/api-docs');
};
