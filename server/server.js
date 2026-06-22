/* ============================================================
   营养追踪 — 后端服务器
   Node.js + Express + SQLite (sql.js) + JWT
   ============================================================ */

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// ===== 配置 =====
const JWT_SECRET = process.env.JWT_SECRET || 'nutrition_tracker_secret_key_2024';
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data.db');
const ALLOWED_ORIGINS = [
  'https://Yhz47ow.github.io',
  'http://localhost:8080',
  'http://192.168.1.250:8080',
];

// ===== 数据库初始化 =====
let db;

async function initDB() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS food_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      client_id TEXT NOT NULL,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      food_name TEXT NOT NULL,
      grams REAL NOT NULL,
      calories REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS custom_foods (
      id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      calories_per_100g REAL NOT NULL DEFAULT 0,
      protein_per_100g REAL NOT NULL DEFAULT 0,
      carbs_per_100g REAL NOT NULL DEFAULT 0,
      fat_per_100g REAL NOT NULL DEFAULT 0,
      serving_size REAL NOT NULL DEFAULT 100,
      PRIMARY KEY (id, user_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS targets (
      user_id INTEGER PRIMARY KEY,
      calories REAL NOT NULL DEFAULT 1600,
      carbs REAL NOT NULL DEFAULT 160,
      protein REAL NOT NULL DEFAULT 120,
      fat REAL NOT NULL DEFAULT 44,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  saveDB();
  console.log('✅ 数据库初始化完成');
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// ===== Express 应用 =====
const app = express();
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // 允许所有来源（方便调试）
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ===== JWT 中间件 =====
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '请先登录' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (e) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

// ===== API 路由 =====

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 注册
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: '请填写邮箱和密码' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    // 检查是否已注册
    const existingStmt = db.prepare("SELECT id FROM users WHERE email = ?");
    existingStmt.bind([email]);
    if (existingStmt.step()) {
      existingStmt.free();
      return res.status(400).json({ error: '该邮箱已注册' });
    }
    existingStmt.free();

    const hashedPassword = await bcrypt.hash(password, 10);
    db.run("INSERT INTO users (email, password) VALUES (?, ?)", [email, hashedPassword]);
    saveDB();

    // 获取新用户 ID
    const idStmt = db.prepare("SELECT id FROM users WHERE email = ?");
    idStmt.bind([email]);
    idStmt.step();
    const userId = idStmt.get()[0];
    idStmt.free();

    // 创建默认目标
    db.run("INSERT INTO targets (user_id) VALUES (?)", [userId]);
    saveDB();

    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: userId, email } });
  } catch (e) {
    res.status(500).json({ error: '注册失败: ' + e.message });
  }
});

// 登录
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: '请填写邮箱和密码' });
    }

    const loginStmt = db.prepare("SELECT id, email, password FROM users WHERE email = ?");
    loginStmt.bind([email]);
    if (!loginStmt.step()) {
      loginStmt.free();
      return res.status(400).json({ error: '邮箱或密码错误' });
    }
    const [id, emailDb, hashedPassword] = loginStmt.get();
    loginStmt.free();
    const valid = await bcrypt.compare(password, hashedPassword);
    if (!valid) {
      return res.status(400).json({ error: '邮箱或密码错误' });
    }

    const token = jwt.sign({ userId: id, email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id, email } });
  } catch (e) {
    res.status(500).json({ error: '登录失败: ' + e.message });
  }
});

// 获取用户信息
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ id: req.userId, email: req.userEmail });
});

