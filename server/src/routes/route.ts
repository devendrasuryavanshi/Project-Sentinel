import { Router } from "express";
import userRouter from "./user/route";
import adminRouter from "./admin/route";

const router = Router();

router.use("/user", userRouter);
router.use("/admin", adminRouter);

export default router;
