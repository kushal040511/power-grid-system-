import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { explainRegion, chat } from "../controllers/llmController.js";

const router = Router();
router.post("/explain", authRequired, explainRegion);
router.post("/chat", authRequired, chat);

export default router;
