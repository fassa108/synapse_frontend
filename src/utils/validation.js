export const isRequired = (value) => {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const minLength = (value, length) => {
  return String(value).length >= length
}

export const maxLength = (value, length) => {
  return String(value).length <= length
}

// ─── Email ────────────────────────────────────────────────────────────────────

/** Message d'erreur d'un email ('' s'il est valide). Les espaces autour sont ignorés. */
export const erreurEmail = (email) => {
  const valeur = email.trim()
  if (!valeur) return "L'adresse e-mail est obligatoire."
  if (!isValidEmail(valeur)) return 'Veuillez saisir une adresse e-mail valide.'
  return ''
}

// ─── Champs simples ───────────────────────────────────────────────────────────

/** Champ texte obligatoire, avec une longueur minimale facultative. */
export const erreurTexte = (valeur, { libelle, min = 1, max = Infinity }) => {
  const v = valeur.trim()
  if (!v) return `${libelle} est obligatoire.`
  if (v.length < min) return `${libelle} doit contenir au moins ${min} caractères.`
  if (v.length > max) return `${libelle} ne peut pas dépasser ${max} caractères.`
  return ''
}

/** Téléphone facultatif : chiffres, espaces et + - . ( ), 7 à 15 chiffres (même règle que le backend). */
export const erreurTelephone = (valeur) => {
  const v = valeur.trim()
  if (!v) return ''
  const chiffres = v.replace(/\D/g, '').length
  if (!/^[\d\s+().-]+$/.test(v) || chiffres < 7 || chiffres > 15) {
    return 'Saisissez un numéro valide : chiffres, espaces et + - . ( ), 7 chiffres minimum.'
  }
  return ''
}

/** Email facultatif : vide accepté, sinon il doit être valide. */
export const erreurEmailFacultatif = (email) => (email.trim() ? erreurEmail(email) : '')

/**
 * Site web facultatif. « https:// » peut être omis : le backend l'ajoute.
 * Même règle que le backend : http(s), avec un nom de domaine.
 */
export const erreurSiteWeb = (valeur) => {
  let v = valeur.trim()
  if (!v) return ''
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) v = `https://${v}`
  try {
    const url = new URL(v)
    if (['http:', 'https:'].includes(url.protocol) && /^[^.\s]+(\.[^.\s]+)+$/.test(url.hostname)) return ''
  } catch {
    // adresse illisible
  }
  return 'Saisissez une adresse valide, par exemple www.organisme.sn.'
}

// ─── Mot de passe ─────────────────────────────────────────────────────────────
// Règles exigées par le backend et vérifiables ici. Le backend refuse aussi
// les mots de passe trop courants ou trop proches du nom ou de l'email :
// ces messages-là arrivent à l'envoi, sous le champ.

export const CRITERES_MOT_DE_PASSE = [
  { libelle: '8 caractères minimum', test: (v) => v.length >= 8 },
  { libelle: 'Pas uniquement des chiffres', test: (v) => v !== '' && !/^\d+$/.test(v) },
]

// Conseils : ils renforcent le mot de passe sans être exigés.
export const CONSEILS_MOT_DE_PASSE = [
  { libelle: 'Une majuscule', test: (v) => /[A-Z]/.test(v) },
  { libelle: 'Un chiffre', test: (v) => /\d/.test(v) },
  { libelle: 'Un caractère spécial', test: (v) => /[^A-Za-z0-9]/.test(v) },
]

export const erreurMotDePasse = (motDePasse) => {
  if (!motDePasse) return 'Le mot de passe est obligatoire.'
  if (motDePasse.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.'
  if (/^\d+$/.test(motDePasse)) return 'Le mot de passe ne peut pas contenir uniquement des chiffres.'
  return ''
}

export const erreurConfirmation = (motDePasse, confirmation) => {
  if (!confirmation) return 'Confirmez le mot de passe.'
  if (confirmation !== motDePasse) return 'Les mots de passe ne correspondent pas.'
  return ''
}
