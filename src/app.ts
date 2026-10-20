import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type NextFunction,
	type Request,
	type Response,
} from "express";
import status from "http-status";
import config from "./config";
import { prisma } from "./lib/prisma";
import { globalErrorHandler } from "./middleware/globalErrorHandeler";
import { AuthRoutes } from "./modules/auth/auth.routes";
import { UserRoutes } from "./modules/user/user.routes";
import sendResponse from "./utils/sendResponse";

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
app.get(
	"/api/v1/users/test",
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const user = await prisma.user.findMany({
				where: {
					role: "DONOR",
				},
			});

			sendResponse(res, {
				success: true,
				status: status.OK,
				message: "Welcome to backend server!",
				data: user,
			});
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

// global error handler
app.use(globalErrorHandler);

export default app;
