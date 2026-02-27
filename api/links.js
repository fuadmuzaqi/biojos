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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
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
      await turso.execute({
        sql: "INSERT INTO links (user_id, title, url) VALUES (?, ?, ?)",
        args: [decoded.id, title, url],
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
