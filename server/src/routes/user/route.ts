import { Router } from "express";
import authRouter from "./auth/route";
import { authenticate } from "../../middlewares/auth.middleware";
import { AuthController } from "../../controllers/auth.controller";
import { UserController } from "../../controllers/user.controller";

const router = Router();

router.use("/auth", authRouter);
router.get('/me', authenticate, UserController.getUserForAuth);
router.get("/profile", authenticate, UserController.getProfile);
router.get("/sessions/history", authenticate, UserController.getSessionHistory);
router.delete("/sessions", authenticate, UserController.revokeSession);
router.delete("/sessions/others", authenticate, UserController.revokeAllOtherSessions);

export default router;
