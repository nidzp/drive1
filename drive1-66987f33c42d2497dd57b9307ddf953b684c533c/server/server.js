import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import multer from "multer";
import crypto from "crypto";
import mime from "mime-types";
import JSZip from "jszip";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const PIN_HASH = process.env.PIN_HASH || "";
const PIN_PEPPER = process.env.PIN_PEPPER || "";
const STORAGE_PATH = path.resolve(__dirname, process.env.STORAGE_PATH || "../storage");
// PATCH: default 200 GiB quota (was 150 GiB)
const STORAGE_QUOTA_BYTES = Number(process.env.STORAGE_QUOTA_BYTES || 214_748_364_800);

fs.mkdirSync(STORAGE_PATH, { recursive: true });

function guardJoin(root, rel = "") {
  const p = path.resolve(root, rel.replace(/^[\\/]+/, ""));
  if (!p.startsWith(root)) throw new Error("Path traversal detected");
  return p;
}

async function computeDirSize(dir) {
  let total = 0;
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) total += await computeDirSize(full);
    else {
      const st = await fs.promises.stat(full);
      total += st.size;
    }
  }
  return total;
}

let usedBytes = 0;
computeDirSize(STORAGE_PATH).then(v => usedBytes = v).catch(() => {});

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function setAuthCookie(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, { httpOnly: true, sameSite: "lax", secure: false });
}

function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

const loginLimiter = rateLimit({ windowMs: 60_000, max: 10 });
const apiLimiter = rateLimit({ windowMs: 15 * 60_000, max: 1000 });

app.post("/api/login", loginLimiter, (req, res) => {
  const { pin } = req.body || {};
  if (typeof pin !== "string" || !PIN_HASH || !PIN_PEPPER) {
    return res.status(400).json({ error: "Server not configured" });
  }
  const submitted = sha256(pin + PIN_PEPPER);
  const ok = crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(PIN_HASH));
  if (!ok) return res.status(401).json({ error: "Invalid PIN" });
  setAuthCookie(res, { role: "user" });
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ ok: true, quotaBytes: STORAGE_QUOTA_BYTES, usedBytes });
});

app.use("/api", apiLimiter, authMiddleware);

