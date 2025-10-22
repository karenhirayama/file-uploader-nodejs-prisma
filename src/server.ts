// src/server.ts
import express from "express";
import path from "path";
import { ENV } from "./config/env";
import { sessionConfig } from "./lib/session";
import { passport } from "./lib/auth";

// Import routes
import authRoutes from "./routes/auth";
import folderRoutes from "./routes/folders";
import fileRoutes from "./routes/files";

const app = express();

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "../public")));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(sessionConfig);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/files", fileRoutes);


// Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

app.listen(ENV.PORT, () => {
  console.log(`Server running successfully on port ${ENV.PORT}`);
  console.log(`Open http://localhost:${ENV.PORT} in your browser`);
});