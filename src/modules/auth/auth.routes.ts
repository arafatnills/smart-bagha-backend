import { Router } from "express";
import { UserRole } from "../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AuthControllers } from "./auth.controller";
import { UserValidation } from "./auth.validation";

const router = Router();

router.post(
  "/register",
  validateRequest(UserValidation.createUserZodSchema),
  AuthControllers.createUser,
);
router.post(
  "/verify-email",
  validateRequest(UserValidation.verifyUserEmailZodSchema),
  AuthControllers.verifyUserEmail,
);
router.post(
  "/login",
  validateRequest(UserValidation.loginUserZodSchema),
  AuthControllers.loginUser,
);
router.post(
  "/google",
  validateRequest(UserValidation.googleLoginZodSchema),
  AuthControllers.googleLogin,
);
router.post(
  "/forgot-password",
  validateRequest(UserValidation.forgotPasswordZodSchema),
  AuthControllers.forgotPassword,
);
router.post(
  "/reset-password",
  validateRequest(UserValidation.resetPasswordZodSchema),
  AuthControllers.resetPassword,
);
// verify only otp for forgot password
router.post(
  "/verify-forgot-password-otp",
  validateRequest(UserValidation.verifyUserEmailZodSchema),
  AuthControllers.verifyForgotPasswordOtp,
);
router.get(
  "/me",
  auth(UserRole.ADMIN, UserRole.DONOR, UserRole.USER),
  AuthControllers.getMe,
);

router.post("/refresh-token", AuthControllers.refreshToken);

export const AuthRoutes = router;
