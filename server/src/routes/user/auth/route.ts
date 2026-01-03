import { Router } from "express";
import { AuthController } from "../../../controllers/auth.controller";
import { authenticate } from "../../../middlewares/auth.middleware";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/logout", authenticate, AuthController.logout);
router.get("/revoke-via-email", AuthController.revokeViaEmail);

export default router;
