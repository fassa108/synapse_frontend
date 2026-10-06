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
