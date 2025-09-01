// src/routes/candidatures.routes.js
const express = require('express');
const router = express.Router();

const { randomUUID } = require('crypto');        // ✅ ajouté
const { query } = require('../db');
const validate = require('../middlewares/validate');
const candidatureSchema = require('../validators/candidature.schema');
const { sendConfirmationEmail } = require('../mailer');

router.get('/health', (_req, res) => res.json({ ok: true }));

// Vérification d’existence e-mail (pour l’auto-complétion du front)
router.get('/exists', async (req, res, next) => {
  try {
    const email = String(req.query.email || '').trim();
    if (!email) return res.status(400).json({ exists: false, message: 'email requis' });

    const dup = await query(
      `SELECT id, uuid, date_soumission
         FROM candidatures
        WHERE LOWER(email) = LOWER($1)
        ORDER BY date_soumission DESC
        LIMIT 1`,
      [email]
    );

    if (dup.rowCount === 0) return res.json({ exists: false });

    const last = dup.rows[0];
    return res.json({
      exists: true,
      last: {
        id: last.id,
        uuid: last.uuid,
        date_soumission: last.date_soumission
      }
    });
  } catch (e) {
    next(e);
  }
});


router.post('/', validate(candidatureSchema), async (req, res, next) => {
  try {
    const p = req.validated;
    const email = (p.email || '').trim();

    // Vérif de duplicat email (insensible à la casse)
    const dup = await query(
      'SELECT id, date_soumission FROM candidatures WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    );
    if (dup.rowCount > 0) {
      const last = dup.rows[0];
      return res.status(409).json({
        success: false,
        message: 'Une candidature avec cet email existe déjà.',
        details: [
          `id: ${last.id}`,
          `dateSoumission: ${last.date_soumission?.toISOString?.() || String(last.date_soumission)}`
        ]
      });
    }

    // ✅ UUID généré côté backend
    const uuid = randomUUID();

    const row = {
      uuid,                                        // ✅ nouveau champ
      nom: p.nom,
      prenom: p.prenom,
      nationalite: p.nationalite,
      sexe: p.sexe,
      date_naissance: p.dateNaissance,
      lieu_naissance: p.lieuNaissance,
      telephone: p.telephone,
      email,
      organisation: p.organisation || null,
      pays: p.pays,
      departement: p.departement || null,
      poste_actuel: p.posteActuel,
      description_taches: p.descriptionTaches,
      diplome: p.diplome,
      institution: p.institution,     // adapte si nécessaire
      domaine: p.domaine,
      langues: p.langues,
      niveaux: p.niveaux,
      resultats_attendus: p.resultatsAttendus,
      autres_infos: p.autresInfos || null,
      mode_financement: p.mode,
      institution_financement: p.institutionFinancement || null,
      contact_financement: p.contactFinancement || null,
      email_contact_financement: p.emailContactFinancement || null,
      source_information: p.source,
      consentement: p.consentement
    };

    const text = `
      INSERT INTO candidatures (
        uuid,                                    -- ✅ nouveau
        nom, prenom, nationalite, sexe, date_naissance, lieu_naissance,
        telephone, email, organisation, pays, departement,
        poste_actuel, description_taches, diplome, institution, domaine,
        langues, niveaux, resultats_attendus, autres_infos,
        mode_financement, institution_financement, contact_financement, email_contact_financement,
        source_information, consentement
      ) VALUES (
        $1,                                       -- uuid
        $2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,
        $18,$19,$20,$21,
        $22,$23,$24,$25,
        $26,$27
      )
      RETURNING id, uuid, date_soumission;
    `;

    const values = [
      row.uuid,
      row.nom, row.prenom, row.nationalite, row.sexe, row.date_naissance, row.lieu_naissance,
      row.telephone, row.email, row.organisation, row.pays, row.departement,
      row.poste_actuel, row.description_taches, row.diplome, row.institution, row.domaine,
      row.langues, row.niveaux, row.resultats_attendus, row.autres_infos,
      row.mode_financement, row.institution_financement, row.contact_financement, row.email_contact_financement,
      row.source_information, row.consentement
    ];

    const result = await query(text, values);
    const { id, uuid: publicUuid, date_soumission } = result.rows[0];

    // Email non bloquant
    (async () => {
      try {
        const r = await sendConfirmationEmail(p, id, date_soumission);
        if (!r || r.ok === false) console.warn('[mailer] email non envoyé:', r?.error || r);
      } catch (e) {
        console.warn('[mailer] email non envoyé (exception):', e?.message || e);
      }
    })();

    return res.status(201).json({
      success: true,
      message: 'Candidature envoyée avec succès.',
      id,
      uuid: publicUuid,                 // ✅ expose l’uuid si tu veux l’utiliser côté front
      dateSoumission: date_soumission
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
