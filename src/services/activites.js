/**
 * Service activités — briefs, assignations, livrables, ressources.
 * Toutes les URLs sont sous /api/tenants/<tenantId>/.
 */

import api from './api'

// ─── Briefs ──────────────────────────────────────────────────────────────────

export const getBriefs = (tenantId, params = {}) =>
  api.get(`tenants/${tenantId}/briefs/`, { params }).then((r) => r.data)

export const getBrief = (tenantId, id) =>
  api.get(`tenants/${tenantId}/briefs/${id}/`).then((r) => r.data)

export const creerBrief = (tenantId, payload) =>
  api.post(`tenants/${tenantId}/briefs/`, payload).then((r) => r.data)

export const modifierBrief = (tenantId, id, payload) =>
  api.patch(`tenants/${tenantId}/briefs/${id}/`, payload).then((r) => r.data)

export const supprimerBrief = (tenantId, id) =>
  api.delete(`tenants/${tenantId}/briefs/${id}/`)

// ─── Catégories de brief (propres à l'organisme) ─────────────────────────────

export const getCategories = (tenantId) =>
  api.get(`tenants/${tenantId}/categories-briefs/`).then((r) => r.data)

export const creerCategorie = (tenantId, payload) =>
  api.post(`tenants/${tenantId}/categories-briefs/`, payload).then((r) => r.data)

export const modifierCategorie = (tenantId, id, payload) =>
  api.patch(`tenants/${tenantId}/categories-briefs/${id}/`, payload).then((r) => r.data)

// Refusé par le backend si la catégorie est utilisée par un brief.
export const supprimerCategorie = (tenantId, id) =>
  api.delete(`tenants/${tenantId}/categories-briefs/${id}/`)

// ─── Ressources (bibliothèque de l'organisme) ────────────────────────────────

export const getRessources = (tenantId, params = {}) =>
  api.get(`tenants/${tenantId}/ressources/`, { params }).then((r) => r.data)

// Un FormData (fichier) doit partir en multipart : sans cela, axios le
// convertit en JSON (en-tête application/json par défaut) et perd le fichier.
const optionsEnvoi = (payload) =>
  payload instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : {}

// payload : FormData (fichier) ou objet { titre, url }
export const creerRessource = (tenantId, payload) =>
  api.post(`tenants/${tenantId}/ressources/`, payload, optionsEnvoi(payload)).then((r) => r.data)

export const modifierRessource = (tenantId, id, payload) =>
  api.patch(`tenants/${tenantId}/ressources/${id}/`, payload, optionsEnvoi(payload)).then((r) => r.data)

// Refusé par le backend si la ressource est jointe à un brief.
export const supprimerRessource = (tenantId, id) =>
  api.delete(`tenants/${tenantId}/ressources/${id}/`)

// Téléchargement authentifié : le fichier n'est pas servi publiquement.
export const telechargerRessource = async (tenantId, ressource) => {
  const response = await api.get(
    `tenants/${tenantId}/ressources/${ressource.id}/telecharger/`,
    { responseType: 'blob' }
  )
  const url = URL.createObjectURL(response.data)
  const lien = document.createElement('a')
  lien.href = url
  // Le nom sur disque est aléatoire : on propose « titre.extension »
  lien.download = ressource.extension ? `${ressource.titre}.${ressource.extension}` : ressource.titre
  lien.click()
  URL.revokeObjectURL(url)
}

// ─── Consultation dans la plateforme ─────────────────────────────────────────
// chemin : `ressources/<id>` ou `fichiers-livrables/<id>`.
// Renvoie { pdf: Blob } | { texte: string } | { apercu: 'EN_COURS' | 'ECHEC' | 'INDISPONIBLE', message }.
// Les fichiers Office sont affichés via leur aperçu PDF, préparé au dépôt.

const lireJson = async (blob) => {
  try {
    return JSON.parse(await blob.text())
  } catch {
    return {}
  }
}

export const consulterFichier = async (tenantId, chemin) => {
  try {
    const response = await api.get(`tenants/${tenantId}/${chemin}/consulter/`, { responseType: 'blob' })
    const type = response.headers['content-type'] ?? ''
    if (response.status === 202 || type.includes('application/json')) {
      const d = await lireJson(response.data)
      return { apercu: d.apercu ?? 'EN_COURS', message: d.detail }
    }
    if (type.startsWith('text/plain')) return { texte: await response.data.text() }
    return { pdf: new Blob([response.data], { type: 'application/pdf' }) }
  } catch (e) {
    const data = e.response?.data
    if (data instanceof Blob) {
      const d = await lireJson(data)
      if (d.apercu) return { apercu: d.apercu, message: d.detail }
    }
    throw e
  }
}

