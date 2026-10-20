import PDFDocument from "pdfkit";

export interface InvoiceData {
    invoiceId: string;
    learnerName: string;
    learnerEmail: string;
    mentorName: string;
    mentorExpertise: string | null;
    appointmentId: string;
    serialNumber: number;
    joiningTime: Date | string;
    scheduleDate: Date | string;
    meetingLink: string;
    amount: number;
    transactionId: string;
    paidAt: Date | string;
}

/**
 * Safely converts standard Date objects, ISO strings, or bKash date strings
 * (e.g. '2026-10-18T10:16:06:651 GMT+0600') into a valid Date instance.
 */
const toValidDate = (input: Date | string | null | undefined): Date => {
    if (input instanceof Date) {
        return Number.isNaN(input.getTime()) ? new Date() : input;
    }
    if (typeof input === "string" && input.trim()) {
        const normalized = input
            .trim()
            .replace(/:(\d{3})\s*GMT([+-]\d{2})(\d{2})$/, ".$1$2:$3");
        const parsed = new Date(normalized);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }
    return new Date();
};

export const generateInvoicePdf = (data: InvoiceData): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        // A4 dimensions: 595.28 x 841.89 pt
        // Setting bottom margin to 0 prevents PDFKit from auto-adding blank pages
        // when drawing elements near the footer.
        const doc = new PDFDocument({
            size: "A4",
            margins: { top: 40, bottom: 0, left: 45, right: 45 },
            bufferPages: false,
            info: {
                Title: `SkillForge Invoice ${data.invoiceId}`,
                Author: "SkillForge",
            },
        });

        const chunks: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => chunks.push(chunk));
        doc.on("error", reject);
        doc.on("end", () => resolve(Buffer.concat(chunks)));

        // Color Palette
        const colors = {
            navy: "#0F172A",
            primary: "#2563EB",
            primaryLight: "#EFF6FF",
            primaryBorder: "#BFDBFE",
            slate: "#334155",
            muted: "#64748B",
            lightBg: "#F8FAFC",
            border: "#E2E8F0",
            green: "#059669",
            greenBg: "#DCFCE7",
            greenBorder: "#86EFAC",
            white: "#FFFFFF",
        };

        const pageWidth = 595.28;
        const left = 45;
        const right = pageWidth - 45; // 550.28
        const contentWidth = right - left; // 505.28

        // Date/Time Formatters with Safe Date Guard
        const formatDate = (dateInput: Date | string) =>
            new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }).format(toValidDate(dateInput));

        const formatDateTime = (dateInput: Date | string) =>
            new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            }).format(toValidDate(dateInput));

        const formatTime = (dateInput: Date | string) =>
            new Intl.DateTimeFormat("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            }).format(toValidDate(dateInput));

        const formatCurrency = (amount: number) =>
            `BDT ${Number(amount || 0).toLocaleString("en-BD", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}`;

        // Helper: Text Renderer (lineBreak prevents accidental page overflow)
        const drawText = (
            value: string,
            x: number,
            y: number,
            options: {
                size?: number;
                color?: string;
                bold?: boolean;
                width?: number;
                align?: "left" | "center" | "right";
                ellipsis?: boolean;
            } = {},
        ) => {
            doc
                .font(options.bold ? "Helvetica-Bold" : "Helvetica")
                .fontSize(options.size ?? 10)
                .fillColor(options.color ?? colors.navy)
                .text(value, x, y, {
                    width: options.width ?? 230,
                    align: options.align ?? "left",
                    lineGap: 2,
                    ellipsis: options.ellipsis ?? true,
                });
        };

        // Helper: Horizontal Divider
        const drawDivider = (y: number, color = colors.border) => {
            doc
                .moveTo(left, y)
                .lineTo(right, y)
                .lineWidth(1)
                .strokeColor(color)
                .stroke();
        };

        // Helper: Label + Value Pair
        const drawField = (
            label: string,
            value: string,
            x: number,
            y: number,
            width = 215,
        ) => {
            drawText(label.toUpperCase(), x, y, {
                size: 7.5,
                bold: true,
                color: colors.muted,
                width,
            });
            drawText(value || "N/A", x, y + 13, {
                size: 10,
                bold: true,
                color: colors.navy,
                width,
            });
        };

        // Helper: Card Container with Header Band
        const drawCard = (
            title: string,
            x: number,
            y: number,
            w: number,
            h: number,
        ) => {
            // Card body
            doc
                .roundedRect(x, y, w, h, 8)
                .fillAndStroke(colors.white, colors.border);

            // Card header fill
            doc
                .save()
                .roundedRect(x, y, w, 30, 8)
                .clip()
                .rect(x, y, w, 30)
                .fillColor(colors.lightBg)
                .fill()
                .restore();

            // Header bottom border
            doc
                .moveTo(x, y + 30)
                .lineTo(x + w, y + 30)
                .lineWidth(1)
                .strokeColor(colors.border)
                .stroke();

            // Accent dot + Title
            doc
                .circle(x + 14, y + 15, 3)
                .fillColor(colors.primary)
                .fill();

            drawText(title, x + 23, y + 10, {
                size: 9.5,
                bold: true,
                color: colors.slate,
                width: w - 35,
            });
        };

        // =====================================================
        // 1. TOP BRAND BANNER & HEADER (y: 0 -> 105)
        // =====================================================
        doc.rect(0, 0, pageWidth, 6).fillColor(colors.primary).fill();

        // Brand Logo Box
        doc
            .roundedRect(left, 32, 36, 36, 8)
            .fillColor(colors.primary)
            .fill();
        drawText("SF", left, 42, {
            size: 16,
            bold: true,
            color: colors.white,
            width: 36,
            align: "center",
        });

        // Brand Name & Tagline
        drawText("SkillForge", left + 46, 33, {
            size: 22,
            bold: true,
            color: colors.navy,
            width: 250,
        });
        drawText("LEARN  •  GROW  •  BUILD YOUR FUTURE", left + 47, 58, {
            size: 7.5,
            bold: true,
            color: colors.muted,
            width: 250,
        });

        // Right Side: INVOICE Title & PAID Badge
        drawText("INVOICE", right - 180, 30, {
            size: 18,
            bold: true,
            color: colors.navy,
            width: 180,
            align: "right",
        });

        // PAID Status Pill
        const badgeWidth = 78;
        const badgeX = right - badgeWidth;
        doc
            .roundedRect(badgeX, 54, badgeWidth, 22, 11)
            .fillAndStroke(colors.greenBg, colors.greenBorder);

        doc
            .circle(badgeX + 16, 65, 3.5)
            .fillColor(colors.green)
            .fill();

        drawText("PAID", badgeX + 24, 60, {
            size: 9.5,
            bold: true,
            color: colors.green,
            width: 45,
        });

        drawDivider(92);

        // =====================================================
        // 2. INVOICE META SUMMARY BAR (y: 106 -> 162)
        // =====================================================
        doc
            .roundedRect(left, 106, contentWidth, 52, 8)
            .fillAndStroke(colors.lightBg, colors.border);

        const col1 = left + 16;
        const col2 = left + 195;
        const col3 = left + 355;

        drawField("Invoice Number", data.invoiceId, col1, 118, 170);
        drawField("Issue Date", formatDate(new Date()), col2, 118, 145);
        drawField("Payment Date", formatDateTime(data.paidAt), col3, 118, 145);

        // =====================================================
        // 3. LEARNER & MENTOR CARDS (Side-by-Side, y: 174 -> 296)
        // =====================================================
        const halfCardWidth = (contentWidth - 15) / 2; // ~245 pt each
        const cardY = 174;
        const cardHeight = 120;

        // Left Card: Learner Information
        drawCard("LEARNER INFORMATION", left, cardY, halfCardWidth, cardHeight);
        drawField("Full Name", data.learnerName, left + 14, cardY + 42, halfCardWidth - 28);
        drawField("Email Address", data.learnerEmail, left + 14, cardY + 80, halfCardWidth - 28);

        // Right Card: Mentor Information
        const rightCardX = left + halfCardWidth + 15;
        drawCard("MENTOR INFORMATION", rightCardX, cardY, halfCardWidth, cardHeight);
        drawField("Mentor Name", data.mentorName, rightCardX + 14, cardY + 42, halfCardWidth - 28);
        drawField(
            "Area of Expertise",
            data.mentorExpertise || "General Mentorship",
            rightCardX + 14,
            cardY + 80,
            halfCardWidth - 28,
        );

        // =====================================================
        // 4. APPOINTMENT DETAILS CARD (y: 310 -> 468)
        // =====================================================
        const apptY = 310;
        const apptHeight = 158;
        drawCard("APPOINTMENT DETAILS", left, apptY, contentWidth, apptHeight);

        const leftColX = left + 16;
        const rightColX = left + 265;

        drawField("Appointment ID", data.appointmentId, leftColX, apptY + 42, 235);
        drawField(
            "Serial Number",
            `#${String(data.serialNumber).padStart(2, "0")}`,
            rightColX,
            apptY + 42,
            220,
        );

        drawField("Schedule Date", formatDate(data.scheduleDate), leftColX, apptY + 82, 235);
        drawField("Joining Time", formatTime(data.joiningTime), rightColX, apptY + 82, 220);

        // Meeting Link Box inside Appointment Card
        const meetingBoxY = apptY + 120;
        doc
            .roundedRect(left + 14, meetingBoxY, contentWidth - 28, 28, 6)
            .fillAndStroke(colors.primaryLight, colors.primaryBorder);

        drawText("SESSION LINK:", left + 26, meetingBoxY + 9, {
            size: 8,
            bold: true,
            color: colors.primary,
            width: 90,
        });

        const validMeetingLink = /^https?:\/\//i.test(data.meetingLink)
            ? data.meetingLink
            : "";

        if (validMeetingLink) {
            doc
                .font("Helvetica-Bold")
                .fontSize(9)
                .fillColor(colors.primary)
                .text("Click Here to Join Live Session", left + 100, meetingBoxY + 9, {
                    width: contentWidth - 140,
                    link: validMeetingLink,
                    underline: true,
                    lineBreak: false,
                });
        } else {
            drawText("Link will be shared before the session", left + 100, meetingBoxY + 9, {
                size: 9,
                color: colors.muted,
                width: contentWidth - 140,
            });
        }

        // =====================================================
        // 5. PAYMENT SUMMARY & BREAKDOWN (y: 484 -> 645)
        // =====================================================
        const payY = 484;
        const payHeight = 160;
        drawCard("PAYMENT SUMMARY", left, payY, contentWidth, payHeight);

        drawField("Transaction ID (bKash)", data.transactionId, leftColX, payY + 42, 235);
        drawField("Payment Method", "bKash Tokenized Checkout", rightColX, payY + 42, 220);

        drawDivider(payY + 82, colors.border);

        // Line item description
        drawText("Description", leftColX, payY + 92, {
            size: 8,
            bold: true,
            color: colors.muted,
            width: 250,
        });
        drawText("Amount", right - 160, payY + 92, {
            size: 8,
            bold: true,
            color: colors.muted,
            width: 144,
            align: "right",
        });

        drawText(
            `1-on-1 Mentorship Appointment with ${data.mentorName}`,
            leftColX,
            payY + 106,
            {
                size: 9.5,
                bold: true,
                color: colors.navy,
                width: 320,
            },
        );
        drawText(formatCurrency(data.amount), right - 160, payY + 106, {
            size: 9.5,
            bold: true,
            color: colors.navy,
            width: 144,
            align: "right",
        });

        // Total Amount Highlight Bar at bottom of Payment Card
        const totalBarY = payY + 126;
        doc
            .roundedRect(left + 10, totalBarY, contentWidth - 20, 26, 6)
            .fillColor(colors.greenBg)
            .fill();

        drawText("TOTAL AMOUNT PAID", left + 22, totalBarY + 8, {
            size: 9,
            bold: true,
            color: colors.green,
            width: 200,
        });

        drawText(formatCurrency(data.amount), right - 190, totalBarY + 6, {
            size: 13,
            bold: true,
            color: colors.green,
            width: 168,
            align: "right",
        });

        // =====================================================
        // 6. THANK YOU BANNER & FOOTER (y: 665 -> 765)
        // Guaranteed < 841.89pt so it strictly stays on 1 A4 page
        // =====================================================
        const thankYouY = 665;
        doc
            .roundedRect(left, thankYouY, contentWidth, 50, 8)
            .fillAndStroke(colors.primaryLight, colors.primaryBorder);

        drawText("Thank you for choosing SkillForge!", left, thankYouY + 12, {
            size: 11,
            bold: true,
            color: colors.navy,
            width: contentWidth,
            align: "center",
        });

        drawText(
            "Please join the meeting 5 minutes before your scheduled joining time. Best wishes on your learning journey!",
            left,
            thankYouY + 29,
            {
                size: 8.5,
                color: colors.slate,
                width: contentWidth,
                align: "center",
            },
        );

        // Footer Line & Note
        drawDivider(740);

        drawText(
            "This is a computer-generated official payment receipt from SkillForge and does not require a physical signature.",
            left,
            752,
            {
                size: 8,
                color: colors.muted,
                width: contentWidth,
                align: "center",
            },
        );

        doc.end();
    });
};