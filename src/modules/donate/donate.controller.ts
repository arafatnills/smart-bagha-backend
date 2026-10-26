import { Request, Response } from "express";
import status from "http-status";
import { AppError } from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { DonateServices } from "./donate.service";

const donate = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body
  const user = req.user
  if(!user){
    throw new AppError(status.NOT_FOUND, "user not found!")
  }
  const result = await DonateServices.donateQuery(payload, user);
  sendResponse(res, {
    success: true,
    status: status.CREATED,
    message: "Bkash Payment URL Created!",
    data: result
  });
});
const donateCallback = catchAsync(async (req: Request, res: Response) => {
  const result = await DonateServices.donateCallbackQuery(req.query);
  sendResponse(res, {
    success: true,
    status: status.CREATED,
    message: "Donate successful!",
    data: result
  });
});

export const DonateControllers = {
  donate,
  donateCallback
};
