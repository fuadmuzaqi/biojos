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
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const decoded = verifyToken(req);

    if (req.method === "GET") {
      const result = await turso.execute({
        sql: "SELECT id, username, display_name, avatar_url FROM users WHERE id = ?",
        args: [decoded.id],
      });
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === "PUT") {
      const { display_name, avatar_url, username } = req.body;
      await turso.execute({
        sql: "UPDATE users SET display_name = ?, avatar_url = ?, username = ? WHERE id = ?",
        args: [display_name, avatar_url, username, decoded.id],
      });
      return res.status(200).json({ success: true });
    }
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized: " + e.message });
  }
};
