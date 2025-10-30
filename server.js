// ==========================
// server.js
// (Express MVC Server + Swagger + Session + Flash)
// ==========================

// --------------------------
// 1️⃣ Import Dependencies
// --------------------------
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const swaggerSetup = require('./config/swagger');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

dotenv.config();
const prisma = new PrismaClient();

// --------------------------
// 2️⃣ App Initialization
// --------------------------
const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0'; // ฟังทุก IP address (จำเป็นสำหรับ EC2)

// --------------------------
// 3️⃣ View Engine Setup (EJS)
// --------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --------------------------
// 4️⃣ Core Middleware
// --------------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // dev mode
}));

app.use(flash());
swaggerSetup(app);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  req.user = req.session.user || null;

  res.locals.errorMessage = req.flash('error');
  res.locals.successMessage = req.flash('success');
  next();
});

// --------------------------
// 5️⃣ Static File Serving
// --------------------------
app.use(express.static('public'));

// --------------------------
// 6️⃣ Route Setup (Main Routing)
// --------------------------
const adminRoute = require('./routes/adminRoutes');
const userRoute  = require('./routes/userRoutes');
const gameRoute  = require('./routes/gameRoutes');
const pageRoute  = require('./routes/pageRoutes');

app.use('/admin', adminRoute);
app.use('/user', userRoute);
app.use('/game', gameRoute);
app.use('/', pageRoute);

// --------------------------
// 7️⃣ Start Server (with Prisma auto-sync)
// --------------------------
async function startServer() {
  try {
    console.log("🔄 Applying Prisma migrations...");
    // ใช้ migrate deploy (เหมาะสำหรับ Production)
    // หรือใช้ db push ถ้าเป็น dev
    execSync('npx prisma db push', { stdio: 'inherit' });

    const server = app.listen(port, host, () => {
      console.log(`✅ Server is running at http://${host}:${port}`);
    });

    server.setTimeout(300000); // เพิ่ม timeout เผื่อ upload ไฟล์ใหญ่
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// เริ่มทำงาน
startServer();
