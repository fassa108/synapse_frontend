/**
 * Apparence de chaque type de notification (icône Font Awesome et couleurs).
 */
const TYPES = {
  ASSIGNATION: { icone: 'fa-clipboard-list', classes: 'bg-indigo-50 text-indigo-600' },
  DEPOT: { icone: 'fa-file-arrow-up', classes: 'bg-sky-50 text-sky-600' },
  EVALUATION: { icone: 'fa-clipboard-check', classes: 'bg-emerald-50 text-emerald-600' },
  COMMENTAIRE: { icone: 'fa-comment', classes: 'bg-violet-50 text-violet-600' },
  COMPETENCE: { icone: 'fa-award', classes: 'bg-amber-50 text-amber-600' },
  RAPPEL: { icone: 'fa-clock', classes: 'bg-orange-50 text-orange-600' },
  ALERTE: { icone: 'fa-triangle-exclamation', classes: 'bg-red-50 text-red-600' },
  INSCRIPTION: { icone: 'fa-building', classes: 'bg-teal-50 text-teal-600' },
  ABONNEMENT: { icone: 'fa-credit-card', classes: 'bg-slate-100 text-slate-600' },
  IA: { icone: 'fa-wand-magic-sparkles', classes: 'bg-fuchsia-50 text-fuchsia-600' },
}

export const apparenceNotification = (type) => TYPES[type] ?? { icone: 'fa-bell', classes: 'bg-slate-100 text-slate-600' }
