<script setup>
/**
 * CommentairesRendu — fil de commentaires des pairs sur un rendu.
 *
 * Commentaires et réponses (un niveau) ; l'auteur modifie ou supprime les
 * siens ; le formateur masque / démasque.
 *
 * Props :
 *   - assignation   : rendu commenté (id)
 *   - commentaires  : commentaires de ce rendu (liste à plat, API)
 *   - mode          : 'apprenant' | 'formateur' | 'lecture'
 *   - peutCommenter : nouveau commentaire autorisé (rendu d'un pair)
 *   - peutRepondre  : réponses autorisées (brief ouvert, a déposé)
 *   - titre         : titre de la section
 *
 * Émet : change (recharger les commentaires)
 */
import { ref, computed } from 'vue'
import AppButton from '../ui/AppButton.vue'
import { useAuthStore } from '../../stores/auth'
import {
  commenter,
  modifierCommentaire,
  supprimerCommentaire,
  masquerCommentaire,
} from '../../services/activites'

const props = defineProps({
  assignation:   { type: Number, required: true },
  commentaires:  { type: Array, default: () => [] },
  mode:          { type: String, default: 'apprenant' },
  peutCommenter: { type: Boolean, default: false },
  peutRepondre:  { type: Boolean, default: false },
  titre:         { type: String, default: 'Commentaires' },
})
const emit = defineEmits(['change'])

const MAX = 2000
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id

const fils = computed(() =>
  props.commentaires
    .filter((c) => !c.parent)
    .map((c) => ({ ...c, reponses: props.commentaires.filter((r) => r.parent === c.id) }))
)

const nouveau   = ref('')
const reponseA  = ref(null)  // id du commentaire auquel on répond
const reponse   = ref('')
const edition   = ref(null)  // id du commentaire modifié
const texteEdit = ref('')
const envoi     = ref(false)
const erreur    = ref('')

const messageErreur = (e) => {
  const d = e.response?.data
  const premier = (v) => (Array.isArray(v) ? v[0] : v)
  return d?.detail || premier(d?.texte) || premier(d?.non_field_errors) || premier(d?.parent)
    || premier(d?.assignation) || "L'action n'a pas pu aboutir."
}

const executer = async (action) => {
  envoi.value = true
  erreur.value = ''
  try {
    await action()
    emit('change')
    return true
  } catch (e) {
    erreur.value = messageErreur(e)
    return false
  } finally {
    envoi.value = false
  }
}

const publier = async () => {
  if (await executer(() => commenter(tenantId, { assignation: props.assignation, texte: nouveau.value }))) {
    nouveau.value = ''
  }
}
const repondre = async (parent) => {
  if (await executer(() => commenter(tenantId, { assignation: props.assignation, parent, texte: reponse.value }))) {
    reponse.value = ''
    reponseA.value = null
  }
}
const commencerEdition = (c) => {
  edition.value = c.id
  texteEdit.value = c.texte
}
const enregistrer = async (c) => {
  if (await executer(() => modifierCommentaire(tenantId, c.id, texteEdit.value))) edition.value = null
}
const supprimer = (c) => {
  if (window.confirm(c.parent ? 'Supprimer cette réponse ?' : 'Supprimer ce commentaire et ses réponses ?')) {
    executer(() => supprimerCommentaire(tenantId, c.id))
  }
}
const basculerMasque = (c) => executer(() => masquerCommentaire(tenantId, c.id, !c.masque))

const initiales = (nom) => nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join('')
const formatDate = (iso) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
</script>

