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
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('\u26a0\ufe0f \u4e25\u91cd\u5b89\u5168\u8b66\u544a: \u672a\u8bbe\u7f6e JWT_SECRET \u73af\u5883\u53d8\u91cf\uff01');
  console.error('   \u4f7f\u7528\u4e34\u65f6\u968f\u673a\u5bc6\u94a5\u542f\u52a8\uff08\u91cd\u542f\u540e\u6240\u6709\u767b\u5f55\u5c06\u5931\u6548\uff09');
  process.env.JWT_SECRET = require('crypto').randomBytes(32).toString('hex');
}
const JWT_SECRET_FINAL = process.env.JWT_SECRET;
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

  // v1.2.0 workout schema migration. CREATE IF NOT EXISTS keeps existing data intact.
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS workout_records (
      id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      duration INTEGER NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT '',
      estimated_calories INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (id, user_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS workout_exercises (
      id TEXT NOT NULL,
      workout_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      exercise_id TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      body_part TEXT NOT NULL,
      rest_between_sets INTEGER NOT NULL DEFAULT 90,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (id, user_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS workout_sets (
      id TEXT NOT NULL,
      workout_exercise_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      set_number INTEGER NOT NULL,
      weight REAL NOT NULL DEFAULT 0,
      reps INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at INTEGER,
      PRIMARY KEY (id, user_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS custom_exercises (
      id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      body_part TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      is_custom INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (id, user_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_workout_records_user_date ON workout_records(user_id, date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(user_id, workout_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(user_id, workout_exercise_id)');
  db.run('INSERT OR IGNORE INTO schema_migrations (version) VALUES (2)');

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
      callback(new Error('CORS: origin ' + origin + ' not allowed'), false)
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
    const { records, customFoods, targets, workouts, customExercises } = req.body;

    // \u4f7f\u7528\u4e8b\u52a1\u4fdd\u62a4\u6570\u636e\u5b8c\u6574\u6027
    db.run("BEGIN");
    try {
      // \u5220\u9664\u65e7\u6570\u636e
      db.run("DELETE FROM food_records WHERE user_id = ?", [userId]);
      db.run("DELETE FROM custom_foods WHERE user_id = ?", [userId]);
      if (Array.isArray(workouts)) {
        db.run("DELETE FROM workout_sets WHERE user_id = ?", [userId]);
        db.run("DELETE FROM workout_exercises WHERE user_id = ?", [userId]);
        db.run("DELETE FROM workout_records WHERE user_id = ?", [userId]);
      }
      if (Array.isArray(customExercises)) {
        db.run("DELETE FROM custom_exercises WHERE user_id = ?", [userId]);
      }

      // \u63d2\u5165\u996e\u98df\u8bb0\u5f55
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

      // \u63d2\u5165\u81ea\u5b9a\u4e49\u98df\u7269
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

      // \u66f4\u65b0\u76ee\u6807
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

      if (Array.isArray(workouts)) {
        const insertWorkout = db.prepare(`
          INSERT INTO workout_records (id, user_id, date, started_at, ended_at, duration, note, estimated_calories)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertExercise = db.prepare(`
          INSERT INTO workout_exercises (id, workout_id, user_id, exercise_id, exercise_name, body_part, rest_between_sets, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertSet = db.prepare(`
          INSERT INTO workout_sets (id, workout_exercise_id, user_id, set_number, weight, reps, completed, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        workouts.forEach((workout, workoutIndex) => {
          const workoutId = String(workout.id || `workout_${workoutIndex}`);
          insertWorkout.run([
            workoutId, userId, workout.date || '', workout.startedAt || 0,
            workout.endedAt == null ? null : workout.endedAt,
            workout.duration || 0, workout.note || '', workout.estimatedCalories || 0,
          ]);
          (workout.exercises || []).forEach((exercise, exerciseIndex) => {
            const instanceId = String(exercise.id || `${workoutId}_exercise_${exerciseIndex}`);
            insertExercise.run([
              instanceId, workoutId, userId, exercise.exerciseId || '',
              exercise.exerciseName || exercise.name || '', exercise.bodyPart || '其他',
              exercise.restBetweenSets || 90, exercise.order == null ? exerciseIndex : exercise.order,
            ]);
            (exercise.sets || []).forEach((set, setIndex) => {
              insertSet.run([
                String(set.id || `${instanceId}_set_${setIndex}`), instanceId, userId,
                set.setNumber || setIndex + 1, set.weight || 0, set.reps || 0,
                set.completed ? 1 : 0, set.completedAt == null ? null : set.completedAt,
              ]);
            });
          });
        });
        insertWorkout.free();
        insertExercise.free();
        insertSet.free();
      }

      if (Array.isArray(customExercises)) {
        const insertCustomExercise = db.prepare(`
          INSERT INTO custom_exercises (id, user_id, name, body_part, note, is_custom)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        customExercises.forEach(exercise => {
          insertCustomExercise.run([
            exercise.id, userId, exercise.name || '', exercise.bodyPart || '其他',
            exercise.note || '', exercise.isCustom === false ? 0 : 1,
          ]);
        });
        insertCustomExercise.free();
      }

      db.run("COMMIT");
    } catch (innerErr) {
      db.run("ROLLBACK");
      throw innerErr;
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

    // 获取训练记录及其动作、组明细
    const workouts = [];
    const workoutMap = new Map();
    const workoutStmt = db.prepare(`
      SELECT id, date, started_at, ended_at, duration, note, estimated_calories
      FROM workout_records WHERE user_id = ? ORDER BY started_at DESC
    `);
    workoutStmt.bind([userId]);
    while (workoutStmt.step()) {
      const [id, date, startedAt, endedAt, duration, note, estimatedCalories] = workoutStmt.get();
      const workout = {
        id, date, startedAt, endedAt, duration,
        note: note || '', estimatedCalories, exercises: [],
      };
      workouts.push(workout);
      workoutMap.set(id, workout);
    }
    workoutStmt.free();

    const workoutExerciseMap = new Map();
    const exerciseStmt = db.prepare(`
      SELECT id, workout_id, exercise_id, exercise_name, body_part, rest_between_sets, sort_order
      FROM workout_exercises WHERE user_id = ? ORDER BY workout_id, sort_order
    `);
    exerciseStmt.bind([userId]);
    while (exerciseStmt.step()) {
      const [id, workoutId, exerciseId, exerciseName, bodyPart, restBetweenSets, order] = exerciseStmt.get();
      const exercise = {
        id, exerciseId, exerciseName, bodyPart,
        restBetweenSets, order, sets: [],
      };
      const workout = workoutMap.get(workoutId);
      if (workout) workout.exercises.push(exercise);
      workoutExerciseMap.set(id, exercise);
    }
    exerciseStmt.free();

    const setStmt = db.prepare(`
      SELECT id, workout_exercise_id, set_number, weight, reps, completed, completed_at
      FROM workout_sets WHERE user_id = ? ORDER BY workout_exercise_id, set_number
    `);
    setStmt.bind([userId]);
    while (setStmt.step()) {
      const [id, workoutExerciseId, setNumber, weight, reps, completed, completedAt] = setStmt.get();
      const exercise = workoutExerciseMap.get(workoutExerciseId);
      if (exercise) {
        exercise.sets.push({
          id, setNumber, weight, reps,
          completed: Boolean(completed), completedAt,
        });
      }
    }
    setStmt.free();

    const customExerciseStmt = db.prepare(`
      SELECT id, name, body_part, note, is_custom
      FROM custom_exercises WHERE user_id = ? ORDER BY name
    `);
    customExerciseStmt.bind([userId]);
    const customExercises = [];
    while (customExerciseStmt.step()) {
      const [id, name, bodyPart, note, isCustom] = customExerciseStmt.get();
      customExercises.push({ id, name, bodyPart, note: note || '', isCustom: Boolean(isCustom) });
    }
    customExerciseStmt.free();

    res.json({ records, customFoods, targets, workoutSchemaVersion: 1, workouts, customExercises });
  } catch (e) {
    res.status(500).json({ error: '下载失败: ' + e.message });
  }
});

// ===== 先初始化数据库，再启动服务器 =====
async function startServer() {
  try {
    await initDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🎉 营养追踪服务器启动成功！`);
      console.log(`   http://localhost:${PORT}`);
      console.log(`   API: http://localhost:${PORT}/api/health`);
    });
  } catch (e) {
    console.error('💬 数据库初始化失败:', e.message);
    process.exit(1);
  }
}

startServer();
