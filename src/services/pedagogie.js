/**
 * Service pédagogie — tous les appels API pédagogiques.
 *
 * Toutes les URLs sont sous /api/tenants/<tenantId>/.
 * Le tenantId est toujours passé explicitement pour rester
 * découplé du store (testabilité, réutilisabilité).
 */

import api from './api'

// ─── Formations ──────────────────────────────────────────────────────────────

export const getFormations = (tenantId) =>
  api.get(`tenants/${tenantId}/formations/`).then((r) => r.data)

export const getFormation = (tenantId, id) =>
  api.get(`tenants/${tenantId}/formations/${id}/`).then((r) => r.data)

export const creerFormation = (tenantId, payload) =>
  api.post(`tenants/${tenantId}/formations/`, payload).then((r) => r.data)

export const modifierFormation = (tenantId, id, payload) =>
  api.patch(`tenants/${tenantId}/formations/${id}/`, payload).then((r) => r.data)

export const supprimerFormation = (tenantId, id) =>
  api.delete(`tenants/${tenantId}/formations/${id}/`)

// ─── Promotions ───────────────────────────────────────────────────────────────

export const getPromotions = (tenantId, params = {}) =>
  api.get(`tenants/${tenantId}/promotions/`, { params }).then((r) => r.data)

export const getPromotion = (tenantId, id) =>
  api.get(`tenants/${tenantId}/promotions/${id}/`).then((r) => r.data)

export const creerPromotion = (tenantId, payload) =>
  api.post(`tenants/${tenantId}/promotions/`, payload).then((r) => r.data)

export const modifierPromotion = (tenantId, id, payload) =>
  api.patch(`tenants/${tenantId}/promotions/${id}/`, payload).then((r) => r.data)

export const supprimerPromotion = (tenantId, id) =>
  api.delete(`tenants/${tenantId}/promotions/${id}/`)

export const inscrireApprenant = (tenantId, promotionId, apprenantId) =>
  api
    .post(`tenants/${tenantId}/promotions/${promotionId}/inscrire-apprenant/`, {
      apprenant_id: apprenantId,
    })
    .then((r) => r.data)

export const desinscrireApprenant = (tenantId, promotionId, apprenantId) =>
  api
    .post(`tenants/${tenantId}/promotions/${promotionId}/desinscrire-apprenant/`, {
      apprenant_id: apprenantId,
    })
    .then((r) => r.data)

// Clôture : ferme les inscriptions, promotion en lecture seule.
export const cloturerPromotion = (tenantId, id) =>
  api.post(`tenants/${tenantId}/promotions/${id}/cloturer/`).then((r) => r.data)

// Réouverture : réactive les inscriptions fermées par la clôture.
// Réponse : { inscriptions_reactivees, non_reactives: [{ apprenant, nom }] }
export const rouvrirPromotion = (tenantId, id) =>
  api.post(`tenants/${tenantId}/promotions/${id}/rouvrir/`).then((r) => r.data)

export const getInscriptions = (tenantId, promotionId, params = {}) =>
  api
    .get(`tenants/${tenantId}/promotions/${promotionId}/inscriptions/`, { params })
    .then((r) => r.data)

// ─── Modules ─────────────────────────────────────────────────────────────────

export const getModules = (tenantId, params = {}) =>
  api.get(`tenants/${tenantId}/modules/`, { params }).then((r) => r.data)

export const getModule = (tenantId, id) =>
  api.get(`tenants/${tenantId}/modules/${id}/`).then((r) => r.data)

export const creerModule = (tenantId, payload) =>
  api.post(`tenants/${tenantId}/modules/`, payload).then((r) => r.data)

export const modifierModule = (tenantId, id, payload) =>
  api.patch(`tenants/${tenantId}/modules/${id}/`, payload).then((r) => r.data)

export const supprimerModule = (tenantId, id) =>
  api.delete(`tenants/${tenantId}/modules/${id}/`)

// ─── Compétences ─────────────────────────────────────────────────────────────

export const getCompetences = (tenantId, params = {}) =>
  api.get(`tenants/${tenantId}/competences/`, { params }).then((r) => r.data)

