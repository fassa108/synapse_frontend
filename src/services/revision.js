/**
 * Service révision — quiz et fiches de révision générés par IA.
 * Toutes les URLs sont sous /api/tenants/<tenantId>/supports-revision/.
 */

import api from './api'

const base = (tenantId) => `tenants/${tenantId}/supports-revision/`

export const getSupports = (tenantId, params = {}) =>
  api.get(base(tenantId), { params }).then((r) => r.data)

export const getSupport = (tenantId, id) =>
  api.get(`${base(tenantId)}${id}/`).then((r) => r.data)

// payload : FormData (module, type, difficulte, nb_questions, ressources,
// fichiers_livrables, fichiers). La génération continue en tâche de fond.
export const genererSupport = (tenantId, payload) =>
  api
    .post(base(tenantId), payload, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data)

// Relecture d'un brouillon : { titre?, questions? } (quiz) ou { contenu } (fiche)
export const modifierSupport = (tenantId, id, payload) =>
  api.patch(`${base(tenantId)}${id}/`, payload).then((r) => r.data)

export const publierSupport = (tenantId, id) =>
  api.post(`${base(tenantId)}${id}/publier/`).then((r) => r.data)

export const supprimerSupport = (tenantId, id) =>
  api.delete(`${base(tenantId)}${id}/`)

// Apprenant : ses tentatives sur un quiz, et une nouvelle tentative
// (reponses : [{ question, options: [ids] }]) → score et correction.
export const getTentatives = (tenantId, id) =>
  api.get(`${base(tenantId)}${id}/tentatives/`).then((r) => r.data)

export const envoyerTentative = (tenantId, id, reponses) =>
  api.post(`${base(tenantId)}${id}/tentatives/`, { reponses }).then((r) => r.data)
