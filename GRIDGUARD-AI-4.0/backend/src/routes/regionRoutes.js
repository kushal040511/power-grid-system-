import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { listRegions, getRegionDetail } from "../controllers/regionController.js";

const router = Router();
router.get("/", authRequired, listRegions);
router.get("/:regionId", authRequired, getRegionDetail);

export default router;
