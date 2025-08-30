// src/validators/candidature.schema.js
const Joi = require('joi');

const niveauxEnum = ['Débutant', 'Intermédiaire', 'Avancé', 'Natif'];

function isAdult(dateStr) {
  const dob = new Date(dateStr);
  if (isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 18;
}

/** Normalise un niveau libre vers l’un des 4 autorisés (retourne null si impossible) */
function normalizeLevel(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  // supprime les accents puis lowercase
  const bare = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // synonymes / tolérances
  if (bare === 'courant' || bare === 'fluent') return 'Avancé';
  if (bare === 'native' || bare === 'maternelle') return 'Natif';
  if (bare === 'debutant' || bare.startsWith('deb')) return 'Débutant';
  if (bare === 'intermediaire' || bare.startsWith('int')) return 'Intermédiaire';
  if (bare === 'avance' || bare.startsWith('av')) return 'Avancé';

  // si déjà exactement l’une des valeurs autorisées (avec accents/casse corrects)
  if (niveauxEnum.includes(raw)) return raw;

  return null;
}

// Validateur Joi réutilisable qui injecte la valeur normalisée
const levelValidator = Joi.string().custom((v, helpers) => {
  const norm = normalizeLevel(v);
  if (!norm) return helpers.error('any.only', { valids: niveauxEnum });
  return norm; // <- sera la valeur conservée dans req.validated
}, 'normalisation niveau');

const schema = Joi.object({
  nom: Joi.string().max(100).required(),
  prenom: Joi.string().max(100).required(),
  nationalite: Joi.string().max(50).required(),
  sexe: Joi.string().valid('Homme', 'Femme', 'Autre').required(),

  dateNaissance: Joi.string().isoDate().required().custom((value, helpers) => {
    if (!isAdult(value)) return helpers.error('any.custom', { message: 'Âge minimum 18 ans' });
    return value;
  }),

  lieuNaissance: Joi.string().max(50).required(),
  telephone: Joi.string().pattern(/^\+?[1-9]\d{7,14}$/).required(),
  email: Joi.string().email().max(150).required(),

  organisation: Joi.string().max(200).allow(null, ''),
  pays: Joi.string().max(50).required(),
  departement: Joi.string().max(100).allow(null, ''),
  posteActuel: Joi.string().max(100).required(),
  descriptionTaches: Joi.string().max(500).required(),

  diplome: Joi.string().max(50).required(),
  institution: Joi.string().max(200).required(),
  domaine: Joi.string().max(100).required(),

  // Polyglotte : au moins 1 langue, tableau libre
  langues: Joi.array().items(Joi.string().max(50)).min(1).required(),

  // Chaque clé de "niveaux" doit être l’une des langues, avec un niveau normalisé/valide
  niveaux: Joi.object().pattern(Joi.string().max(50), levelValidator).required(),

  resultatsAttendus: Joi.string().max(500).required(),
  autresInfos: Joi.string().max(1000).allow(null, ''),

  mode: Joi.string().valid('Vous-même', 'Institution', 'Autre').required(),
  institutionFinancement: Joi.when('mode', {
    is: Joi.valid('Institution', 'Autre'),
    then: Joi.string().max(200).required(),
    otherwise: Joi.string().max(200).allow(null, '')
  }),
  contactFinancement: Joi.when('mode', {
    is: Joi.valid('Institution', 'Autre'),
    then: Joi.string().max(100).required(),
    otherwise: Joi.string().max(100).allow(null, '')
  }),
  emailContactFinancement: Joi.when('mode', {
    is: Joi.valid('Institution', 'Autre'),
    then: Joi.string().email().max(150).required(),
    otherwise: Joi.string().email().max(150).allow(null, '')
  }),
  source: Joi.string().max(50).required(),
  consentement: Joi.boolean().required()
});

module.exports = schema; // ✅ important