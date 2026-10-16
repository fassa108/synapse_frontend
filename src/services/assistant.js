/**
 * Service assistant — conversations de l'apprenant avec l'assistant IA.
 * La réponse arrive en tâche de fond : relire la conversation tant que le
 * dernier message est « EN_COURS ».
 */

import api from './api'

const base = (tenantId) => `tenants/${tenantId}/assistant/conversations/`

export const getConversations = (tenantId) => api.get(base(tenantId)).then((r) => r.data)

export const getConversation = (tenantId, id) => api.get(`${base(tenantId)}${id}/`).then((r) => r.data)

export const creerConversation = (tenantId, briefId = null) =>
  api.post(base(tenantId), briefId ? { brief: briefId } : {}).then((r) => r.data)

export const poserQuestion = (tenantId, id, contenu) =>
  api.post(`${base(tenantId)}${id}/messages/`, { contenu }).then((r) => r.data)

export const supprimerConversation = (tenantId, id) => api.delete(`${base(tenantId)}${id}/`)
