import { Router } from "express";
import authRouter from "./auth/route";
import { authenticate } from "../../middlewares/auth.middleware";
import { AuthController } from "../../controllers/auth.controller";

const router = Router();

router.use("/auth", authRouter);
router.get('/me', authenticate, AuthController.me);

export default router;
