/**
 * Libellés et règles des quiz et fiches de révision (voir backend revision).
 */

export const DIFFICULTES = [
  { value: 'FACILE', label: 'Facile', icone: 'fa-solid fa-seedling' },
  { value: 'MOYEN', label: 'Moyen', icone: 'fa-solid fa-signal' },
  { value: 'DIFFICILE', label: 'Difficile', icone: 'fa-solid fa-fire' },
]

export const NB_FICHES_MAX = 2
export const NB_SOURCES_MAX = 5
export const NB_QUESTIONS_MAX = 20

export const libelleDifficulte = (v) => DIFFICULTES.find((d) => d.value === v)?.label ?? v

export const STATUTS = {
  EN_COURS: { label: 'Génération en cours', classes: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200', icone: 'fa-solid fa-spinner fa-spin' },
  ECHEC: { label: 'Échec', classes: 'bg-red-50 text-red-700 ring-1 ring-red-200', icone: 'fa-solid fa-circle-xmark' },
  BROUILLON: { label: 'À relire', classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', icone: 'fa-solid fa-pen' },
  PUBLIE: { label: 'Publié', classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', icone: 'fa-solid fa-check' },
}

// Premier message d'erreur lisible d'une réponse DRF
export const messageErreur = (error, defaut) => {
  const data = error?.response?.data
  if (!data) return defaut
  if (typeof data === 'string') return defaut
  if (data.detail) return data.detail
  const premier = Object.values(data)[0]
  const texte = Array.isArray(premier) ? premier[0] : premier
  return typeof texte === 'string' ? texte : defaut
}
