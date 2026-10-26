import { Router } from "express";
import { DonateControllers } from "./donate.controller";

const router = Router();

router.post("/", DonateControllers.donate);
router.get("/payment/callback", DonateControllers.donateCallback);

export const DonateRoutes = router;