export const getCompetence = (tenantId, id) =>
  api.get(`tenants/${tenantId}/competences/${id}/`).then((r) => r.data)

export const creerCompetence = (tenantId, payload) =>
  api.post(`tenants/${tenantId}/competences/`, payload).then((r) => r.data)

export const modifierCompetence = (tenantId, id, payload) =>
  api.patch(`tenants/${tenantId}/competences/${id}/`, payload).then((r) => r.data)

export const supprimerCompetence = (tenantId, id) =>
  api.delete(`tenants/${tenantId}/competences/${id}/`)

// ─── Niveaux ─────────────────────────────────────────────────────────────────

export const getNiveaux = (tenantId) =>
  api.get(`tenants/${tenantId}/niveaux/`).then((r) => r.data)

export const creerNiveau = (tenantId, payload) =>
  api.post(`tenants/${tenantId}/niveaux/`, payload).then((r) => r.data)

export const modifierNiveau = (tenantId, id, payload) =>
  api.patch(`tenants/${tenantId}/niveaux/${id}/`, payload).then((r) => r.data)

// Refusé par le backend si le niveau décrit déjà des compétences.
export const supprimerNiveau = (tenantId, id) =>
  api.delete(`tenants/${tenantId}/niveaux/${id}/`)

// ─── Compétence-Niveaux ───────────────────────────────────────────────────────

export const getCompetenceNiveaux = (tenantId, params = {}) =>
  api.get(`tenants/${tenantId}/competence-niveaux/`, { params }).then((r) => r.data)

export const creerCompetenceNiveau = (tenantId, payload) =>
  api.post(`tenants/${tenantId}/competence-niveaux/`, payload).then((r) => r.data)

export const modifierCompetenceNiveau = (tenantId, id, payload) =>
  api.patch(`tenants/${tenantId}/competence-niveaux/${id}/`, payload).then((r) => r.data)

export const supprimerCompetenceNiveau = (tenantId, id) =>
  api.delete(`tenants/${tenantId}/competence-niveaux/${id}/`)

// ─── Groupes ─────────────────────────────────────────────────────────────────

export const getGroupes = (tenantId, params = {}) =>
  api.get(`tenants/${tenantId}/groupes/`, { params }).then((r) => r.data)

export const getGroupe = (tenantId, id) =>
  api.get(`tenants/${tenantId}/groupes/${id}/`).then((r) => r.data)

export const creerGroupe = (tenantId, payload) =>
  api.post(`tenants/${tenantId}/groupes/`, payload).then((r) => r.data)

export const modifierGroupe = (tenantId, id, payload) =>
  api.patch(`tenants/${tenantId}/groupes/${id}/`, payload).then((r) => r.data)

export const supprimerGroupe = (tenantId, id) =>
  api.delete(`tenants/${tenantId}/groupes/${id}/`)

export const ajouterMembreGroupe = (tenantId, groupeId, apprenantId) =>
  api
    .post(`tenants/${tenantId}/groupes/${groupeId}/ajouter-apprenant/`, {
      apprenant_id: apprenantId,
    })
    .then((r) => r.data)

export const retirerMembreGroupe = (tenantId, groupeId, apprenantId) =>
  api
    .post(`tenants/${tenantId}/groupes/${groupeId}/retirer-apprenant/`, {
      apprenant_id: apprenantId,
    })
    .then((r) => r.data)

// ─── FormateurPromotion ───────────────────────────────────────────────────────

export const getFormateursPromotion = (tenantId, promotionId) =>
  api
    .get(`tenants/${tenantId}/promotions/${promotionId}/formateurs/`)
    .then((r) => r.data)

export const affecterFormateur = (tenantId, promotionId, formateurId) =>
  api
    .post(`tenants/${tenantId}/promotions/${promotionId}/affecter-formateur/`, {
      formateur: formateurId,
    })
    .then((r) => r.data)

export const retirerFormateur = (tenantId, promotionId, formateurId) =>
  api
    .post(`tenants/${tenantId}/promotions/${promotionId}/retirer-formateur/`, {
      formateur_id: formateurId,
    })
    .then((r) => r.data)
