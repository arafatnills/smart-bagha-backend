import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { UserControllers } from "./user.controller";

const router = Router();

router.patch(
	"/profile-image",
	auth(UserRole.ADMIN, UserRole.DONOR, UserRole.USER),
	upload.single("profileImage"),
	UserControllers.uploadProfileImage,
);

export const UserRoutes = router;
