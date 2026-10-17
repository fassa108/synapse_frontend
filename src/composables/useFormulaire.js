import { nextTick, reactive, watch } from 'vue'

/**
 * Validation d'un formulaire au fil de la saisie.
 *
 * - Un champ est vérifié quand on le quitte, puis à chaque modification :
 *   pas d'erreur pendant la toute première saisie, mais elle disparaît dès
 *   que le champ redevient correct.
 * - Après une tentative d'envoi, tous les champs sont vérifiés en direct
 *   (formulaire en étapes : seulement ceux de l'étape validée).
 * - Une erreur renvoyée par le serveur reste affichée jusqu'à ce que son
 *   champ soit modifié.
 *
 * regles : { champ: () => message d'erreur, ou '' si le champ est valide }
 * options.correspondances : nom côté serveur → nom du champ
 *   (ex. { password_confirm: 'confirmation' })
 * options.valeurs : objet réactif du formulaire (form), ou fonction qui le
 *   renvoie (ex. () => editForm.value) ; chaque changement
 *   de form[champ] vaut modification, quel que soit le composant (select,
 *   éditeur de texte riche, date…), sans brancher d'événement champ par champ.
 *
 * Repérage des champs : attribut name="<champ>" sur le champ, ou
 * data-champ="<champ>" sur son FormField. Sur le <form>,
 * @focusout="surSortie" marque le champ quitté ; à l'envoi, le premier
 * champ en erreur reçoit le focus.
 */
export const useFormulaire = (regles, { correspondances = {}, valeurs = null } = {}) => {
  const champs = Object.keys(regles)
  const erreursLocales = reactive({})
  const erreursServeur = reactive({})
  const visites = reactive({})
  const enDirect = reactive({}) // champs vérifiés à chaque modification après un envoi

  const verifier = (champ) => {
    const message = regles[champ]() || ''
    if (message) erreursLocales[champ] = message
    else delete erreursLocales[champ]
    return !message
  }

  // Une modification peut invalider un autre champ déjà vu
  // (ex. la confirmation quand le mot de passe change).
  const reverifier = () => {
    for (const champ of champs) {
      if (visites[champ] || enDirect[champ]) verifier(champ)
    }
  }

  const quitter = (champ) => {
    visites[champ] = true
    verifier(champ)
  }

  const modifier = (champ) => {
    delete erreursServeur[champ]
    reverifier()
  }

  if (valeurs) {
    // Objet réactif, ou fonction qui le renvoie (formulaire remplacé à chaque ouverture)
    const lire = typeof valeurs === 'function' ? valeurs : () => valeurs
    for (const champ of champs) {
      watch(() => lire()?.[champ], () => modifier(champ), { deep: true })
    }
  }

  // focusout sur le <form> : le champ quitté est retrouvé par son name ou son FormField
  const surSortie = (event) => {
    const repere = event.target?.closest?.('[data-champ], [name]')
    const champ = repere?.dataset?.champ ?? repere?.getAttribute('name')
    if (champ && champs.includes(champ)) quitter(champ)
  }

  const focaliser = (champ) => {
    const el =
      document.querySelector(`[name="${champ}"]:is(input, select, textarea)`) ??
      document.querySelector(`[data-champ="${champ}"]`)?.querySelector('input, select, textarea, [contenteditable="true"]')
    el?.focus()
  }

  const erreur = (champ) => erreursLocales[champ] || erreursServeur[champ] || ''

  /** Vérifie tout avant l'envoi ; le premier champ en erreur reçoit le focus. */
  const toutVerifier = (selection = champs) => {
    for (const champ of selection) {
      enDirect[champ] = true
      delete erreursServeur[champ]
    }
    const valide = selection.map(verifier).every(Boolean)
    const premier = selection.find((c) => erreursLocales[c])
    if (premier) focaliser(premier)
    return valide
  }

  /** Formulaire vidé (« Ajouter un autre ») : plus aucune erreur affichée. */
  const reinitialiser = () => {
    for (const champ of champs) {
      delete enDirect[champ]
      delete visites[champ]
      delete erreursLocales[champ]
      delete erreursServeur[champ]
    }
  }

  /**
   * Range une réponse d'erreur du serveur : les messages d'un champ connu
   * s'affichent sous ce champ (tous, pas seulement le premier), le reste
   * est renvoyé comme message général.
   */
  const erreursDuServeur = (data) => {
    if (!data || typeof data !== 'object') return ''
    if (Array.isArray(data)) return data.join(' ')

    const generales = []
    for (const [cle, valeur] of Object.entries(data)) {
      const texte = Array.isArray(valeur) ? valeur.join(' ') : String(valeur)
      const champ = correspondances[cle] ?? cle
      if (champs.includes(champ)) erreursServeur[champ] = texte
      else generales.push(texte)
    }
    // Après le rendu : les champs, désactivés pendant l'envoi, doivent être réactivés.
    const premier = champs.find((c) => erreursServeur[c])
    if (premier) nextTick(() => focaliser(premier))
    return generales.join(' ')
  }

  return { erreur, quitter, modifier, surSortie, toutVerifier, reinitialiser, erreursDuServeur }
}
