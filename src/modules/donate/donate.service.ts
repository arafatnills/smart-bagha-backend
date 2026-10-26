import status from "http-status";
import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { DonateAmount } from "./donate.interface";



// create payment url for bkash payment
const donateQuery = async (payload: DonateAmount, user: RequestUser) => {
  // bkash payments
  const transitionResult = await prisma.$transaction(async (tx) => {
    const bkashIdToken = await getBkashIdToken();
    if (!bkashIdToken) {
      throw new AppError(status.NOT_FOUND, "No Bkash Access Token Found!");
    }

    const donar = await tx.donar.findUnique({
      where: {
        userId: user.userId
      }
    })

    if(!donar){
      throw new AppError(status.NOT_FOUND, "Donar Not Found!")
    }

    if(donar.isDeleted){
      throw new AppError(status.NOT_FOUND, "Donar is Deleted!")
    }

    if(payload.amount){
      throw new AppError(status.NOT_FOUND, "Donate Amount Not Found!")
    }

    

    const bkashCreatePaymentResponse = await fetch(
      `${config.bkash_base_url}/tokenized/checkout/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: bkashIdToken,
          "X-App-Key": config.bkash_app_key,
        },
        body: JSON.stringify({
          mode: "0011",
          // payerReference: "0123456789", //user email or phone number
          payerReference: "01772162533",
          callbackURL: `${config.bkash_callback_url}/donate/payment/callback`,
          amount: "200",
          currency: "BDT",
          intent: "sale",
          // merchantInvoiceNumber: "Inv31sd44",
          merchantInvoiceNumber: `Inv${new Date()})}`,
        }),
      },
    );
    const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();
    return {
      paymentUrl: bkashCreatePaymentResult.bkashURL,
    };
  });

  return transitionResult
};

// execute the donate query and return the payment url
const donateCallbackQuery = async (query: Record<string, any>) => {
  const transitionResult = await prisma.$transaction(async (tx) => {
    const { paymentID, status: paymentStatus } = query;
    if (!paymentID) {
      throw new AppError(status.NOT_FOUND, "Payment Id Missing");
    }
    if (!paymentStatus) {
      throw new AppError(status.NOT_FOUND, "Payment Status is Missing");
    }
    const bkashIdToken = await getBkashIdToken();

    if (!bkashIdToken) {
      throw new AppError(status.NOT_FOUND, "No Bkash Access Token Found!");
    }
    const executedPaymentResponse = await fetch(
      `${config.bkash_base_url}/tokenized/checkout/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: bkashIdToken,
          "X-App-Key": config.bkash_app_key,
        },
        body: JSON.stringify({ paymentID: paymentID }),
      },
    );

    const executedResult = await executedPaymentResponse.json();

    if (executedResult.statusCode === "0000" && paymentStatus === "success") {
      console.log(executedResult, "all is okay");
    }

    return executedResult;
  });

  return transitionResult;
};
export const DonateServices = { donateQuery, donateCallbackQuery };