// ─── Assignations ─────────────────────────────────────────────────────────────

export const getAssignations = (tenantId, params = {}) =>
  api
    .get(`tenants/${tenantId}/assignations/`, { params })
    .then((r) => r.data)

export const creerAssignation = (tenantId, payload) =>
  api
    .post(`tenants/${tenantId}/assignations/`, payload)
    .then((r) => r.data)

// Plusieurs cibles en une fois, « tout ou rien » :
// { brief, groupes: [ids], apprenants: [ids] }. En cas de refus, la réponse
// contient « erreurs » : [{ type, id, message }].
export const assignerPlusieurs = (tenantId, payload) =>
  api
    .post(`tenants/${tenantId}/assignations/multiple/`, payload)
    .then((r) => r.data)

export const supprimerAssignation = (tenantId, id) =>
  api.delete(`tenants/${tenantId}/assignations/${id}/`)

// ─── Livrables (dépôts) ───────────────────────────────────────────────────────
// Un dépôt n'est ni modifié ni supprimé : on en dépose un nouveau.
// Filtres : { brief, assignation, module }. L'apprenant reçoit ses dépôts et, sur les
// briefs où il a déposé, le dernier dépôt de chacun de ses pairs.

export const getLivrables = (tenantId, params = {}) =>
  api
    .get(`tenants/${tenantId}/livrables/`, { params })
    .then((r) => r.data)

// Dépôt en une fois : assignation, commentaire, fichiers (File[]), liens (string[])
export const deposer = (tenantId, { assignation, commentaire = '', fichiers = [], liens = [] }) => {
  const donnees = new FormData()
  donnees.append('assignation', assignation)
  donnees.append('commentaire', commentaire)
  fichiers.forEach((f) => donnees.append('fichiers', f))
  liens.forEach((l) => donnees.append('liens', l))
  return api
    .post(`tenants/${tenantId}/livrables/`, donnees, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}

// Téléchargement authentifié d'un fichier de dépôt (jamais servi publiquement)
export const telechargerFichierLivrable = async (tenantId, element) => {
  const response = await api.get(
    `tenants/${tenantId}/fichiers-livrables/${element.id}/telecharger/`,
    { responseType: 'blob' }
  )
  const url = URL.createObjectURL(response.data)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = element.nom
  lien.click()
  URL.revokeObjectURL(url)
}

// ─── Évaluations ──────────────────────────────────────────────────────────────
// Une évaluation ne se modifie pas : on en crée une nouvelle (la plus récente fait foi).

export const getEvaluations = (tenantId, params = {}) =>
  api.get(`tenants/${tenantId}/evaluations/`, { params }).then((r) => r.data)

export const evaluer = (tenantId, payload) =>
  api.post(`tenants/${tenantId}/evaluations/`, payload).then((r) => r.data)

// ─── Progression ──────────────────────────────────────────────────────────────

export const getProgressionPromotion = (tenantId, promotionId) =>
  api.get(`tenants/${tenantId}/progression/`, { params: { promotion: promotionId } }).then((r) => r.data)

export const getProgressionApprenant = (tenantId, apprenantId) =>
  api.get(`tenants/${tenantId}/progression/${apprenantId}/`).then((r) => r.data)

export const getMaProgression = (tenantId) =>
  api.get(`tenants/${tenantId}/progression/moi/`).then((r) => r.data)

// ─── Tableaux de bord ─────────────────────────────────────────────────────────

// role : 'formateur' | 'admin' | 'apprenant' (une route par rôle, tout en un appel)
export const getTableauDeBord = (tenantId, role) =>
  api.get(`tenants/${tenantId}/tableau-de-bord/${role}/`).then((r) => r.data)

// ─── Feedback entre pairs ─────────────────────────────────────────────────────

export const getCommentaires = (tenantId, params = {}) =>
  api.get(`tenants/${tenantId}/commentaires/`, { params }).then((r) => r.data)

export const commenter = (tenantId, payload) =>
  api.post(`tenants/${tenantId}/commentaires/`, payload).then((r) => r.data)

export const modifierCommentaire = (tenantId, id, texte) =>
  api.patch(`tenants/${tenantId}/commentaires/${id}/`, { texte }).then((r) => r.data)

export const supprimerCommentaire = (tenantId, id) =>
  api.delete(`tenants/${tenantId}/commentaires/${id}/`)

export const masquerCommentaire = (tenantId, id, masque) =>
  api.post(`tenants/${tenantId}/commentaires/${id}/${masque ? 'masquer' : 'demasquer'}/`).then((r) => r.data)
