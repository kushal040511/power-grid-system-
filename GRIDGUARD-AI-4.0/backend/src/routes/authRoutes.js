import { Router } from "express";
import { body } from "express-validator";
import { register, login, refresh, logout } from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import { listRegionsPublic } from "../controllers/regionController.js";

const router = Router();

router.post(
  "/register",
  [body("name").notEmpty(), body("email").isEmail(), body("password").isLength({ min: 6 })],
  validate,
  register
);

router.post(
  "/login",
  [body("email").isEmail(), body("password").notEmpty()],
  validate,
  login
);

router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/regions", listRegionsPublic);

export default router;
