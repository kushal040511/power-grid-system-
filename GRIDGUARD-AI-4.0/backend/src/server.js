import express from "express";
import "express-async-errors";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { apiLimiter } from "./middleware/rateLimit.js";
import { errorHandler } from "./middleware/error.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import regionRoutes from "./routes/regionRoutes.js";
import readingRoutes from "./routes/readingRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import llmRoutes from "./routes/llmRoutes.js";
import transformerRoutes from "./routes/transformerRoutes.js";
import meterRoutes from "./routes/meterRoutes.js";
import ingestRoutes from "./routes/ingestRoutes.js";
import pool from "./db/pool.js";
import electricityMapsRoutes from "./routes/electricityMapsRoutes.js";
import { syncElectricityMapsToRegions } from "./services/electricityMapsService.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const socketAllowedOrigins = (() => {
  const raw = process.env.CORS_ORIGIN || "*";
  if (raw === "*") return "*";
  const values = raw.split(",").map((v) => v.trim()).filter(Boolean);
  if (!values.length) return "*";
  return values;
})();

const io = new Server(server, {
  cors: { origin: socketAllowedOrigins }
});

app.set("io", io);

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(apiLimiter);

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (err) {
    res.status(500).json({ status: "db_error" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/regions", regionRoutes);
app.use("/api/readings", readingRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/llm", llmRoutes);
app.use("/api/transformers", transformerRoutes);
app.use("/api/meters", meterRoutes);
app.use("/api/ingest", ingestRoutes);
app.use("/api/electricity-maps", electricityMapsRoutes);

app.use(errorHandler);

io.on("connection", (socket) => {
  socket.emit("connected", { message: "GRIDGUARD AI socket connected" });
});

const port = process.env.PORT || 5001;
server.listen(port, () => {
  console.log(`GRIDGUARD backend running on :${port}`);

  const pollSeconds = Number(process.env.ELECTRICITYMAPS_POLL_SECONDS || 3600);
  if (process.env.ELECTRICITYMAPS_API_KEY) {
    syncElectricityMapsToRegions({ io })
      .then((rows) => {
        console.log(`Electricity Maps initial sync complete (${rows.length} regions)`);
      })
      .catch((err) => {
        console.error("Electricity Maps initial sync failed:", err.message);
      });

    setInterval(async () => {
      try {
        const rows = await syncElectricityMapsToRegions({ io });
        console.log(`Electricity Maps periodic sync complete (${rows.length} regions)`);
      } catch (err) {
        console.error("Electricity Maps periodic sync failed:", err.message);
      }
    }, pollSeconds * 1000);
  } else {
    console.log("Electricity Maps sync disabled (missing ELECTRICITYMAPS_API_KEY)");
  }
});
