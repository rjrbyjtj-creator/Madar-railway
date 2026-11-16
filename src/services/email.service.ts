import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

type AppsScriptResponse = {
  ok?: boolean;
  error?: string;
};

export async function sendEmailCode(to: string, code: string, expiresMinutes: number): Promise<void> {
  if (!env.GOOGLE_APPS_SCRIPT_URL || !env.GOOGLE_APPS_SCRIPT_SECRET) {
    throw new AppError(
      503,
      "EMAIL_NOT_CONFIGURED",
      "ارسال ایمیل هنوز فعال نشده است. آدرس Google Apps Script و کلید امنیتی را در تنظیمات سرور وارد کن.",
    );
  }

  let response: Response;
  try {
    response = await fetch(env.GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: env.GOOGLE_APPS_SCRIPT_SECRET,
        to,
        code,
        expiresMinutes,
      }),
      signal: AbortSignal.timeout(30000),
      redirect: "follow",
    });
  } catch (error) {
    console.error("Google Apps Script email request failed:", error instanceof Error ? error.message : error);
    throw new AppError(
      502,
      "EMAIL_DELIVERY_FAILED",
      "ارتباط با سرویس ایمیل گوگل برقرار نشد. چند لحظه دیگر دوباره امتحان کن.",
    );
  }

  let result: AppsScriptResponse;
  try {
    result = (await response.json()) as AppsScriptResponse;
  } catch {
    console.error("Google Apps Script returned a non-JSON response:", response.status);
    throw new AppError(
      502,
      "EMAIL_DELIVERY_FAILED",
      "پاسخ سرویس ایمیل گوگل معتبر نبود. تنظیمات اسکریپت را بررسی کن.",
    );
  }

  if (!response.ok || result.ok !== true) {
    // Do not log the request body or API key. Apps Script returns only a safe error code.
    console.error("Google Apps Script email delivery failed:", response.status, result.error ?? "unknown_error");
    throw new AppError(
      502,
      "EMAIL_DELIVERY_FAILED",
      result.error === "daily_quota_exceeded"
        ? "سهمیه روزانه ارسال ایمیل حساب گوگل تمام شده است. فردا دوباره امتحان کن."
        : "ارسال ایمیل انجام نشد. دسترسی و تنظیمات Google Apps Script را بررسی کن.",
    );
  }
}
