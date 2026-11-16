/**
 * Madar email verification sender.
 *
 * Deploy this project as a Web app:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Before deployment, add this Script Property:
 *   MADAR_EMAIL_API_KEY = the same long random value used by
 *   GOOGLE_APPS_SCRIPT_SECRET in the Render environment.
 *
 * The API key is never included in email content or logs.
 */

function doGet() {
  return json_({ ok: true, service: "madar-email" });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, error: "invalid_request" });
    }

    var payload = JSON.parse(e.postData.contents);
    var expectedKey = PropertiesService.getScriptProperties().getProperty("MADAR_EMAIL_API_KEY");

    if (!expectedKey || !payload.apiKey || !constantTimeEquals_(String(payload.apiKey), expectedKey)) {
      return json_({ ok: false, error: "unauthorized" });
    }

    var recipient = String(payload.to || "").trim();
    var code = String(payload.code || "").trim();
    var expiresMinutes = Number(payload.expiresMinutes);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) ||
        !/^\d{6}$/.test(code) ||
        !Number.isInteger(expiresMinutes) ||
        expiresMinutes < 1 ||
        expiresMinutes > 30) {
      return json_({ ok: false, error: "invalid_payload" });
    }

    if (MailApp.getRemainingDailyQuota() < 1) {
      return json_({ ok: false, error: "daily_quota_exceeded" });
    }

    var subject = "کد تأیید حساب مدار";
    var plainBody =
      "برای تکمیل ثبت‌نام در مدار، کد زیر را وارد کنید:\n\n" +
      code +
      "\n\nاین کد تا " + expiresMinutes + " دقیقه معتبر است.\n" +
      "اگر شما این درخواست را ثبت نکرده‌اید، این ایمیل را نادیده بگیرید.";

    var htmlBody =
      '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#f5f6f8;padding:32px;color:#17233f">' +
        '<div style="max-width:520px;margin:auto;background:#fff;border:1px solid #e5e8ef;border-radius:16px;padding:30px">' +
          '<h2 style="color:#14264f;margin-top:0">تأیید حساب مدار</h2>' +
          '<p>برای تکمیل ثبت‌نام، کد زیر را در وب‌سایت مدار وارد کنید:</p>' +
          '<div dir="ltr" style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#b8892d;padding:18px 0">' + code + '</div>' +
          '<p>این کد تا ' + expiresMinutes + ' دقیقه معتبر است.</p>' +
          '<small>اگر شما این درخواست را ثبت نکرده‌اید، این ایمیل را نادیده بگیرید.</small>' +
        '</div>' +
      '</div>';

    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody,
      name: "مدار"
    });

    return json_({ ok: true });
  } catch (error) {
    console.error("Madar email sender error: " + (error && error.message ? error.message : error));
    return json_({ ok: false, error: "send_failed" });
  }
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function constantTimeEquals_(a, b) {
  if (a.length !== b.length) return false;
  var mismatch = 0;
  for (var i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
