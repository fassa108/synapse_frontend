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
  lien.download = ressource.fichier?.split('/').pop() ?? ressource.titre
  lien.click()
  URL.revokeObjectURL(url)
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

// ─── Livrables ────────────────────────────────────────────────────────────────

export const getLivrables = (tenantId, params = {}) =>
  api
    .get(`tenants/${tenantId}/livrables/`, { params })
    .then((r) => r.data)

export const getLivrable = (tenantId, id) =>
  api.get(`tenants/${tenantId}/livrables/${id}/`).then((r) => r.data)

export const modifierStatutLivrable = (tenantId, id, statut) =>
  api
    .patch(`tenants/${tenantId}/livrables/${id}/`, { statut })
    .then((r) => r.data)

// ─── Fichiers livrables ───────────────────────────────────────────────────────

export const getFichiersLivrable = (tenantId, params = {}) =>
  api
    .get(`tenants/${tenantId}/fichiers-livrables/`, { params })
    .then((r) => r.data)

export const creerFichierLivrable = (tenantId, formData) =>
  api
    .post(`tenants/${tenantId}/fichiers-livrables/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
