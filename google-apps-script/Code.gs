/**
 * Madar email OTP gateway — Google Apps Script.
 *
 * Deploy as a Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Add Script Property:
 *   MADAR_EMAIL_API_KEY = the same long random value as
 *   GOOGLE_APPS_SCRIPT_SECRET in the backend hosting environment.
 */

function doGet() {
  return json_({ ok: true, service: "madar-email-gateway" });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, error: "invalid_request" });
    }

    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (_) {
      return json_({ ok: false, error: "invalid_json" });
    }

    var expectedKey = PropertiesService.getScriptProperties().getProperty("MADAR_EMAIL_API_KEY") || "";
    var providedKey = String(payload.apiKey || "");
    if (!expectedKey || !constantTimeEquals_(providedKey, expectedKey)) {
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
      "اگر شما این درخواست را ثبت نکرده‌اید، این ایمیل را نادیده بگیرید.\n\n" +
      "سامانه آموزشی مدار";

    var htmlBody =
      '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#f5f7fb;padding:28px;color:#172033">' +
        '<div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e5eaf2;border-radius:16px;padding:28px;text-align:right">' +
          '<div style="font-size:22px;font-weight:700;color:#142b55;margin-bottom:18px">مدار</div>' +
          '<div style="font-size:16px;margin-bottom:12px">کد تأیید حساب شما:</div>' +
          '<div style="direction:ltr;text-align:center;font-size:32px;letter-spacing:8px;font-weight:700;color:#173f85;background:#f1f5fc;border-radius:12px;padding:18px 12px;margin:18px 0">' + code + '</div>' +
          '<div style="font-size:13px;line-height:2;color:#5d687b">این کد تا ' + expiresMinutes + ' دقیقه اعتبار دارد.<br>اگر شما درخواست ثبت‌نام نداده‌اید، این پیام را نادیده بگیرید.</div>' +
          '<div style="border-top:1px solid #edf0f5;margin-top:22px;padding-top:16px;font-size:12px;color:#7b8494">سامانه آموزشی مدار</div>' +
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
    // Never log recipient addresses, OTP values, or the shared secret.
    console.error("Madar email gateway error: " + safeErrorName_(error));
    return json_({ ok: false, error: "mail_send_failed" });
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

function safeErrorName_(error) {
  return error && error.name ? String(error.name).slice(0, 80) : "UnknownError";
}
