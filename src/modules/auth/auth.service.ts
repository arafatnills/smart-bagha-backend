import bcrypt from "bcryptjs";
import crypto from "crypto";
import ejs from "ejs";
import type { TokenPayload } from "google-auth-library";
import status from "http-status";
import type { SignOptions } from "jsonwebtoken";
import path from "path";
import config from "../../config";
import { AuthProvider } from "../../generated/prisma/enums";
import { googleClient } from "../../lib/google";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import { AppError } from "../../utils/AppError";
import { hashOtp } from "../../utils/hashOtp";
import { jwtUtils } from "../../utils/jwt";
import type {
  CreateUserInterface,
  ForgotPasswordInterface,
  GoogleAuthInterface,
  LoginUserInterface,
  ResetPasswordInterface,
  VerifyUserInterface,
} from "./auth.interfaces";

// create user
const createUserQuery = async (payload: CreateUserInterface) => {
  const { name, password } = payload;
  const email = payload.email.trim().toLowerCase();

  const isExistsUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (isExistsUser) {
    throw new AppError(status.CONFLICT, "user already exists with this email");
  }

  const hashPassword = await bcrypt.hash(
    password,
    Number(config.bcrypt_salt_rounds),
  );

  const userOtpKey = `user-registration-otp:${email}`;
  const otpValue = crypto.randomInt(100000, 1000000).toString();

  await redisClient.set(userOtpKey, hashOtp(otpValue), {
    expiration: {
      type: "EX",
      value: 5 * 60,
    },
  });

  const userRegistrationKey = `user-registration-data:${email}`;
  const userRegistrationPayload = {
    name,
    email,
    password: hashPassword,
    bloodGroup: payload.bloodGroup,
    phone: payload.phone
  };

  await redisClient.set(
    userRegistrationKey,
    JSON.stringify(userRegistrationPayload),
    {
      expiration: {
        type: "EX",
        value: 5 * 60,
      },
    },
  );

  const templatePath = path.join(
    process.cwd(),
    "/src/templates/verify-email.ejs",
  );

  const html = await ejs.renderFile(templatePath, {
    name,
    otp: otpValue,
  });

  // sent password reset successfully via email
  await transporter.sendMail({
    from: config.smtp_sender,
    to: email,
    subject: "Verify Your Email",
    html,
  });
};

// verify user email
const verifyUserEmailQuery = async (payload: VerifyUserInterface) => {
  const email = payload.email.trim().toLowerCase();
  const isExistsUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (isExistsUser?.emailVerified) {
    throw new AppError(status.OK, "Email already verified!");
  }

  if (isExistsUser?.status === "SUSPENDED") {
    throw new AppError(status.CONFLICT, "isExistsUser Suspended");
  }

  if (isExistsUser?.isDeleted && isExistsUser?.status === "DELETED") {
    throw new AppError(status.CONFLICT, "User deleted");
  }

  const userOtpKey = `user-registration-otp:${email}`;

  const redisOtp = await redisClient.get(userOtpKey);

  if (!redisOtp) throw new AppError(status.UNAUTHORIZED, "Invalid OPT");

  if (redisOtp !== hashOtp(String(payload.otp).trim())){
    throw new AppError(status.UNAUTHORIZED, "OTP does not match!.");
  }
    

  await redisClient.del(userOtpKey);

  const userRegistrationKey = `user-registration-data:${email}`;
  const redisDataPayload = await redisClient.get(userRegistrationKey);

  if (!redisDataPayload) {
    throw new AppError(status.NOT_FOUND, "User data not found!");
  }

  const userPayload: CreateUserInterface = JSON.parse(redisDataPayload);

  const user = await prisma.user.create({
    data: {
      name: userPayload.name,
      email: userPayload.email,
      password: userPayload.password,
      bloodGroup: userPayload.bloodGroup as string,
      phone: "",
      emailVerified: true,
      donar: {
        create: {
          name: userPayload.name,
          email: userPayload.email,
        },
      },
    },
    omit: {
      password: true,
    },
    include: {
      donar: true,
    },
  });

  const templatePath = path.join(
    process.cwd(),
    "/src/templates/welcome-email.ejs",
  );

  const html = await ejs.renderFile(templatePath, {
    name: user.name || "there",
    websiteUrl: config.app_url_client,
    year: new Date().getFullYear(),
  });

  await transporter.sendMail({
    from: config.smtp_sender,
    to: user.email,
    subject: "🩸 Welcome to Smart Bagha — Let's Save Lives!",
    html,
  });

  await redisClient.del(userRegistrationKey);

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    {
      expiresIn: config.jwt_access_expire_in,
    } as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    {
      expiresIn: config.jwt_refresh_expire_in,
    } as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
    user,
  };
};

