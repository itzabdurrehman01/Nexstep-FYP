/**
 * src/server/email.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * SMTP email service using Nodemailer.
 *
 * Configuration via environment variables (never hardcoded):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM
 *
 * Development mode (NODE_ENV !== 'production'):
 *   If SMTP_HOST is not set, falls back to Ethereal (test SMTP) and logs the
 *   preview URL so emails can be inspected without a real mail server.
 *   Verification/reset tokens are also returned in the API response in dev mode.
 *
 * Production mode:
 *   Requires all SMTP_* env vars to be set.
 *   Sends real emails. Tokens are NOT returned in the API response.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import nodemailer from 'nodemailer';

const APP_NAME = 'NexStep AI';
// Account emails must lead users back to the web application, not the API.
const APP_URL = process.env.PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:5173';

// ── Transporter factory ───────────────────────────────────────────────────────
async function createTransporter() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (!process.env.SMTP_HOST) {
    if (isDev) {
      // Use Ethereal for development — zero config required
      const testAccount = await nodemailer.createTestAccount();
      console.log('[Email] No SMTP_HOST set — using Ethereal test account:', testAccount.user);
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
    }
    throw new Error('SMTP_HOST is required in production. Set SMTP_* environment variables.');
  }

  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || '',
    },
    tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
  });
}

const FROM = process.env.SMTP_FROM || `${APP_NAME} <noreply@nexstep.edu.pk>`;

// ── HTML email base template ──────────────────────────────────────────────────
function baseTemplate(heading: string, body: string, ctaLabel?: string, ctaUrl?: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading} — ${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#059669,#0d9488);padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">
                ${APP_NAME}
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
                Your AI-powered career guidance platform
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:700;">${heading}</h2>
              ${body}

              ${ctaLabel && ctaUrl ? `
              <div style="margin:28px 0;">
                <a href="${ctaUrl}"
                   style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;
                          padding:14px 28px;border-radius:10px;font-weight:700;font-size:14px;
                          letter-spacing:0.3px;">
                  ${ctaLabel}
                </a>
              </div>
              <p style="color:#64748b;font-size:12px;margin:8px 0 0;">
                If the button doesn't work, copy and paste this link into your browser:
                <br />
                <a href="${ctaUrl}" style="color:#059669;word-break:break-all;">${ctaUrl}</a>
              </p>
              ` : ''}
            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td style="padding:0 40px 24px;">
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">
                  <strong>Security notice:</strong> If you didn't request this, please ignore this email.
                  Your account is safe. Never share your verification or reset links with anyone.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #f1f5f9;">
              <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.6;">
                © ${new Date().getFullYear()} ${APP_NAME} · Air University Islamabad FYP Project<br />
                Developed by Muhammad Abdur Rehman, Areej Fatima &amp; Faria Ahmed
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Email senders ─────────────────────────────────────────────────────────────

export async function sendVerificationEmail(to: string, firstName: string, token: string) {
  const verifyUrl = `${APP_URL}/#/auth?verify=${token}`;

  const body = `
    <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Hi <strong>${firstName}</strong>, welcome to ${APP_NAME}!
    </p>
    <p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 16px;">
      Please verify your email address to activate your account and start your personalised
      AI career guidance journey.
    </p>
    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">
      This verification link expires in <strong>24 hours</strong>.
    </p>
  `;

  const html = baseTemplate(
    'Verify your email address',
    body,
    'Verify Email Address',
    verifyUrl
  );

  const transporter = await createTransporter();
  const info = await transporter.sendMail({
    from:    FROM,
    to,
    subject: `Verify your ${APP_NAME} account`,
    html,
    text:    `Hi ${firstName},\n\nVerify your email: ${verifyUrl}\n\nLink expires in 24 hours.`,
  });

  if (process.env.NODE_ENV !== 'production') {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log('[Email] Verification preview:', previewUrl);
  }

  return info;
}

export async function sendPasswordResetEmail(to: string, firstName: string, token: string) {
  const resetUrl = `${APP_URL}/#/auth?reset=${token}`;

  const body = `
    <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Hi <strong>${firstName}</strong>,
    </p>
    <p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 16px;">
      We received a request to reset your ${APP_NAME} password. Click the button below
      to choose a new password.
    </p>
    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">
      This link expires in <strong>1 hour</strong>. If you didn't request a password reset,
      you can safely ignore this email — your password has not been changed.
    </p>
  `;

  const html = baseTemplate(
    'Reset your password',
    body,
    'Reset Password',
    resetUrl
  );

  const transporter = await createTransporter();
  const info = await transporter.sendMail({
    from:    FROM,
    to,
    subject: `Reset your ${APP_NAME} password`,
    html,
    text: `Hi ${firstName},\n\nReset your password: ${resetUrl}\n\nLink expires in 1 hour.`,
  });

  if (process.env.NODE_ENV !== 'production') {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log('[Email] Password reset preview:', previewUrl);
  }

  return info;
}

export async function sendPasswordChangedEmail(to: string, firstName: string) {
  const body = `
    <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Hi <strong>${firstName}</strong>,
    </p>
    <p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Your ${APP_NAME} account password was successfully changed on
      <strong>${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })} (PKT)</strong>.
    </p>
    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">
      If you made this change, no further action is required.
      If you did <strong>not</strong> make this change, please contact support immediately and
      reset your password using the link below.
    </p>
  `;

  const html = baseTemplate(
    'Your password has been changed',
    body,
    'Reset Password Now',
    `${APP_URL}/#/auth?tab=forgot`
  );

  const transporter = await createTransporter();
  const info = await transporter.sendMail({
    from:    FROM,
    to,
    subject: `Your ${APP_NAME} password was changed`,
    html,
    text: `Hi ${firstName},\n\nYour password was changed. If this wasn't you, visit: ${APP_URL}/#/auth?tab=forgot`,
  });

  if (process.env.NODE_ENV !== 'production') {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log('[Email] Password changed preview:', previewUrl);
  }

  return info;
}

export async function sendAccountDeletionEmail(to: string, firstName: string) {
  const body = `
    <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Hi <strong>${firstName}</strong>,
    </p>
    <p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 16px;">
      Your ${APP_NAME} account and all associated data have been permanently deleted
      as requested on <strong>${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })} (PKT)</strong>.
    </p>
    <p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 16px;">
      This includes your profile, roadmap progress, interview history, applications,
      bookmarks, and AI conversations. This action cannot be undone.
    </p>
    <p style="color:#64748b;font-size:13px;line-height:1.6;">
      If you change your mind, you are always welcome to create a new account at ${APP_URL}.
    </p>
  `;

  const html = baseTemplate('Your account has been deleted', body);

  const transporter = await createTransporter();
  const info = await transporter.sendMail({
    from:    FROM,
    to,
    subject: `Your ${APP_NAME} account has been deleted`,
    html,
    text: `Hi ${firstName},\n\nYour account was permanently deleted. We're sorry to see you go.`,
  });

  if (process.env.NODE_ENV !== 'production') {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log('[Email] Account deletion preview:', previewUrl);
  }

  return info;
}

export async function sendOtpEmail(to: string, otpCode: string, purpose = 'registration') {
  const purposeTitle = purpose === 'login' ? 'Login Verification' : 'Account Verification';
  const body = `
    <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Hello,
    </p>
    <p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 16px;">
      Your single-use 6-digit authentication code for <strong>${purposeTitle}</strong> on ${APP_NAME} is:
    </p>
    <div style="background:#f0fdf4;border:2px dashed #10b981;border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
      <span style="font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:800;letter-spacing:8px;color:#047857;display:inline-block;">
        ${otpCode}
      </span>
    </div>
    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 8px;">
      This code will expire in <strong>10 minutes</strong>. Do not share this code with anyone.
    </p>
    <p style="color:#94a3b8;font-size:12px;line-height:1.5;">
      If you did not request this verification code, please ignore this email.
    </p>
  `;

  const html = baseTemplate(`${purposeTitle} Code`, body);

  try {
    const transporter = await createTransporter();
    const info = await transporter.sendMail({
      from: FROM,
      to,
      subject: `${otpCode} is your ${APP_NAME} verification code`,
      html,
      text: `Your ${APP_NAME} verification code is ${otpCode}. It expires in 10 minutes.`,
    });

    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) console.log('[Email] OTP preview URL:', previewUrl);
    }

    return info;
  } catch (err: any) {
    console.warn('[Email] Warning: sendOtpEmail delivery fallback:', err.message);
    return null;
  }
}

// ── In-app notification copy (Settings → Preferences → Email notifications) ──
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function sendNotificationEmail(to: string, firstName: string, title: string, message: string, link: string) {
  const url = `${APP_URL}/#${link.startsWith('/') ? link : `/${link}`}`;
  const body = `
    <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi <strong>${escapeHtml(firstName || 'there')}</strong>,</p>
    <p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 16px;">${escapeHtml(message)}</p>
    <p style="color:#64748b;font-size:12px;line-height:1.6;margin:0;">You can turn these emails off in Settings → Preferences.</p>
  `;
  const transporter = await createTransporter();
  return transporter.sendMail({
    from: FROM,
    to,
    subject: `${title} — ${APP_NAME}`,
    html: baseTemplate(escapeHtml(title), body, 'Open NexStep', url),
    text: `Hi ${firstName || 'there'},\n\n${message}\n\nOpen NexStep: ${url}\n\nTurn these emails off in Settings → Preferences.`,
  });
}
