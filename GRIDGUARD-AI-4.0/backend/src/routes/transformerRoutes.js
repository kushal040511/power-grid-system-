import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { listTransformers } from "../controllers/transformerController.js";

const router = Router();
router.get("/", authRequired, listTransformers);

export default router;
