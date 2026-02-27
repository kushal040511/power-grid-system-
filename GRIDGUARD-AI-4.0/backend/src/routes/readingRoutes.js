import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { latestReadings, regionTrend } from "../controllers/readingController.js";

const router = Router();
router.get("/latest", authRequired, latestReadings);
router.get("/trend/:regionId", authRequired, regionTrend);

export default router;
