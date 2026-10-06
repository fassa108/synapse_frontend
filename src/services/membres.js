/**
 * Service membres — gestion des membres d'un tenant.
 * Endpoint : /api/accounts/tenants/<tenantId>/membres/
 */

import api from './api'

export const getMembres = (tenantId, params = {}) =>
  api
    .get(`accounts/tenants/${tenantId}/membres/`, { params })
    .then((r) => r.data)

export const getMembre = (tenantId, membreId) =>
  api
    .get(`accounts/tenants/${tenantId}/membres/${membreId}/`)
    .then((r) => r.data)

/**
 * Inviter ou ajouter un membre.
 * payload : { nom?, prenom?, email, role }
 * nom et prenom sont obligatoires seulement si l'utilisateur n'existe pas encore.
 */
export const inviterMembre = (tenantId, payload) =>
  api
    .post(`accounts/tenants/${tenantId}/membres/`, payload)
    .then((r) => r.data)

// Nouveau lien d'activation pour un compte « En attente » (5 envois par heure et par membre)
export const renvoyerInvitation = (tenantId, membreId) =>
  api
    .post(`accounts/tenants/${tenantId}/membres/${membreId}/renvoyer-invitation/`)
    .then((r) => r.data)

export const modifierMembre =(tenantId, membreId, payload) =>
  api
    .patch(`accounts/tenants/${tenantId}/membres/${membreId}/`, payload)
    .then((r) => r.data)
