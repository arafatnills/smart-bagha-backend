import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type NextFunction,
	type Request,
	type Response,
} from "express";
import status from "http-status";
import config from "./config";
import { globalErrorHandler } from "./middleware/globalErrorHandeler";
import { AuthRoutes } from "./modules/auth/auth.routes";
import { DonateRoutes } from "./modules/donate/donate.routes";
import { UserRoutes } from "./modules/user/user.routes";

const app = express();

app.use(
  cors({
    origin: [
      config.app_url,
      "http://localhost:3000",
      "http://localhost:5173",
    ].filter(Boolean),
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// test apis
app.post(
  "/api/v1/grant",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bkashResponse = await fetch(
        `${config.bkash_base_url}/tokenized/checkout/token/grant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            username: config.bkash_username,
            password: config.bkash_password,
          },
         body: JSON.stringify({
			app_key: config.bkash_app_key,
			app_secret: config.bkash_app_secret
		 })
        },
      );
      const result = await bkashResponse.json()
	  console.log(result)
    } catch (error) {
      next(error);
    }
  },
);

app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    status: status.OK,
    message: "Welcome to backend server!",
  });
});

// all APIs routes
app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/user", UserRoutes);
app.use("/api/v1/donate", DonateRoutes);

// global error handler
app.use(globalErrorHandler);

export default app;
