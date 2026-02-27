const { createClient } = require("@libsql/client");

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

module.exports = async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).send("Username required");

  try {
    const userResult = await turso.execute({
      sql: "SELECT id, username, display_name, avatar_url FROM users WHERE username = ?",
      args: [username],
    });
    if (userResult.rows.length === 0)
      return res.status(404).send(notFoundPage());

    const user = userResult.rows[0];
    const linksResult = await turso.execute({
      sql: "SELECT title, url FROM links WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC",
      args: [user.id],
    });

    return res.status(200).send(profilePage(user, linksResult.rows));
  } catch (e) {
    return res.status(500).send("Server error: " + e.message);
  }
};

function profilePage(user, links) {
  const linksHTML = links
    .map(
      (l) => `
    <a href="${l.url}" target="_blank" rel="noopener" class="link-btn">
      <span>${l.title}</span>
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
    </a>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${user.display_name || user.username} | Biojos</title>
  <meta property="og:title" content="${user.display_name || user.username}"/>
  <meta property="og:description" content="Link Bio - ${user.username} | Biojos"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);font-family:'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center;padding:40px 16px 80px}
    .profile{display:flex;flex-direction:column;align-items:center;width:100%;max-width:480px}
    .avatar{width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid #a78bfa;margin-bottom:12px;background:#302b63}
    .avatar-placeholder{width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#a78bfa,#818cf8);display:flex;align-items:center;justify-content:center;font-size:2.5rem;color:#fff;margin-bottom:12px;border:3px solid #a78bfa}
    .display-name{font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:24px;text-align:center}
    .links{width:100%;display:flex;flex-direction:column;gap:12px}
    .link-btn{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:14px;color:#fff;text-decoration:none;font-size:1rem;font-weight:500;transition:all .2s;backdrop-filter:blur(8px)}
    .link-btn:hover{background:rgba(167,139,250,0.25);border-color:#a78bfa;transform:translateY(-2px)}
    .powered{position:fixed;bottom:16px;font-size:.8rem;color:rgba(255,255,255,.45)}
    .powered a{color:#a78bfa;text-decoration:none;font-weight:600}
    .powered a:hover{text-decoration:underline}
  </style>
</head>
<body>
  <div class="profile">
    ${
      user.avatar_url
        ? `<img src="${user.avatar_url}" alt="avatar" class="avatar"/>`
        : `<div class="avatar-placeholder">${(user.display_name || user.username).charAt(0).toUpperCase()}</div>`
    }
    <div class="display-name">${user.display_name || user.username}</div>
    <div class="links">${linksHTML || '<p style="color:rgba(255,255,255,.5);text-align:center">Belum ada link</p>'}</div>
  </div>
  <div class="powered">Powered by <a href="/">Biojos</a></div>
</body>
</html>`;
}

function notFoundPage() {
  return `<!DOCTYPE html><html><head><title>404 - Biojos</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f0c29;color:#fff}h1{font-size:2rem}a{color:#a78bfa}</style></head><body><div style="text-align:center"><h1>404</h1><p>Username tidak ditemukan</p><br><a href="/">← Kembali ke Biojos</a></div></body></html>`;
}