// login user
const loginUserQuery = async (payload: LoginUserInterface) => {
  const { email, password } = payload;
  console.log({ email, password });

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "user not found!");
  }

  const verifyPassword = await bcrypt.compare(
    password,
    user.password as string,
  );

  if (!verifyPassword) {
    throw new AppError(status.CONFLICT, "Invalid password");
  }

  if (user.status === "SUSPENDED") {
    throw new AppError(status.CONFLICT, "User Suspended");
  }

  if (user.status === "DELETED") {
    throw new AppError(status.CONFLICT, "User deleted");
  }

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    { expiresIn: config.jwt_access_expire_in } as SignOptions,
  );
  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    { expiresIn: config.jwt_refresh_expire_in } as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

// google login
const googleLoginQuery = async (payload: GoogleAuthInterface) => {
  let googleIdTokenPayload: TokenPayload | null | undefined = null;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: payload.idToken,
      audience: config.google_client_id,
    });
    googleIdTokenPayload = ticket.getPayload();
  } catch (error) {
    console.log(`google id token verification failed`, error);
    throw new AppError(
      status.EXPECTATION_FAILED,
      "Invalid or expired google id token",
    );
  }

  if (!googleIdTokenPayload)
    throw new AppError(
      status.EXPECTATION_FAILED,
      "Invalid or expired google id token",
    );

  if (!googleIdTokenPayload.email || !googleIdTokenPayload.name) {
    throw new AppError(status.NOT_FOUND, "google email or name not found!");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: googleIdTokenPayload.email,
    },
  });

  let user = existingUser;

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: googleIdTokenPayload.email,
        name: googleIdTokenPayload.name,
        profilePhoto: googleIdTokenPayload.picture,
        role: "DONOR",
        bloodGroup: "",
        phone: "",
        provider: AuthProvider.GOOGLE,
        googleId: googleIdTokenPayload.sub,
        emailVerified: true,
        donar: {
          create: {
            name: googleIdTokenPayload.name,
            email: googleIdTokenPayload.email,
          },
        },
      },
    });

    const templatePath = path.join(
      process.cwd(),
      "/src/templates/welcome-email.ejs",
    );

    const html = await ejs.renderFile(templatePath, {
      name: googleIdTokenPayload.name || "there",
      websiteUrl: config.app_url_client,
      year: new Date().getFullYear(),
    });

    await transporter.sendMail({
      from: config.smtp_sender,
      to: googleIdTokenPayload.email,
      subject: "🩸 Welcome to Smart Bagha — Let's Save Lives!",
      html,
    });
  } else {
    user = await prisma.user.update({
      where: {
        email: googleIdTokenPayload.email,
      },
      data: {
        googleId: googleIdTokenPayload.sub,
      },
    });
  }

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    { expiresIn: config.jwt_access_expire_in } as SignOptions,
  );
  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    { expiresIn: config.jwt_refresh_expire_in } as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

