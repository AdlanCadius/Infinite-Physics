import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import cookieParser from "cookie-parser";
import admin from "firebase-admin";
import midtransClient from "midtrans-client";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURATION ---
const PORT = 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-physics-key";

// Firebase Admin Setup
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("⚠️ Firebase Admin credentials missing. Firestore features will be disabled until configured.");
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }
}
const db = admin.apps.length ? admin.firestore() : null;

// Midtrans
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
});

// Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// --- MIDDLEWARE ---

// Satpam Middleware (Admin Only)
const adminGuard = async (req: Request, res: Response, next: NextFunction) => {
  if (!db) return res.status(500).json({ error: "Database tidak terhubung. Periksa konfigurasi Firebase." });
  
  const token = req.headers.authorization?.split(" ")[1] || req.cookies.admin_token;
  
  if (!token) return res.status(401).json({ error: "Akses ditolak. Satpam: Mana surat izinnya?" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const adminRef = db.collection("admins").doc(decoded.id);
    const adminDoc = await adminRef.get();

    if (!adminDoc.exists || adminDoc.data()?.role !== "admin") {
      return res.status(403).json({ error: "Anda bukan admin. Satpam: Silakan putar balik." });
    }

    // Audit Log: Track every admin action
    await db.collection("admin_audit").add({
      adminId: decoded.id,
      action: `${req.method} ${req.path}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ip: req.ip
    });

    (req as any).admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Token kadaluarsa atau tidak valid." });
  }
};

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // --- ADMIN API ---
  
  // Admin Login (Generates Complex Token)
  app.post("/api/admin/login", async (req, res) => {
    const { username, password } = req.body;
    // In real app, check against hashed password in Firestore
    if (username === "admin" && password === process.env.ADMIN_SECRET_KEY) {
      const token = jwt.sign(
        { 
          id: "admin_001", 
          role: "admin",
          scopes: ["read:all", "write:global", "manage:users"],
          iat: Math.floor(Date.now() / 1000)
        }, 
        JWT_SECRET, 
        { expiresIn: "2h" }
      );
      
      res.cookie("admin_token", token, { httpOnly: true, secure: true, sameSite: 'none' });
      return res.json({ token, success: true });
    }
    res.status(401).json({ error: "Kredensial salah." });
  });

  // Admin Dashboard Data
  app.get("/api/admin/stats", adminGuard, async (req, res) => {
    if (!db) return res.status(500).json({ error: "Database tidak terhubung." });
    try {
      const usersCount = (await db.collection("users").count().get()).data().count;
      const nodesCount = (await db.collection("global_nodes").count().get()).data().count;
      const revenue = (await db.collection("payments").where("status", "==", "success").get()).docs.reduce((acc, doc) => acc + doc.data().amount, 0);

      res.json({ usersCount, nodesCount, revenue });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- USER API ---

  // 1. Auth & Session Management (2 Device Limit)
  app.post("/api/auth/session", async (req, res) => {
    if (!db) return res.status(500).json({ error: "Database tidak terhubung." });
    const { userId, deviceId } = req.body;
    const userRef = db.collection("users").doc(userId);
    const sessionsRef = userRef.collection("sessions");

    try {
      const sessions = await sessionsRef.get();
      const existingSession = sessions.docs.find(doc => doc.data().deviceId === deviceId);

      if (!existingSession) {
        if (sessions.size >= 2) {
          return res.status(403).json({ error: "Limit 2 perangkat tercapai." });
        }
        await sessionsRef.add({ deviceId, lastActive: admin.firestore.FieldValue.serverTimestamp() });
      } else {
        await existingSession.ref.update({ lastActive: admin.firestore.FieldValue.serverTimestamp() });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Physics Search
  app.post("/api/physics/search", async (req, res) => {
    if (!db) return res.status(500).json({ error: "Database tidak terhubung." });
    const { query, lang, userId } = req.body;
    const TOKEN_COST = 10;

    try {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        // Auto-create user if not exists (for demo/first time)
        await userRef.set({ tokens: 100, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return res.status(402).json({ error: "User baru dibuat. Silakan coba lagi." });
      }
      const userData = userDoc.data()!;

      if (userData.tokens < TOKEN_COST) return res.status(402).json({ error: "Token tidak mencukupi" });

      // Deduct Tokens
      await userRef.update({ tokens: userData.tokens - TOKEN_COST });

      // Global Deduplication
      const queryHash = crypto.createHash("md5").update(`${lang}:${query.toLowerCase().trim()}`).digest("hex");
      const nodeRef = db.collection("global_nodes").doc(queryHash);
      const nodeDoc = await nodeRef.get();

      if (nodeDoc.exists) {
        return res.json(nodeDoc.data()?.content);
      }

      // AI Generate
      const langName = lang === "id" ? "Indonesian" : "English";
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Explain physics: "${query}" in ${langName}. [JSON format]`,
        config: { responseMimeType: "application/json" }
      });

      const nodeContent = JSON.parse(response.text);
      await nodeRef.set({ content: nodeContent, query: query.toLowerCase().trim(), lang });

      res.json(nodeContent);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
