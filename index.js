// monitor.js
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

// If your Node < 18, uncomment and install node-fetch:
// import fetch from "node-fetch";

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);

const PORT = process.env.PORT || 10000;

const urls = [
  "https://atommcbot-wezz.onrender.com/",
  "https://doggodonutafk.onrender.com/",
  "https://doggodonutafk2.onrender.com/",
  "https://doggodonutafk3.onrender.com/",
  "https://doggodonutafk4.onrender.com/",
  "https://doggodonutafk5.onrender.com/",
  "https://donutsecurity.onrender.com/",
].filter(Boolean);

let siteStatus = {}; // { url: { status: "online"|"offline", active: true|false } }

// Initialize all sites as active
urls.forEach(url => siteStatus[url] = { status: "unknown", active: true });

async function checkSites() {
  console.log(`\n[${new Date().toLocaleTimeString()}] Checking active sites...`);
  for (const [url, data] of Object.entries(siteStatus)) {
    if (!data.active) continue; // skip paused sites
    try {
      const response = await fetch(url, { method: "GET" });
      const isOnline = response.ok;
      data.status = isOnline ? "online" : "offline";
      console.log(`${isOnline ? "✅" : "❌"} ${url} - ${response.status}`);
    } catch (err) {
      data.status = "offline";
      console.log(`❌ ${url} - error: ${err.message}`);
    }
  }
  io.emit("statusUpdate", siteStatus);
}

setInterval(checkSites, 10_000);
checkSites();

// Handle client toggle requests
io.on("connection", (socket) => {
  console.log("🟢 New client connected");

  // Send current state immediately
  socket.emit("statusUpdate", siteStatus);

  socket.on("toggleSite", (url) => {
    if (siteStatus[url]) {
      siteStatus[url].active = !siteStatus[url].active;
      console.log(`⚙️ ${url} monitoring ${siteStatus[url].active ? "resumed" : "paused"}`);
      io.emit("statusUpdate", siteStatus);
    }
  });
});

// Serve HTML dashboard
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Doggo Service Monitor v1.1</title>
<style>
  body {
    font-family: "Inter", system-ui, sans-serif;
    background: #0f172a;
    color: #e2e8f0;
    margin: 0;
    padding: 2rem;
  }
  h1 {
    text-align: center;
    margin-bottom: 2rem;
    color: #38bdf8;
  }
  .list {
    max-width: 650px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .card {
    background: #1e293b;
    border-radius: 10px;
    padding: 1rem 1.5rem;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: background 0.3s ease, opacity 0.3s ease;
  }
  .url {
    flex: 1;
    word-break: break-all;
  }
  .status {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-weight: 600;
    margin-right: 1rem;
  }
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  .online .dot { background: #22c55e; }
  .offline .dot { background: #ef4444; }
  .unknown .dot { background: #94a3b8; }
  button {
    background: #38bdf8;
    border: none;
    color: #0f172a;
    padding: 0.4rem 0.8rem;
    border-radius: 5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  button:hover { background: #0ea5e9; }
  button.stop {
    background: #ef4444;
    color: white;
  }
  button.stop:hover {
    background: #dc2626;
  }
  .inactive {
    opacity: 0.5;
  }
</style>
</head>
<body>
  <h1>🐶 Doggo Service Monitor v1.1</h1>
  <div class="list" id="siteList"></div>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    const socket = io();
    const list = document.getElementById('siteList');

    function renderStatus(statusMap) {
      list.innerHTML = '';
      for (const [url, data] of Object.entries(statusMap)) {
        const card = document.createElement('div');
        card.className = 'card ' + data.status + (data.active ? '' : ' inactive');

        const btn = document.createElement('button');
        btn.textContent = data.active ? 'Stop' : 'Start';
        btn.className = data.active ? 'stop' : '';
        btn.onclick = () => socket.emit('toggleSite', url);

        card.innerHTML = \`
          <div class="url">\${url}</div>
          <div class="status \${data.status}">
            <div class="dot"></div>
            <span>\${data.status.toUpperCase()}</span>
          </div>
        \`;
        card.appendChild(btn);
        list.appendChild(card);
      }
    }

    socket.on('statusUpdate', renderStatus);
  </script>
</body>
</html>
  `);
});

server.listen(PORT, () =>
  console.log(`✅ Monitor dashboard running on http://localhost:${PORT}`)
);
