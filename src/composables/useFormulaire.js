import { nextTick, reactive, ref } from 'vue'

/**
 * Validation d'un formulaire au fil de la saisie.
 *
 * - Un champ est vérifié quand on le quitte, puis à chaque modification :
 *   pas d'erreur pendant la toute première saisie, mais elle disparaît dès
 *   que le champ redevient correct.
 * - Après une tentative d'envoi, tous les champs sont vérifiés en direct.
 * - Une erreur renvoyée par le serveur reste affichée jusqu'à ce que son
 *   champ soit modifié.
 *
 * regles : { champ: () => message d'erreur, ou '' si le champ est valide }
 * options.correspondances : nom côté serveur → nom du champ
 *   (ex. { password_confirm: 'confirmation' })
 *
 * Les champs portent l'attribut name="<champ>" : à l'envoi, le premier
 * champ en erreur reçoit le focus.
 */
export const useFormulaire = (regles, { correspondances = {} } = {}) => {
  const champs = Object.keys(regles)
  const erreursLocales = reactive({})
  const erreursServeur = reactive({})
  const visites = reactive({})
  const envoiTente = ref(false)

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
      if (visites[champ] || envoiTente.value) verifier(champ)
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

  const erreur = (champ) => erreursLocales[champ] || erreursServeur[champ] || ''

  /** Vérifie tout avant l'envoi ; le premier champ en erreur reçoit le focus. */
  const toutVerifier = () => {
    envoiTente.value = true
    for (const champ of champs) delete erreursServeur[champ]
    const valide = champs.map(verifier).every(Boolean)
    const premier = champs.find((c) => erreursLocales[c])
    if (premier) document.querySelector(`[name="${premier}"]`)?.focus()
    return valide
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
    if (premier) nextTick(() => document.querySelector(`[name="${premier}"]`)?.focus())
    return generales.join(' ')
  }

  return { erreur, quitter, modifier, toutVerifier, erreursDuServeur }
}