// forgot password
const forgotPasswordQuery = async (payload: ForgotPasswordInterface) => {
  const { email } = payload;

  const isExistsUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!isExistsUser) throw new AppError(status.NOT_FOUND, "user not found!");

  if (isExistsUser.status === "SUSPENDED")
    throw new AppError(status.CONFLICT, "user is Suspended!");

  if (isExistsUser.status === "DELETED" || isExistsUser.isDeleted)
    throw new AppError(status.NOT_FOUND, "user is deleted!");

  if (isExistsUser.googleId && isExistsUser.provider === "GOOGLE")
    throw new AppError(status.CONFLICT, "user has account with google.");
  if (!isExistsUser.emailVerified)
    throw new AppError(status.CONFLICT, "email not verified!");

  const otp = crypto.randomInt(100000, 1000000).toString();
  const key = `forgot-password:${isExistsUser.email}`;

  await redisClient.set(key, hashOtp(otp), {
    expiration: {
      type: "EX",
      value: 5 * 60,
    },
  });

  const templatePath = path.join(
    process.cwd(),
    "/src/templates/forgot-password.ejs",
  );

  const html = await ejs.renderFile(templatePath, {
    otp,
    name: isExistsUser.name,
  });

  // sent otp via email
  await transporter.sendMail({
    from: config.smtp_sender,
    to: isExistsUser.email,
    subject: "Forgot Password OTP",
    html,
  });
};

// reset password
const resetPasswordQuery = async (payload: ResetPasswordInterface) => {
  const { email, otp, newPassword } = payload;

  const isExistsUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!isExistsUser) throw new AppError(status.NOT_FOUND, "user not found!");

  if (isExistsUser.status === "SUSPENDED")
    throw new AppError(status.CONFLICT, "user is Suspended!");

  if (isExistsUser.status === "DELETED" || isExistsUser.isDeleted)
    throw new AppError(status.NOT_FOUND, "user is deleted!");

  if (isExistsUser.googleId && isExistsUser.provider === "GOOGLE")
    throw new AppError(status.CONFLICT, "user has account with google.");
  if (!isExistsUser.emailVerified)
    throw new AppError(status.CONFLICT, "email not verified!");

  const key = `forgot-password:${isExistsUser.email}`;

  const redisOtp = await redisClient.get(key);

  if (!redisOtp) throw new AppError(status.UNAUTHORIZED, "Invalid OPT");
  if (redisOtp !== hashOtp(otp))
    throw new AppError(status.UNAUTHORIZED, "OTP does not match!.");

  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  await prisma.user.update({
    where: {
      email: isExistsUser.email,
    },
    data: {
      password: hashPassword,
    },
  });

  await redisClient.del([key]);

  const templatePath = path.join(
    process.cwd(),
    "/src/templates/reset-success.ejs",
  );

  const html = await ejs.renderFile(templatePath, {
    name: isExistsUser.name,
  });

  // sent password reset successfully via email
  await transporter.sendMail({
    from: config.smtp_sender,
    to: isExistsUser.email,
    subject: "Password changed",
    html,
  });
};

// verify only otp for forgot password
const verifyForgotPasswordOtpQuery = async (payload: VerifyUserInterface) => {
  const { email, otp } = payload;

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!existingUser) {
    throw new AppError(status.NOT_FOUND, "User not found!");
  }

  if (existingUser.status === "SUSPENDED") {
    throw new AppError(status.CONFLICT, "User is Suspended!");
  }

  if (existingUser.status === "DELETED" || existingUser.isDeleted) {
    throw new AppError(status.NOT_FOUND, "User is deleted!");
  }

  if (existingUser.googleId && existingUser.provider === "GOOGLE") {
    throw new AppError(status.CONFLICT, "User has an account with Google.");
  }

  if (!existingUser.emailVerified) {
    throw new AppError(status.CONFLICT, "Email not verified!");
  }

  const key = `forgot-password:${normalizedEmail}`;

  const redisOtp = await redisClient.get(key);

  if (!redisOtp) {
    throw new AppError(status.UNAUTHORIZED, "OTP expired or invalid!");
  }

  if (redisOtp !== hashOtp(otp)) {
    throw new AppError(status.UNAUTHORIZED, "OTP does not match!");
  }

  return {
    message: "OTP verified successfully!",
  };
};

export const AuthServices = {
  createUserQuery,
  verifyUserEmailQuery,
  loginUserQuery,
  googleLoginQuery,
  forgotPasswordQuery,
  resetPasswordQuery,
  verifyForgotPasswordOtpQuery,
};
