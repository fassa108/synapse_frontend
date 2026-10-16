import { ref } from 'vue'

/**
 * État du panneau de l'assistant, partagé entre le bouton flottant et les
 * pages (ex. « Poser une question sur ce brief »).
 */
const ouvert = ref(false)
// Brief à ouvrir dans une nouvelle conversation : { id, titre, date_limite }
const briefDemande = ref(null)
// Discussion affichée : conservée d'une page à l'autre (le layout est remonté à chaque page)
const vue = ref('discussion')
const conversation = ref(null)
const briefBrouillon = ref(null)

export const useAssistant = () => {
  const ouvrir = () => {
    ouvert.value = true
  }

  const fermer = () => {
    ouvert.value = false
  }

  const ouvrirPourBrief = (brief) => {
    briefDemande.value = { id: brief.id, titre: brief.titre, date_limite: brief.date_limite }
    ouvert.value = true
  }

  return { ouvert, briefDemande, vue, conversation, briefBrouillon, ouvrir, fermer, ouvrirPourBrief }
}
