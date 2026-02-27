const { createClient } = require("@libsql/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, username, password } = req.body || {};

  if (req.method === "POST" && action === "login") {
    try {
      const result = await turso.execute({
        sql: "SELECT * FROM users WHERE username = ?",
        args: [username],
      });
      if (result.rows.length === 0)
        return res.status(401).json({ error: "Username tidak ditemukan" });

      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: "Password salah" });

      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.status(200).json({
        token,
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
        },
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "POST" && action === "register") {
    try {
      const hash = await bcrypt.hash(password, 10);
      await turso.execute({
        sql: "INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)",
        args: [username, hash, username],
      });
      return res.status(201).json({ success: true, message: "User berhasil dibuat" });
    } catch (e) {
      return res.status(400).json({ error: "Username sudah dipakai atau error: " + e.message });
    }
  }

  return res.status(405).json({ error: "Method tidak diizinkan" });
};