<template>
  <div class="font-['Plus_Jakarta_Sans']">
    <p class="mb-2 text-xs font-semibold text-zinc-500">
      <i class="fa-regular fa-comments mr-1"></i>{{ titre }} ({{ commentaires.length }})
    </p>

    <p v-if="!fils.length && !peutCommenter" class="text-xs text-zinc-400">Aucun commentaire.</p>

    <ul class="flex flex-col gap-3">
      <li v-for="c in fils" :key="c.id">
        <!-- Commentaire, puis ses réponses (même gabarit) -->
        <div v-for="m in [c, ...c.reponses]" :key="m.id" :class="{ 'ml-9 mt-2': m.parent }">
          <div class="flex gap-2.5" :class="{ 'opacity-60': m.masque }">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-semibold text-violet-700">
              {{ initiales(m.auteur_nom) }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="rounded-xl bg-slate-50 px-3 py-2">
                <p class="flex flex-wrap items-center gap-x-2 text-xs">
                  <span class="font-semibold text-gray-900">{{ m.auteur_nom }}</span>
                  <span class="text-zinc-400">{{ formatDate(m.date_creation) }}<template v-if="m.modifie"> · modifié</template></span>
                  <span v-if="m.masque" class="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                    Masqué par le formateur
                  </span>
                </p>
                <textarea
                  v-if="edition === m.id"
                  v-model="texteEdit"
                  rows="2"
                  :maxlength="MAX"
                  class="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
                ></textarea>
                <p v-else class="mt-1 whitespace-pre-line break-words text-sm text-zinc-700">{{ m.texte }}</p>
              </div>

              <div class="mt-1 flex flex-wrap gap-3 pl-1 text-xs">
                <template v-if="edition === m.id">
                  <button type="button" class="font-semibold text-indigo-600 hover:underline" :disabled="envoi || !texteEdit.trim()" @click="enregistrer(m)">Enregistrer</button>
                  <button type="button" class="text-zinc-500 hover:underline" @click="edition = null">Annuler</button>
                </template>
                <template v-else>
                  <button
                    v-if="!m.parent && peutRepondre && mode === 'apprenant' && !m.masque"
                    type="button" class="text-zinc-500 hover:text-indigo-600"
                    @click="reponseA = reponseA === m.id ? null : m.id; reponse = ''"
                  >Répondre</button>
                  <template v-if="m.peut_modifier">
                    <button type="button" class="text-zinc-500 hover:text-indigo-600" @click="commencerEdition(m)">Modifier</button>
                    <button type="button" class="text-zinc-500 hover:text-red-600" @click="supprimer(m)">Supprimer</button>
                  </template>
                  <button
                    v-if="mode === 'formateur'"
                    type="button" class="text-zinc-500 hover:text-amber-700"
                    :disabled="envoi"
                    @click="basculerMasque(m)"
                  >
                    <i :class="m.masque ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash'" class="mr-0.5"></i>
                    {{ m.masque ? 'Démasquer' : 'Masquer' }}
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Réponse en cours -->
        <form v-if="reponseA === c.id" class="ml-9 mt-2 flex items-start gap-2" @submit.prevent="repondre(c.id)">
          <textarea
            v-model="reponse"
            rows="2"
            :maxlength="MAX"
            placeholder="Votre réponse…"
            class="flex-1 resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
          ></textarea>
          <AppButton type="submit" :loading="envoi" :disabled="!reponse.trim()">Répondre</AppButton>
        </form>
      </li>
    </ul>

    <form v-if="peutCommenter" class="mt-3 flex flex-col gap-1.5" @submit.prevent="publier">
      <div class="flex items-start gap-2">
        <textarea
          v-model="nouveau"
          rows="2"
          :maxlength="MAX"
          placeholder="Un retour constructif pour votre pair…"
          class="flex-1 resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
        ></textarea>
        <AppButton type="submit" icon="fa-regular fa-paper-plane" :loading="envoi" :disabled="!nouveau.trim()">Commenter</AppButton>
      </div>
      <p v-if="nouveau.length > MAX - 200" class="text-right text-[11px] text-zinc-400">{{ nouveau.length }} / {{ MAX }}</p>
    </form>

    <p v-if="erreur" class="mt-2 text-xs text-red-600">{{ erreur }}</p>
  </div>
</template>
