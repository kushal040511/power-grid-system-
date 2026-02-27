import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { generateReport, downloadReport, previewReport, generateMarkdownReport } from "../controllers/reportController.js";

const router = Router();
router.get("/preview", authRequired, previewReport);
router.post("/generate", authRequired, generateMarkdownReport);
router.post("/", authRequired, generateReport);
router.get("/:id", authRequired, downloadReport);

export default router;
