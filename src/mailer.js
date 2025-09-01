// src/mailer.js
'use strict';

const nodemailer = require('nodemailer');

function bool(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  const s = String(v).toLowerCase().trim();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

const COLORS = {
  primary: '#15199E',
  accent:  '#3AC569',
  text:    '#222222',
  muted:   '#555555',
  bg:      '#F5F7FB',
  card:    '#FFFFFF',
  border:  '#E5E7EB'
};

// ---------- Utils ----------
function escapeHtml(x) {
  return String(x ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderNiveaux(niveaux) {
  if (!niveaux || typeof niveaux !== 'object') return '';
  const rows = Object.entries(niveaux).map(([lang, lvl]) => `
    <tr>
      <td style="padding:6px 10px;border:1px solid ${COLORS.border};">${escapeHtml(lang)}</td>
      <td style="padding:6px 10px;border:1px solid ${COLORS.border};">${escapeHtml(lvl)}</td>
    </tr>`).join('');
  if (!rows) return '';
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-top:8px;border:1px solid ${COLORS.border};border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:${COLORS.bg}">
          <th align="left" style="padding:8px 10px;border-right:1px solid ${COLORS.border};font-family:Arial,Helvetica,sans-serif;color:${COLORS.muted};font-size:13px;">Langue</th>
          <th align="left" style="padding:8px 10px;font-family:Arial,Helvetica,sans-serif;color:${COLORS.muted};font-size:13px;">Niveau</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ⬇️ Désormais on prend un UUID (pas l'ID numérique)
function renderCandidatureHTML(payload, uuid, dateSoumission) {
  const p = payload || {};
  const ds = (dateSoumission && dateSoumission.toISOString) ? dateSoumission.toISOString() : new Date().toISOString();

  const financementBlock = (p.mode === 'Institution' || p.mode === 'Autre') ? `
    <tr><td style="padding:8px 0;color:${COLORS.muted};font-size:13px;">Institution de financement</td><td style="padding:8px 0;">${escapeHtml(p.institutionFinancement || '')}</td></tr>
    <tr><td style="padding:8px 0;color:${COLORS.muted};font-size:13px;">Contact financement</td><td style="padding:8px 0;">${escapeHtml(p.contactFinancement || '')}</td></tr>
    <tr><td style="padding:8px 0;color:${COLORS.muted};font-size:13px;">Email contact financement</td><td style="padding:8px 0;">${escapeHtml(p.emailContactFinancement || '')}</td></tr>
  ` : '';

  const niveauxTable = renderNiveaux(p.niveaux);

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Confirmation de candidature – #${escapeHtml(uuid)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${COLORS.bg};">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;background:${COLORS.card};border-radius:16px;overflow:hidden;border:1px solid ${COLORS.border};">
          <tr><td style="background:${COLORS.primary};height:6px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding:20px 24px 8px 24px;">
              <h1 style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;color:${COLORS.primary};font-size:22px;line-height:1.25;">Confirmation de candidature</h1>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;color:${COLORS.muted};font-size:14px;">
                Identifiant : <strong style="color:${COLORS.text}">#${escapeHtml(uuid)}</strong> &nbsp;·&nbsp;
                Soumise le : <strong style="color:${COLORS.text}">${escapeHtml(ds)}</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 0 24px;">
              <p style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;color:${COLORS.text};font-size:14px;line-height:1.55;">
                Bonjour ${escapeHtml(p.prenom)} ${escapeHtml(p.nom)},<br>
                Nous vous confirmons la réception de votre candidature. Voici un récapitulatif de votre soumission.
              </p>
              <div style="margin:10px 0 16px 0;">
                <span style="display:inline-block;padding:12px 18px;background:${COLORS.accent};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">
                  Candidature enregistrée
                </span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 20px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                <tr><td style="padding:8px 0;color:${COLORS.muted};font-size:13px;width:36%;">Nom complet</td><td style="padding:8px 0;">${escapeHtml(p.prenom)} ${escapeHtml(p.nom)}</td></tr>
                <tr><td style="padding:8px 0;color:${COLORS.muted};font-size:13px;">Email</td><td style="padding:8px 0;">${escapeHtml(p.email)}</td></tr>
                <tr><td style="padding:8px 0;color:${COLORS.muted};font-size:13px;">Téléphone</td><td style="padding:8px 0;">${escapeHtml(p.telephone)}</td></tr>
                <tr><td style="padding:8px 0;color:${COLORS.muted};font-size:13px;">Nationalité</td><td style="padding:8px 0;">${escapeHtml(p.nationalite)}</td></tr>
                <tr><td style="padding:8px 0;color:${COLORS.muted};font-size:13px;">Poste actuel</td><td style="padding:8px 0;">${escapeHtml(p.posteActuel)}</td></tr>
                <tr><td style="padding:8px 0;color:${COLORS.muted};font-size:13px;">Mode de financement</td><td style="padding:8px 0;">${escapeHtml(p.mode)}</td></tr>
                ${financementBlock}
                <tr><td style="padding:8px 0;color:${COLORS.muted};font-size:13px;">Langues</td><td style="padding:8px 0;">${Array.isArray(p.langues) ? escapeHtml(p.langues.join(', ')) : ''}</td></tr>
              </table>
              ${niveauxTable}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 22px 24px;border-top:1px solid ${COLORS.border};background:#fff;">
              <p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;color:${COLORS.muted};font-size:12px;">Cet email a été envoyé automatiquement — merci de ne pas y répondre directement.</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;color:${COLORS.muted};font-size:12px;">© ${new Date().getFullYear()} GPE Cameroun</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderTextFallback(payload, uuid, dateSoumission) {
  const p = payload || {};
  const ds = (dateSoumission && dateSoumission.toISOString) ? dateSoumission.toISOString() : new Date().toISOString();
  return `Bonjour ${p.prenom || ''} ${p.nom || ''},

Votre candidature a bien été reçue.
Identifiant: #${uuid}
Date de soumission: ${ds}

Récapitulatif:
- Nom: ${p.nom || ''}
- Prénom: ${p.prenom || ''}
- Email: ${p.email || ''}
- Téléphone: ${p.telephone || ''}
- Mode de financement: ${p.mode || ''}

Merci pour votre intérêt.`;
}

function getTransporter() {
  const { SMTP_HOST, SMTP_SECURE, EMAIL_USER, EMAIL_PASS, SMTP_DEBUG } = process.env;
  const port = Number(process.env.SMTP_PORT || 587);

  if (!SMTP_HOST || !EMAIL_USER || !EMAIL_PASS) {
    console.warn('[mailer] SMTP non configuré. Aucun email ne sera envoyé.');
    return null;
  }

  const secure = bool(SMTP_SECURE, port === 465);
  if (port === 587 && secure) {
    console.warn('[mailer] Attention: SMTP_SECURE=true avec port 587. Utilisez false (STARTTLS) ou port 465.');
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,                         // 465 => SSL, 587 => STARTTLS (secure=false)
    requireTLS: port === 587 && !secure,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    logger: bool(SMTP_DEBUG),
    debug: bool(SMTP_DEBUG),
    tls: { minVersion: 'TLSv1.2', servername: SMTP_HOST }
  });

  if (bool(process.env.EMAIL_VERIFY_ON_BOOT)) {
    transporter.verify()
      .then(() => console.log('[mailer] SMTP prêt (verify OK).'))
      .catch((e) => console.error('[mailer] Échec verify SMTP:', e?.message));
  }
  return transporter;
}

// ⚠️ Ici, on attend maintenant un UUID en 2e paramètre
async function sendConfirmationEmail(payload, candidatureUuid, dateSoumission) {
  try {
    const transporter = getTransporter();
    if (!transporter) return;

    const smtpUser = process.env.EMAIL_USER || 'no-reply@example.com';
    const envFrom  = process.env.EMAIL_FROM || smtpUser;

    // From = EMAIL_USER (DMARC). Reply-To = EMAIL_FROM si différent.
    const from    = smtpUser;
    const replyTo = envFrom !== smtpUser ? envFrom : undefined;

    const html = renderCandidatureHTML(payload, candidatureUuid, dateSoumission);
    const text = renderTextFallback(payload, candidatureUuid, dateSoumission);

    const mailOptions = {
      from,
      replyTo,
      to: payload.email,
      bcc: process.env.EMAIL_BCC || undefined,
      subject: `Confirmation de candidature – #${candidatureUuid}`,
      html,
      text
    };

    const info = await transporter.sendMail(mailOptions);
    if (bool(process.env.SMTP_DEBUG)) console.log('[mailer] Email envoyé:', info.messageId, info.response);
  } catch (e) {
    console.error('[mailer] Erreur envoi email (non bloquant):', e?.message || e);
  }
}

module.exports = {
  sendConfirmationEmail,
  getTransporter,
  renderCandidatureHTML, // pour le preview
  renderTextFallback,    // pour le preview
};
