const { createClient } = require("@libsql/client");
const jwt = require("jsonwebtoken");

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

function verifyToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const decoded = verifyToken(req);

    if (req.method === "GET") {
      const result = await turso.execute({
        sql: "SELECT * FROM links WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC",
        args: [decoded.id],
      });
      return res.status(200).json(result.rows);
    }

    if (req.method === "POST") {
      const { title, url } = req.body;
      // Ambil sort_order tertinggi + 1
      const maxResult = await turso.execute({
        sql: "SELECT MAX(sort_order) as max_order FROM links WHERE user_id = ?",
        args: [decoded.id],
      });
      const nextOrder = (maxResult.rows[0].max_order || 0) + 1;
      await turso.execute({
        sql: "INSERT INTO links (user_id, title, url, sort_order) VALUES (?, ?, ?, ?)",
        args: [decoded.id, title, url, nextOrder],
      });
      return res.status(201).json({ success: true });
    }

    if (req.method === "PUT") {
      const { id, title, url } = req.body;
      await turso.execute({
        sql: "UPDATE links SET title = ?, url = ? WHERE id = ? AND user_id = ?",
        args: [title, url, id, decoded.id],
      });
      return res.status(200).json({ success: true });
    }

    // PATCH = update urutan (reorder)
    if (req.method === "PATCH") {
      const { ordered_ids } = req.body;
      // ordered_ids = array of id sesuai urutan baru, contoh: [3, 1, 5, 2]
      if (!Array.isArray(ordered_ids)) {
        return res.status(400).json({ error: "ordered_ids harus array" });
      }
      // Update sort_order satu per satu dalam batch
      const statements = ordered_ids.map((id, index) => ({
        sql: "UPDATE links SET sort_order = ? WHERE id = ? AND user_id = ?",
        args: [index, id, decoded.id],
      }));
      await turso.batch(statements);
      return res.status(200).json({ success: true });
    }

    if (req.method === "DELETE") {
      const { id } = req.body;
      await turso.execute({
        sql: "DELETE FROM links WHERE id = ? AND user_id = ?",
        args: [id, decoded.id],
      });
      return res.status(200).json({ success: true });
    }

  } catch (e) {
    return res.status(401).json({ error: "Unauthorized: " + e.message });
  }
};
