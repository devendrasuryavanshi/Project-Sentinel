import { Router } from "express";
import { AdminController } from "../../controllers/admin.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireAdmin } from "../../middlewares/admin.middleware";

const router = Router();

router.use(authenticate, requireAdmin);
router.get("/users", AdminController.getAllUsers);
router.get("/users/:userId/sessions", AdminController.getUserSessions);
router.patch("/users/:userId/role", AdminController.updateUserRole);
router.delete("/users/:userId/sessions", AdminController.revokeAllUserSessions);
router.delete("/sessions/:sessionId", AdminController.revokeSession);

export default router;
