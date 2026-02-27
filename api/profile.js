const { createClient } = require("@libsql/client");

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const THEMES = {
  purple: {
    bg: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)",
    accent: "#a78bfa",
    accentHover: "rgba(167,139,250,0.25)",
    avatarBorder: "#a78bfa",
    linkBg: "rgba(255,255,255,0.08)",
    linkBorder: "rgba(255,255,255,0.15)",
    linkHoverBorder: "#a78bfa",
    poweredColor: "#a78bfa",
  },
  ocean: {
    bg: "linear-gradient(135deg,#0f2027,#203a43,#2c5364)",
    accent: "#38bdf8",
    accentHover: "rgba(56,189,248,0.25)",
    avatarBorder: "#38bdf8",
    linkBg: "rgba(255,255,255,0.08)",
    linkBorder: "rgba(255,255,255,0.15)",
    linkHoverBorder: "#38bdf8",
    poweredColor: "#38bdf8",
  },
  sunset: {
    bg: "linear-gradient(135deg,#1a0533,#6b1a3a,#c0392b)",
    accent: "#fb923c",
    accentHover: "rgba(251,146,60,0.25)",
    avatarBorder: "#fb923c",
    linkBg: "rgba(255,255,255,0.08)",
    linkBorder: "rgba(255,255,255,0.15)",
    linkHoverBorder: "#fb923c",
    poweredColor: "#fb923c",
  },
  forest: {
    bg: "linear-gradient(135deg,#0a1628,#0d3b2e,#145a32)",
    accent: "#4ade80",
    accentHover: "rgba(74,222,128,0.25)",
    avatarBorder: "#4ade80",
    linkBg: "rgba(255,255,255,0.08)",
    linkBorder: "rgba(255,255,255,0.15)",
    linkHoverBorder: "#4ade80",
    poweredColor: "#4ade80",
  },
  rose: {
    bg: "linear-gradient(135deg,#1a0a1a,#3d0c2e,#6b1856)",
    accent: "#f472b6",
    accentHover: "rgba(244,114,182,0.25)",
    avatarBorder: "#f472b6",
    linkBg: "rgba(255,255,255,0.08)",
    linkBorder: "rgba(255,255,255,0.15)",
    linkHoverBorder: "#f472b6",
    poweredColor: "#f472b6",
  },
  midnight: {
    bg: "linear-gradient(135deg,#000000,#0d0d0d,#1a1a2e)",
    accent: "#e2e8f0",
    accentHover: "rgba(226,232,240,0.15)",
    avatarBorder: "#e2e8f0",
    linkBg: "rgba(255,255,255,0.06)",
    linkBorder: "rgba(255,255,255,0.1)",
    linkHoverBorder: "#e2e8f0",
    poweredColor: "#94a3b8",
  },
};

module.exports = async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).send("Username required");

  try {
    const userResult = await turso.execute({
      sql: "SELECT id, username, display_name, avatar_url, theme FROM users WHERE username = ?",
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
  const theme = THEMES[user.theme] || THEMES.purple;

  const linksHTML = links
    .map(
      (l) => `
    <a href="${l.url}" target="_blank" rel="noopener" class="link-btn">
      <span>${l.title}</span>
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/>
        <line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
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
    body{
      min-height:100vh;
      background:${theme.bg};
      font-family:'Segoe UI',sans-serif;
      display:flex;
      flex-direction:column;
      align-items:center;
      padding:40px 16px 80px;
    }
    .profile{display:flex;flex-direction:column;align-items:center;width:100%;max-width:480px}
    .avatar{
      width:100px;height:100px;border-radius:50%;object-fit:cover;
      border:3px solid ${theme.avatarBorder};
      margin-bottom:12px;background:rgba(255,255,255,0.1);
    }
    .avatar-placeholder{
      width:100px;height:100px;border-radius:50%;
      background:${theme.accent}33;
      border:3px solid ${theme.avatarBorder};
      display:flex;align-items:center;justify-content:center;
      font-size:2.5rem;color:#fff;margin-bottom:12px;
    }
    .display-name{font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:24px;text-align:center}
    .links{width:100%;display:flex;flex-direction:column;gap:12px}
    .link-btn{
      display:flex;align-items:center;justify-content:space-between;
      padding:14px 20px;
      background:${theme.linkBg};
      border:1px solid ${theme.linkBorder};
      border-radius:14px;color:#fff;text-decoration:none;
      font-size:1rem;font-weight:500;
      transition:all .2s;backdrop-filter:blur(8px);
    }
    .link-btn:hover{
      background:${theme.accentHover};
      border-color:${theme.linkHoverBorder};
      transform:translateY(-2px);
    }
    .powered{position:fixed;bottom:16px;font-size:.8rem;color:rgba(255,255,255,.45)}
    .powered a{color:${theme.poweredColor};text-decoration:none;font-weight:600}
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
    <div class="links">
      ${linksHTML || '<p style="color:rgba(255,255,255,.5);text-align:center">Belum ada link</p>'}
    </div>
  </div>
  <div class="powered">Powered by <a href="/">Biojos</a></div>
</body>
</html>`;
}

function notFoundPage() {
  return `<!DOCTYPE html><html><head><title>404 - Biojos</title>
  <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f0c29;color:#fff}a{color:#a78bfa}</style>
  </head><body><div style="text-align:center"><h1>404</h1><p>Username tidak ditemukan</p><br><a href="/">← Kembali ke Biojos</a></div></body></html>`;
}
