// src/routes/candidatures.routes.js
const express = require('express');
const router = express.Router();

const { query } = require('../db');
const validate = require('../middlewares/validate');
const candidatureSchema = require('../validators/candidature.schema');
const { sendConfirmationEmail } = require('../mailer');

router.get('/health', (_req, res) => res.json({ ok: true }));

router.post('/', validate(candidatureSchema), async (req, res, next) => {
  try {
    const p = req.validated;
    const row = {
      nom: p.nom,
      prenom: p.prenom,
      nationalite: p.nationalite,
      sexe: p.sexe,
      date_naissance: p.dateNaissance,
      lieu_naissance: p.lieuNaissance,
      telephone: p.telephone,
      email: p.email,
      organisation: p.organisation || null,
      pays: p.pays,
      departement: p.departement || null,
      poste_actuel: p.posteActuel,
      description_taches: p.descriptionTaches,
      diplome: p.diplome,
      institution: p.institution,
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
        nom, prenom, nationalite, sexe, date_naissance, lieu_naissance,
        telephone, email, organisation, pays, departement,
        poste_actuel, description_taches, diplome, institution, domaine,
        langues, niveaux, resultats_attendus, autres_infos,
        mode_financement, institution_financement, contact_financement, email_contact_financement,
        source_information, consentement
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,
        $12,$13,$14,$15,$16,
        $17,$18,$19,$20,
        $21,$22,$23,$24,
        $25,$26
      )
      RETURNING id, date_soumission;
    `;

    const values = [
      row.nom, row.prenom, row.nationalite, row.sexe, row.date_naissance, row.lieu_naissance,
      row.telephone, row.email, row.organisation, row.pays, row.departement,
      row.poste_actuel, row.description_taches, row.diplome, row.institution, row.domaine,
      row.langues, row.niveaux, row.resultats_attendus, row.autres_infos,
      row.mode_financement, row.institution_financement, row.contact_financement, row.email_contact_financement,
      row.source_information, row.consentement
    ];

    const result = await query(text, values);
    const { id, date_soumission } = result.rows[0];

    // Non bloquant
    sendConfirmationEmail(p, id, date_soumission);

    return res.status(201).json({
      success: true,
      message: 'Candidature envoyée avec succès.',
      id,
      dateSoumission: date_soumission
    });
  } catch (err) {
    next(err);
  }
});

// ✅ Exporter le router directement (pas d'objet)
module.exports = router;
