import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth.js";
import {
  getApiCatalog,
  proxyApi,
  syncNow,
  getAllLatestSignals
} from "../controllers/electricityMapsController.js";

const router = Router();

router.get("/apis", authRequired, getApiCatalog);
router.get("/proxy", authRequired, proxyApi);
router.get("/signals/latest", authRequired, getAllLatestSignals);
router.post(
  "/sync",
  authRequired,
  requireRole("super_admin", "admin", "regional_manager"),
  syncNow
);

export default router;
