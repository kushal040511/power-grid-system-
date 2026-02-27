import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { listAlerts, acknowledgeAlert } from "../controllers/alertController.js";

const router = Router();
router.get("/", authRequired, listAlerts);
router.post("/:id/ack", authRequired, acknowledgeAlert);

export default router;
