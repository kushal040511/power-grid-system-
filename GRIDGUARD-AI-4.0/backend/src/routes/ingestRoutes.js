import { Router } from "express";
import { ingestReading } from "../controllers/ingestController.js";

const router = Router();
router.post("/", ingestReading);

export default router;
