/**
 * Service notifications — celles de l'utilisateur connecté.
 *
 * Le tenantId (facultatif) limite aux notifications de cet organisme,
 * plus celles sans organisme ; l'admin SaaS n'en passe pas.
 */

import api from './api'

const avecTenant = (tenantId, params = {}) => (tenantId ? { ...params, tenant: tenantId } : params)

export const getNotifications = (tenantId, params = {}) =>
  api.get('notifications/', { params: avecTenant(tenantId, params) }).then((r) => r.data)

export const getCompteurNotifications = (tenantId) =>
  api.get('notifications/compteur/', { params: avecTenant(tenantId) }).then((r) => r.data.non_lues)

export const lireNotification = (id) =>
  api.post(`notifications/${id}/lire/`).then((r) => r.data)

export const toutLireNotifications = (tenantId) =>
  api.post('notifications/tout-lire/', null, { params: avecTenant(tenantId) }).then((r) => r.data)