// List directory
app.get("/api/list", async (req, res) => {
  const rel = (req.query.path || "").toString();
  try {
    const dir = guardJoin(STORAGE_PATH, rel);
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const items = await Promise.all(entries.map(async (e) => {
      const full = path.join(dir, e.name);
      const st = await fs.promises.stat(full);
      return {
        name: e.name,
        isDir: e.isDirectory(),
        size: e.isDirectory() ? null : st.size,
        mtime: st.mtimeMs,
        ext: e.isDirectory() ? null : path.extname(e.name).slice(1).toLowerCase()
      };
    }));
    res.json({ path: rel, items });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Make dir
app.post("/api/mkdir", async (req, res) => {
  const { path: rel, name } = req.body || {};
  if (!name) return res.status(400).json({ error: "Missing name" });
  try {
    const dir = guardJoin(STORAGE_PATH, rel || "");
    await fs.promises.mkdir(path.join(dir, name), { recursive: false });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const upload = multer({ dest: path.join(__dirname, "tmp") });

// Upload
app.post("/api/upload", upload.array("files", 50), async (req, res) => {
  const rel = (req.body.path || "").toString();
  try {
    const targetDir = guardJoin(STORAGE_PATH, rel);
    let increase = 0;
    for (const f of (req.files || [])) increase += f.size;
    if (usedBytes + increase > STORAGE_QUOTA_BYTES) {
      for (const f of (req.files || [])) fs.promises.unlink(f.path).catch(()=>{});
      return res.status(400).json({ error: "Quota exceeded" });
    }
    for (const f of (req.files || [])) {
      const safeName = f.originalname.replace(/[\\/:*?"<>|]/g, "_");
      const dest = path.join(targetDir, safeName);
      await fs.promises.rename(f.path, dest);
      usedBytes += f.size;
    }
    res.json({ ok: true });
  } catch (err) {
    for (const f of (req.files || [])) fs.promises.unlink(f.path).catch(()=>{});
    res.status(400).json({ error: err.message });
  }
});

// Download multiple as ZIP
app.post("/api/download-zip", async (req, res) => {
  const { paths } = req.body || {};
  if (!Array.isArray(paths) || paths.length === 0) return res.status(400).json({ error: "No paths" });
  try {
    const zip = new JSZip();
    for (const rel of paths) {
      const full = guardJoin(STORAGE_PATH, rel);
      const st = await fs.promises.stat(full);
      if (st.isDirectory()) {
        async function addDir(baseRel, baseFull) {
          const entries = await fs.promises.readdir(baseFull, { withFileTypes: true });
          for (const e of entries) {
            const efull = path.join(baseFull, e.name);
            const erel = path.join(baseRel, e.name);
            const est = await fs.promises.stat(efull);
            if (e.isDirectory()) await addDir(erel, efull);
            else zip.file(erel, await fs.promises.readFile(efull));
          }
        }
        await addDir(path.basename(full), full);
      } else {
        zip.file(path.basename(full), await fs.promises.readFile(full));
      }
    }
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    res.setHeader("Content-Disposition", 'attachment; filename="download.zip"');
    res.setHeader("Content-Type", "application/zip");
    res.send(buf);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Download single
app.get("/api/download", async (req, res) => {
  const rel = (req.query.path || "").toString();
  try {
    const full = guardJoin(STORAGE_PATH, rel);
    const st = await fs.promises.stat(full);
    if (st.isDirectory()) return res.status(400).json({ error: "Cannot download directory" });
    const mimeType = mime.lookup(full) || "application/octet-stream";
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${path.basename(full)}"`);
    fs.createReadStream(full).pipe(res);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Read-only paginated text preview
app.get("/api/text", async (req, res) => {
  try {
    const rel = (req.query.path || "").toString();
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(1000, Math.max(100, parseInt(req.query.pageSize || "300", 10)));
    const full = guardJoin(STORAGE_PATH, rel);
    const st = await fs.promises.stat(full);
    if (st.isDirectory()) return res.status(400).json({ error: "Directory not supported" });
    const MAX_BYTES = 5 * 1024 * 1024;
    let data;
    if (st.size > MAX_BYTES) {
      const fd = await fs.promises.open(full, "r");
      try {
        const buf = Buffer.alloc(Math.min(MAX_BYTES, st.size));
        await fd.read(buf, 0, buf.length, 0);
        data = buf.toString("utf8");
      } finally { await fd.close(); }
    } else {
      data = await fs.promises.readFile(full, "utf8");
    }
    const lines = data.split(/\r?\n/);
    const totalLines = lines.length;
    const totalPages = Math.max(1, Math.ceil(totalLines / pageSize));
    const start = (page - 1) * pageSize;
    const chunk = lines.slice(start, start + pageSize).join("\n");
    res.json({ ok: true, page, pageSize, totalPages, totalLines, chunk });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Rename
app.post("/api/rename", async (req, res) => {
  const { path: rel, newName } = req.body || {};
  if (!newName) return res.status(400).json({ error: "Missing newName" });
  try {
    const full = guardJoin(STORAGE_PATH, rel);
    const dir = path.dirname(full);
    const dest = path.join(dir, newName.replace(/[\\/:*?"<>|]/g, "_"));
    await fs.promises.rename(full, dest);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

async function deleteRecursive(p) {
  const st = await fs.promises.stat(p);
  if (st.isDirectory()) {
    const entries = await fs.promises.readdir(p);
    for (const name of entries) await deleteRecursive(path.join(p, name));
    await fs.promises.rmdir(p);
  } else {
    await fs.promises.unlink(p);
  }
  return st.size || 0;
}

// Delete (files or folders)
app.post("/api/delete", async (req, res) => {
  const { paths } = req.body || {};
  if (!Array.isArray(paths) || paths.length === 0) return res.status(400).json({ error: "No paths" });
  try {
    let freed = 0;
    for (const rel of paths) {
      const full = guardJoin(STORAGE_PATH, rel);
      const st = await fs.promises.stat(full);
      if (st.isDirectory()) {
        async function dirSize(p) {
          let total = 0;
          const entries = await fs.promises.readdir(p, { withFileTypes: true });
          for (const e of entries) {
            const fp = path.join(p, e.name);
            const fst = await fs.promises.stat(fp);
            if (e.isDirectory()) total += await dirSize(fp);
            else total += fst.size;
          }
          return total;
        }
        freed += await dirSize(full);
      } else freed += st.size;
      await deleteRecursive(full);
    }
    usedBytes = Math.max(0, usedBytes - freed);
    res.json({ ok: true, freed });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Move
app.post("/api/move", async (req, res) => {
  const { paths, destination } = req.body || {};
  if (!Array.isArray(paths) || !destination) return res.status(400).json({ error: "Invalid payload" });
  try {
    const destDir = guardJoin(STORAGE_PATH, destination);
    for (const rel of paths) {
      const src = guardJoin(STORAGE_PATH, rel);
      const base = path.basename(src);
      await fs.promises.rename(src, path.join(destDir, base));
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const distPath = path.resolve(__dirname, "../client/dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("Client not built yet. Run: cd ../client && npm i && npm run build");
  });
}

app.listen(PORT, () => {
  console.log(`Drive server on http://0.0.0.0:${PORT}`);
});