// 保存全部数据（覆盖式上传）
app.post('/api/sync/upload', authMiddleware, (req, res) => {
  try {
    const userId = req.userId;
    const { records, customFoods, targets } = req.body;

    // 删除旧数据
    db.run("DELETE FROM food_records WHERE user_id = ?", [userId]);
    db.run("DELETE FROM custom_foods WHERE user_id = ?", [userId]);

    // 插入饮食记录
    if (records) {
      const insertStmt = db.prepare(`
        INSERT INTO food_records (user_id, client_id, date, meal_type, food_name, grams, calories, protein, carbs, fat)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      Object.keys(records).forEach(date => {
        ['breakfast', 'lunch', 'dinner', 'snack'].forEach(mt => {
          (records[date][mt] || []).forEach(item => {
            insertStmt.run([
              userId, item.id || '', date, mt, item.foodName || '',
              item.grams || 0, item.calories || 0, item.protein || 0,
              item.carbs || 0, item.fat || 0,
            ]);
          });
        });
      });
      insertStmt.free();
    }

    // 插入自定义食物
    if (customFoods && Array.isArray(customFoods)) {
      const insertCustom = db.prepare(`
        INSERT INTO custom_foods (id, user_id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, serving_size)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      customFoods.forEach(f => {
        insertCustom.run([
          f.id, userId, f.name || '',
          f.caloriesPer100g || 0, f.proteinPer100g || 0,
          f.carbsPer100g || 0, f.fatPer100g || 0,
          f.servingSize || 100,
        ]);
      });
      insertCustom.free();
    }

    // 更新目标
    if (targets) {
      const targetStmt = db.prepare("SELECT user_id FROM targets WHERE user_id = ?");
      targetStmt.bind([userId]);
      if (targetStmt.step()) {
        targetStmt.free();
        db.run("UPDATE targets SET calories=?, carbs=?, protein=?, fat=? WHERE user_id=?", 
          [targets.calories || 1600, targets.carbs || 160, targets.protein || 120, targets.fat || 44, userId]);
      } else {
        targetStmt.free();
        db.run("INSERT INTO targets (user_id, calories, carbs, protein, fat) VALUES (?, ?, ?, ?, ?)",
          [userId, targets.calories || 1600, targets.carbs || 160, targets.protein || 120, targets.fat || 44]);
      }
    }

    saveDB();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '上传失败: ' + e.message });
  }
});

// 下载全部数据
app.get('/api/sync/download', authMiddleware, (req, res) => {
  try {
    const userId = req.userId;

    // 获取饮食记录
    const recordsStmt = db.prepare(`
      SELECT client_id, date, meal_type, food_name, grams, calories, protein, carbs, fat
      FROM food_records WHERE user_id = ?
    `);
    recordsStmt.bind([userId]);
    const records = {};
    while (recordsStmt.step()) {
      const [clientId, date, mealType, foodName, grams, cal, pro, carb, fat] = recordsStmt.get();
      if (!records[date]) records[date] = { breakfast: [], lunch: [], dinner: [], snack: [] };
      records[date][mealType].push({
        id: clientId, foodName, grams, calories: cal,
        protein: pro, carbs: carb, fat, mealType,
      });
    }
    recordsStmt.free();

    // 获取自定义食物
    const customStmt = db.prepare(`
      SELECT id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, serving_size
      FROM custom_foods WHERE user_id = ?
    `);
    customStmt.bind([userId]);
    const customFoods = [];
    while (customStmt.step()) {
      const [id, name, cal, pro, carb, fat, serving] = customStmt.get();
      customFoods.push({
        id, name, caloriesPer100g: cal, proteinPer100g: pro,
        carbsPer100g: carb, fatPer100g: fat, servingSize: serving, source: 'custom',
      });
    }
    customStmt.free();

    // 获取目标
    const targetStmt = db.prepare("SELECT calories, carbs, protein, fat FROM targets WHERE user_id = ?");
    targetStmt.bind([userId]);
    const targets = { calories: 1600, carbs: 160, protein: 120, fat: 44 };
    if (targetStmt.step()) {
      const [cal, carb, pro, fat] = targetStmt.get();
      targets.calories = cal; targets.carbs = carb;
      targets.protein = pro; targets.fat = fat;
    }
    targetStmt.free();

    res.json({ records, customFoods, targets });
  } catch (e) {
    res.status(500).json({ error: '下载失败: ' + e.message });
  }
});

// ===== 启动 =====
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 营养追踪服务器启动成功`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/health`);
});

// 初始化数据库
initDB().catch(e => {
  console.error('❌ 数据库初始化失败:', e.message);
  process.exit(1);
});
