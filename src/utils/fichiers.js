/**
 * Contrôles côté navigateur avant l'envoi d'un fichier (ressource ou
 * livrable). Le backend refait ces contrôles et vérifie aussi le contenu réel.
 */

export const EXTENSIONS_AUTORISEES = ['pdf', 'docx', 'pptx', 'txt']
export const TAILLE_MAX = 10 * 1024 * 1024 // 10 Mo
export const ACCEPT_FICHIERS = EXTENSIONS_AUTORISEES.map((e) => `.${e}`).join(',')

// Retourne un message d'erreur, ou '' si le fichier est acceptable.
export const verifierFichier = (fichier) => {
  if (!fichier) return ''
  const ext = fichier.name.includes('.') ? fichier.name.split('.').pop().toLowerCase() : ''
  if (!EXTENSIONS_AUTORISEES.includes(ext)) {
    return `Format non accepté. Formats autorisés : ${EXTENSIONS_AUTORISEES.join(', ')}.`
  }
  if (fichier.size > TAILLE_MAX) {
    return 'Le fichier ne doit pas dépasser 10 Mo.'
  }
  return ''
}

export const tailleLisible = (octets) => {
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}
