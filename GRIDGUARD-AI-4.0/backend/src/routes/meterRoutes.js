import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { listMeters } from "../controllers/meterController.js";

const router = Router();
router.get("/", authRequired, listMeters);

export default router;
