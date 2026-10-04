/**
 * Contrôles côté navigateur avant l'envoi d'un fichier (ressource ou
 * livrable). Le backend refait ces contrôles et vérifie aussi le contenu réel.
 */

import { ref } from 'vue'
import api from '../services/api'

export const EXTENSIONS_AUTORISEES = ['pdf', 'docx', 'pptx', 'txt']
export const ACCEPT_FICHIERS = EXTENSIONS_AUTORISEES.map((e) => `.${e}`).join(',')

// Taille maximale en Mo, réglée côté backend (TAILLE_MAX_FICHIER_MO).
// 10 en attendant la réponse de l'API : le backend reste seul juge.
export const tailleMaxMo = ref(10)

let chargement = null

// Lit la limite une seule fois ; à rappeler sans crainte dans chaque formulaire.
export const chargerLimitesFichiers = () => {
  chargement ??= api
    .get('limites-fichiers/')
    .then((r) => {
      tailleMaxMo.value = r.data.taille_max_fichier_mo
    })
    .catch(() => {
      chargement = null // nouvel essai au prochain formulaire
    })
  return chargement
}

// Retourne un message d'erreur, ou '' si le fichier est acceptable.
export const verifierFichier = (fichier) => {
  if (!fichier) return ''
  const ext = fichier.name.includes('.') ? fichier.name.split('.').pop().toLowerCase() : ''
  if (!EXTENSIONS_AUTORISEES.includes(ext)) {
    return `Format non accepté. Formats autorisés : ${EXTENSIONS_AUTORISEES.join(', ')}.`
  }
  if (fichier.size > tailleMaxMo.value * 1024 * 1024) {
    return `Le fichier ne doit pas dépasser ${tailleMaxMo.value} Mo.`
  }
  return ''
}

export const tailleLisible = (octets) => {
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}
