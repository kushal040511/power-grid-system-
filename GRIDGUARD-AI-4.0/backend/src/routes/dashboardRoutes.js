import { Router } from "express";
import { getDashboard, getRiskMap } from "../controllers/dashboardController.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();
router.get("/", authRequired, getDashboard);
router.get("/risk-map", authRequired, getRiskMap);

export default router;
