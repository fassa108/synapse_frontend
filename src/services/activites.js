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

// ─── Ressources briefs ────────────────────────────────────────────────────────

export const getRessourcesBrief = (tenantId, params = {}) =>
  api
    .get(`tenants/${tenantId}/ressources-briefs/`, { params })
    .then((r) => r.data)

export const creerRessourceBrief = (tenantId, formData) =>
  api
    .post(`tenants/${tenantId}/ressources-briefs/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)

export const supprimerRessourceBrief = (tenantId, id) =>
  api.delete(`tenants/${tenantId}/ressources-briefs/${id}/`)

// ─── Assignations ─────────────────────────────────────────────────────────────

export const getAssignations = (tenantId, params = {}) =>
  api
    .get(`tenants/${tenantId}/assignations/`, { params })
    .then((r) => r.data)

export const creerAssignation = (tenantId, payload) =>
  api
    .post(`tenants/${tenantId}/assignations/`, payload)
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
