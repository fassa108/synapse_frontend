<script setup>
/**
 * Assistant de l'apprenant : bouton flottant et panneau de discussion.
 *
 * - Une conversation n'est créée qu'à la première question (pas de
 *   conversation vide) ; « Poser une question sur ce brief » en ouvre une
 *   rattachée au brief (useAssistant).
 * - La réponse arrive en tâche de fond : la conversation est relue toutes
 *   les 1,5 s tant que la réponse est en cours, même panneau fermé (une
 *   pastille signale alors la réponse arrivée).
 * - Panneau compact ou agrandi ; plein écran sur mobile. Historique dans un
 *   tiroir, groupé par période. Un clic en dehors ou Échap le ferme.
 * - Conversations privées : seul l'apprenant les voit.
 */
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useAssistant } from '../../composables/useAssistant'
import {
  creerConversation,
  getConversation,
  getConversations,
  poserQuestion,
  supprimerConversation,
} from '../../services/assistant'
import { miseEnForme } from '../../utils/miseEnForme'

const LONGUEUR_MAX = 1000
const SEUIL_COMPTEUR = 800

const authStore = useAuthStore()
const { ouvert, briefDemande, conversation, briefBrouillon, ouvrir, fermer } = useAssistant()
const tenantId = computed(() => authStore.tenantCourant?.id)
const prenom = computed(() => authStore.utilisateur?.prenom ?? '')

const grand = ref(false)
const tiroir = ref(false)
const conversations = ref([])
const aSupprimer = ref(null)
const saisie = ref('')
const envoi = ref(false)
const erreur = ref('')
const chargement = ref(false)
const nonLu = ref(false)
const copie = ref(null)
const panneau = ref(null)
const lanceur = ref(null)
const fil = ref(null)
const champ = ref(null)
let minuterie = null

const messages = computed(() => conversation.value?.messages ?? [])
const enAttente = computed(() => messages.value.at(-1)?.statut === 'EN_COURS')
const briefCourant = computed(() =>
  conversation.value
    ? conversation.value.brief && {
        id: conversation.value.brief,
        titre: conversation.value.brief_titre,
        date_limite: conversation.value.brief_date_limite,
      }
    : briefBrouillon.value,
)
const peutEnvoyer = computed(
  () => saisie.value.trim() && saisie.value.length <= LONGUEUR_MAX && !envoi.value && !enAttente.value,
)

const SUGGESTIONS_BRIEF = [
  { icone: 'fa-flag-checkered', titre: 'Par où commencer ?', texte: 'Par où commencer ce brief ?' },
  { icone: 'fa-list-check', titre: 'Comprendre les attentes', texte: "Que veulent dire les modalités d'évaluation et les livrables attendus ?" },
  { icone: 'fa-calendar-check', titre: "M'organiser", texte: "Comment m'organiser d'ici l'échéance ?" },
  { icone: 'fa-lightbulb', titre: 'Une notion à éclaircir', texte: 'Pouvez-vous m’expliquer une notion clé de ce brief ?' },
]
const SUGGESTIONS = [
  { icone: 'fa-bullseye', titre: 'Mes compétences', texte: 'Quelles compétences me reste-t-il à acquérir ?' },
  { icone: 'fa-box-archive', titre: 'Préparer un livrable', texte: 'Comment bien préparer un livrable ?' },
  { icone: 'fa-calendar-week', titre: "M'organiser", texte: 'Comment organiser ma semaine de travail ?' },
  { icone: 'fa-book-open', titre: 'Réviser', texte: 'Comment réviser efficacement les notions de ma formation ?' },
]
const suggestions = computed(() => (briefCourant.value ? SUGGESTIONS_BRIEF : SUGGESTIONS))

// ─── Dates ────────────────────────────────────────────────────────────────────

const debutDuJour = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const joursDepuis = (iso) => Math.round((debutDuJour(new Date()) - debutDuJour(new Date(iso))) / 86400000)

const libelleJour = (iso) => {
  const n = joursDepuis(iso)
  if (n === 0) return "Aujourd'hui"
  if (n === 1) return 'Hier'
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
const heure = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const echeance = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '')

// Messages précédés d'un séparateur quand le jour change
const fils = computed(() =>
  messages.value.map((m, i) => ({
    ...m,
    separateur:
      i === 0 ||
      debutDuJour(new Date(m.date_creation)).getTime() !== debutDuJour(new Date(messages.value[i - 1].date_creation)).getTime()
        ? libelleJour(m.date_creation)
        : null,
  })),
)

const groupes = computed(() => {
  const g = [
    { libelle: "Aujourd'hui", items: [] },
    { libelle: 'Cette semaine', items: [] },
    { libelle: 'Plus ancien', items: [] },
  ]
  for (const c of conversations.value) {
    const n = joursDepuis(c.date_modification)
    g[n === 0 ? 0 : n < 7 ? 1 : 2].items.push(c)
  }
  return g.filter((x) => x.items.length)
})

// ─── Défilement, saisie ───────────────────────────────────────────────────────

const descendre = async () => {
  await nextTick()
  if (fil.value) fil.value.scrollTo({ top: fil.value.scrollHeight, behavior: 'smooth' })
}

const ajusterChamp = () => {
  const el = champ.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 140)}px`
}
watch(saisie, () => nextTick(ajusterChamp))

const focaliser = () => nextTick(() => champ.value?.focus())

// ─── Réponse en cours : relire la conversation ───────────────────────────────

const arreterSuivi = () => {
  clearInterval(minuterie)
  minuterie = null
}

const suivre = () => {
  if (minuterie) return
  minuterie = setInterval(async () => {
    try {
      const maj = await getConversation(tenantId.value, conversation.value.id)
      if (maj.id !== conversation.value?.id) return
      conversation.value = maj
      if (!enAttente.value) arreterSuivi()
    } catch {
      arreterSuivi()
    }
  }, 1500)
}

watch(
  enAttente,
  (oui, avant) => {
    if (oui) suivre()
    else {
      arreterSuivi()
      if (avant && !ouvert.value) nonLu.value = true
    }
  },
  { immediate: true },
)
watch(() => messages.value.length + (enAttente.value ? 0 : 0.5), descendre)

// ─── Conversations ────────────────────────────────────────────────────────────

const nouvelle = (brief = null) => {
  arreterSuivi()
  conversation.value = null
  briefBrouillon.value = brief
  erreur.value = ''
  tiroir.value = false
  focaliser()
}

const ouvrirTiroir = async () => {
  tiroir.value = true
  aSupprimer.value = null
  chargement.value = true
  try {
    conversations.value = await getConversations(tenantId.value)
  } catch {
    erreur.value = 'Impossible de charger vos conversations.'
  } finally {
    chargement.value = false
  }
}

const ouvrirConversation = async (id) => {
  erreur.value = ''
  try {
    conversation.value = await getConversation(tenantId.value, id)
    briefBrouillon.value = null
    tiroir.value = false
    descendre()
  } catch {
    erreur.value = 'Impossible d’ouvrir cette conversation.'
  }
}

const supprimer = async (c) => {
  try {
    await supprimerConversation(tenantId.value, c.id)
    conversations.value = conversations.value.filter((x) => x.id !== c.id)
    if (conversation.value?.id === c.id) conversation.value = null
  } catch {
    erreur.value = 'Impossible de supprimer cette conversation.'
  } finally {
    aSupprimer.value = null
  }
}

const envoyer = async (texte = saisie.value) => {
  const question = texte.trim()
  if (!question || envoi.value || enAttente.value) return
  envoi.value = true
  erreur.value = ''
  try {
    if (!conversation.value) {
      conversation.value = await creerConversation(tenantId.value, briefBrouillon.value?.id)
      briefBrouillon.value = null
    }
    conversation.value = await poserQuestion(tenantId.value, conversation.value.id, question)
    saisie.value = ''
  } catch (e) {
    const data = e.response?.data
    erreur.value = data?.detail ?? data?.contenu ?? "Votre question n'a pas pu être envoyée."
  } finally {
    envoi.value = false
    focaliser()
  }
}

const surTouche = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (peutEnvoyer.value) envoyer()
  }
}

const copier = async (m) => {
  try {
    await navigator.clipboard.writeText(m.contenu)
    copie.value = m.id
    setTimeout(() => copie.value === m.id && (copie.value = null), 1500)
  } catch {
    // presse-papiers indisponible : rien à faire
  }
}

// ─── Ouverture et fermeture ───────────────────────────────────────────────────

// Brief demandé par une page, sinon la discussion en cours
watch([ouvert, briefDemande], ([estOuvert, brief]) => {
  if (!estOuvert) return
  nonLu.value = false
  if (brief) {
    nouvelle(brief)
    briefDemande.value = null
  } else {
    descendre()
    focaliser()
  }
})

const surEchap = (e) => {
  if (e.key !== 'Escape') return
  if (tiroir.value) tiroir.value = false
  else fermer()
}

// Clic en dehors du panneau (et du bouton) : fermeture
const surClicExterieur = (e) => {
  if (panneau.value?.contains(e.target) || lanceur.value?.contains(e.target)) return
  fermer()
}

const ecouter = (oui) => {
  const action = oui ? 'addEventListener' : 'removeEventListener'
  document[action]('keydown', surEchap)
  document[action]('pointerdown', surClicExterieur)
}
watch(ouvert, ecouter, { immediate: true })

onUnmounted(() => {
  arreterSuivi()
  ecouter(false)
})

// Mobile : plein écran ; sinon compact en bas à droite, ou agrandi au centre
const classesPanneau = computed(() =>
  grand.value
    ? 'sm:inset-x-0 sm:top-[6vh] sm:mx-auto sm:h-[88vh] sm:w-[min(820px,calc(100vw-3rem))]'
    : 'sm:bottom-24 sm:right-6 sm:h-[min(660px,calc(100vh-8rem))] sm:w-[420px] sm:origin-bottom-right',
)
</script>

<template>
  <!-- Fond du mode agrandi -->
  <Transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    leave-active-class="transition-opacity duration-150"
    leave-to-class="opacity-0"
  >
    <div v-if="ouvert && grand" class="fixed inset-0 z-40 hidden bg-slate-900/30 backdrop-blur-[2px] sm:block"></div>
  </Transition>

  <!-- Panneau -->
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 sm:scale-90 translate-y-4 sm:translate-y-2"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="opacity-0 sm:scale-95 translate-y-4 sm:translate-y-2"
  >
    <section
      v-if="ouvert"
      ref="panneau"
      class="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white sm:inset-auto sm:rounded-3xl sm:border sm:border-slate-200/80 sm:shadow-[0_24px_64px_-12px_rgba(15,23,42,0.28)]"
      :class="classesPanneau"
      role="dialog"
      aria-label="Assistant pédagogique"
    >
      <!-- En-tête -->
      <header class="relative z-10 flex items-center gap-1.5 border-b border-slate-100 bg-white/90 px-3 py-3 backdrop-blur">
        <button
          type="button"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-slate-100 hover:text-zinc-800"
          aria-label="Mes conversations"
          title="Mes conversations"
          @click="ouvrirTiroir"
        >
          <i class="fa-solid fa-bars-staggered text-sm"></i>
        </button>

        <div class="flex min-w-0 flex-1 items-center gap-2.5 pl-1">
          <span class="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/30">
            <i class="fa-solid fa-wand-magic-sparkles text-[13px]"></i>
            <span class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white"></span>
          </span>
          <div class="min-w-0">
            <p class="truncate font-['Sora'] text-sm font-semibold leading-5 text-gray-900">Assistant EduHub</p>
            <p class="truncate font-['Plus_Jakarta_Sans'] text-[11px] leading-4 text-emerald-600">En ligne · votre tuteur de formation</p>
          </div>
        </div>

        <button
          type="button"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-slate-100 hover:text-zinc-800"
          aria-label="Nouvelle conversation"
          title="Nouvelle conversation"
          @click="nouvelle()"
        >
          <i class="fa-regular fa-pen-to-square text-sm"></i>
        </button>
        <button
          type="button"
          class="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-slate-100 hover:text-zinc-800 sm:flex"
          :aria-label="grand ? 'Réduire' : 'Agrandir'"
          :title="grand ? 'Réduire' : 'Agrandir'"
          @click="grand = !grand"
        >
          <i class="fa-solid text-sm" :class="grand ? 'fa-down-left-and-up-right-to-center' : 'fa-up-right-and-down-left-from-center'"></i>
        </button>
        <button
          type="button"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-slate-100 hover:text-zinc-800"
          aria-label="Fermer l'assistant"
          title="Fermer"
          @click="fermer"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </header>

      <!-- Contexte : brief de la conversation -->
      <div v-if="briefCourant" class="flex items-center gap-2 border-b border-indigo-100/70 bg-indigo-50/60 px-4 py-2">
        <i class="fa-solid fa-clipboard-list text-xs text-indigo-500"></i>
        <p class="min-w-0 flex-1 truncate font-['Plus_Jakarta_Sans'] text-xs font-semibold text-indigo-900">
          {{ briefCourant.titre }}
        </p>
        <span
          v-if="briefCourant.date_limite"
          class="shrink-0 rounded-full bg-white px-2 py-0.5 font-['Plus_Jakarta_Sans'] text-[10px] font-medium text-indigo-600 ring-1 ring-indigo-100"
        >
          Échéance {{ echeance(briefCourant.date_limite) }}
        </span>
      </div>

      <!-- Fil -->
      <div ref="fil" class="relative flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/80 to-white">
        <div class="mx-auto flex min-h-full w-full flex-col px-4 py-5" :class="grand ? 'max-w-2xl' : ''">
          <!-- Accueil -->
          <div v-if="!messages.length" class="my-auto flex flex-col items-center text-center">
            <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
              <i class="fa-solid fa-wand-magic-sparkles text-xl"></i>
            </span>
            <h2 class="mt-4 font-['Sora'] text-lg font-semibold leading-7 text-gray-900">
              {{ prenom ? `Bonjour ${prenom},` : 'Bonjour,' }}<br />comment puis-je vous aider ?
            </h2>
            <p class="mt-1.5 max-w-xs font-['Plus_Jakarta_Sans'] text-sm leading-5 text-zinc-500">
              Je vous aide à comprendre, à vous organiser et à progresser, sans faire le travail à votre place.
            </p>
            <div class="mt-6 grid w-full grid-cols-2 gap-2" :class="grand ? 'sm:grid-cols-4' : ''">
              <button
                v-for="s in suggestions"
                :key="s.titre"
                type="button"
                class="group flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 disabled:opacity-50"
                :disabled="envoi"
                @click="envoyer(s.texte)"
              >
                <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                  <i class="fa-solid text-xs" :class="s.icone"></i>
                </span>
                <span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold leading-4 text-gray-900">{{ s.titre }}</span>
              </button>
            </div>
          </div>

          <!-- Messages -->
          <div v-else class="flex flex-col gap-4">
            <template v-for="m in fils" :key="m.id">
              <div v-if="m.separateur" class="flex items-center gap-3 py-1">
                <span class="h-px flex-1 bg-slate-200/70"></span>
                <span class="font-['Plus_Jakarta_Sans'] text-[10px] font-medium uppercase tracking-wide text-zinc-400">{{ m.separateur }}</span>
                <span class="h-px flex-1 bg-slate-200/70"></span>
              </div>

              <!-- Apprenant -->
              <div v-if="m.role === 'APPRENANT'" class="apparition group flex flex-col items-end">
                <p class="max-w-[85%] whitespace-pre-wrap break-words rounded-[20px] rounded-br-md bg-gradient-to-br from-indigo-600 to-indigo-500 px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm leading-6 text-white shadow-sm shadow-indigo-500/20">{{ m.contenu }}</p>
                <span class="mt-1 font-['Plus_Jakarta_Sans'] text-[10px] text-zinc-400 opacity-0 transition group-hover:opacity-100">{{ heure(m.date_creation) }}</span>
              </div>

              <!-- Assistant -->
              <div v-else class="apparition group flex items-start gap-2.5">
                <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                  <i class="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
                </span>
                <div class="min-w-0 max-w-[85%]">
                  <div
                    v-if="m.statut === 'EN_COURS'"
                    class="flex items-center gap-2.5 rounded-[20px] rounded-tl-md border border-slate-100 bg-white px-4 py-3 shadow-sm"
                  >
                    <span class="flex gap-1" aria-hidden="true">
                      <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.3s]"></span>
                      <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.15s]"></span>
                      <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400"></span>
                    </span>
                    <span class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">L'assistant réfléchit…</span>
                  </div>
                  <p
                    v-else-if="m.statut === 'ECHEC'"
                    class="rounded-[20px] rounded-tl-md border border-rose-100 bg-rose-50 px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm text-rose-700"
                  >
                    <i class="fa-solid fa-circle-exclamation mr-1.5"></i>{{ m.contenu }}
                  </p>
                  <template v-else>
                    <!-- Texte échappé puis mis en forme (utils/miseEnForme.js) : aucun HTML du LLM n'est interprété -->
                    <div
                      class="reponse rounded-[20px] rounded-tl-md border border-slate-100 bg-white px-4 py-3 font-['Plus_Jakarta_Sans'] text-sm leading-6 text-zinc-700 shadow-sm"
                      v-html="miseEnForme(m.contenu)"
                    ></div>
                    <div class="mt-1 flex items-center gap-2 pl-1 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
                      <span class="font-['Plus_Jakarta_Sans'] text-[10px] text-zinc-400">{{ heure(m.date_creation) }}</span>
                      <button
                        type="button"
                        class="flex items-center gap-1 rounded-md px-1.5 py-0.5 font-['Plus_Jakarta_Sans'] text-[10px] text-zinc-400 hover:bg-slate-100 hover:text-zinc-700"
                        @click="copier(m)"
                      >
                        <i class="fa-solid text-[9px]" :class="copie === m.id ? 'fa-check text-emerald-500' : 'fa-copy'"></i>
                        {{ copie === m.id ? 'Copié' : 'Copier' }}
                      </button>
                    </div>
                  </template>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Saisie -->
      <form class="border-t border-slate-100 bg-white px-3 pb-3 pt-2.5" @submit.prevent="envoyer()">
        <div class="mx-auto w-full" :class="grand ? 'max-w-2xl' : ''">
          <p
            v-if="erreur"
            class="mb-2 flex items-start gap-1.5 rounded-xl bg-rose-50 px-3 py-2 font-['Plus_Jakarta_Sans'] text-xs text-rose-700"
            role="alert"
          >
            <i class="fa-solid fa-circle-exclamation mt-0.5"></i>{{ erreur }}
          </p>
          <div class="flex items-end gap-2 rounded-[22px] border border-slate-200 bg-slate-50/70 py-1.5 pl-4 pr-1.5 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(99,102,241,0.08)]">
            <textarea
              ref="champ"
              v-model="saisie"
              rows="1"
              class="max-h-[140px] flex-1 resize-none self-center border-0 bg-transparent py-1.5 font-['Plus_Jakarta_Sans'] text-sm leading-5 text-gray-900 outline-none placeholder:text-zinc-400 focus:ring-0"
              :placeholder="enAttente ? 'L’assistant répond…' : 'Posez votre question…'"
              :maxlength="LONGUEUR_MAX + 100"
              aria-label="Votre question"
              @keydown="surTouche"
            ></textarea>
            <button
              type="submit"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 transition hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-zinc-400 disabled:shadow-none"
              :disabled="!peutEnvoyer"
              aria-label="Envoyer"
            >
              <i v-if="envoi" class="fa-solid fa-circle-notch animate-spin text-xs"></i>
              <i v-else class="fa-solid fa-arrow-up text-sm"></i>
            </button>
          </div>
          <div class="mt-1.5 flex items-center justify-between gap-2 px-2 font-['Plus_Jakarta_Sans'] text-[10px] text-zinc-400">
            <span>L'assistant peut se tromper : en cas de doute, demandez à votre formateur.</span>
            <span
              v-if="saisie.length >= SEUIL_COMPTEUR"
              class="shrink-0"
              :class="saisie.length > LONGUEUR_MAX ? 'font-semibold text-rose-500' : ''"
            >
              {{ saisie.length }}/{{ LONGUEUR_MAX }}
            </span>
          </div>
        </div>
      </form>

      <!-- Tiroir : historique -->
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-150"
        leave-to-class="opacity-0"
      >
        <div v-if="tiroir" class="absolute inset-0 z-20 bg-slate-900/20" @click="tiroir = false"></div>
      </Transition>
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="-translate-x-full"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="-translate-x-full"
      >
        <aside v-if="tiroir" class="absolute inset-y-0 left-0 z-30 flex w-[85%] max-w-xs flex-col bg-white shadow-2xl" aria-label="Mes conversations">
          <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
            <p class="font-['Sora'] text-sm font-semibold text-gray-900">Mes conversations</p>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-slate-100 hover:text-zinc-700"
              aria-label="Fermer la liste"
              @click="tiroir = false"
            >
              <i class="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
          <div class="p-3">
            <button
              type="button"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-white transition hover:bg-indigo-700"
              @click="nouvelle()"
            >
              <i class="fa-solid fa-plus text-xs"></i>Nouvelle conversation
            </button>
          </div>
          <div class="flex-1 overflow-y-auto px-2 pb-3">
            <p v-if="chargement" class="px-3 py-8 text-center text-zinc-400">
              <i class="fa-solid fa-circle-notch animate-spin"></i>
            </p>
            <div v-else-if="!groupes.length" class="flex flex-col items-center gap-2 px-6 py-10 text-center text-zinc-400">
              <i class="fa-regular fa-comments text-2xl"></i>
              <p class="font-['Plus_Jakarta_Sans'] text-sm">Aucune conversation pour le moment.</p>
            </div>
            <section v-for="g in groupes" :key="g.libelle" class="mb-3">
              <p class="px-3 pb-1 pt-2 font-['Plus_Jakarta_Sans'] text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{{ g.libelle }}</p>
              <ul class="flex flex-col gap-0.5">
                <li v-for="c in g.items" :key="c.id">
                  <div
                    v-if="aSupprimer === c.id"
                    class="flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5 font-['Plus_Jakarta_Sans'] text-xs"
                  >
                    <span class="flex-1 text-rose-700">Supprimer cette conversation ?</span>
                    <button type="button" class="rounded-md bg-rose-600 px-2 py-1 font-semibold text-white hover:bg-rose-700" @click="supprimer(c)">Supprimer</button>
                    <button type="button" class="rounded-md px-2 py-1 text-zinc-600 hover:bg-white" @click="aSupprimer = null">Annuler</button>
                  </div>
                  <div
                    v-else
                    class="group flex items-center gap-1 rounded-xl px-3 py-2 transition hover:bg-slate-50"
                    :class="conversation?.id === c.id ? 'bg-indigo-50/70' : ''"
                  >
                    <button type="button" class="min-w-0 flex-1 text-left" @click="ouvrirConversation(c.id)">
                      <p
                        class="truncate font-['Plus_Jakarta_Sans'] text-sm text-gray-900"
                        :class="conversation?.id === c.id ? 'font-semibold' : 'font-medium'"
                      >
                        {{ c.titre || 'Conversation' }}
                      </p>
                      <p v-if="c.brief_titre" class="mt-0.5 flex items-center gap-1 truncate font-['Plus_Jakarta_Sans'] text-[11px] text-indigo-600">
                        <i class="fa-solid fa-clipboard-list text-[9px]"></i>{{ c.brief_titre }}
                      </p>
                    </button>
                    <button
                      type="button"
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 focus:opacity-100 group-hover:opacity-100"
                      aria-label="Supprimer la conversation"
                      @click="aSupprimer = c.id"
                    >
                      <i class="fa-regular fa-trash-can text-xs"></i>
                    </button>
                  </div>
                </li>
              </ul>
            </section>
          </div>
        </aside>
      </Transition>
    </section>
  </Transition>

  <!-- Bouton flottant -->
  <div ref="lanceur" class="group fixed bottom-6 right-4 z-40 sm:right-6" :class="ouvert ? 'max-sm:hidden' : ''">
    <span
      v-if="!ouvert"
      class="pointer-events-none absolute right-[4.25rem] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-gray-900 px-3 py-1.5 font-['Plus_Jakarta_Sans'] text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100"
    >
      Une question ? Demandez à l'assistant
    </span>
    <button
      type="button"
      class="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30 transition duration-200 hover:scale-105 hover:shadow-xl hover:shadow-indigo-600/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 active:scale-95"
      :aria-label="ouvert ? 'Fermer l’assistant' : 'Ouvrir l’assistant'"
      :aria-expanded="ouvert"
      @click="ouvert ? fermer() : ouvrir()"
    >
      <Transition
        mode="out-in"
        enter-active-class="transition duration-150"
        enter-from-class="rotate-90 scale-50 opacity-0"
        leave-active-class="transition duration-100"
        leave-to-class="-rotate-90 scale-50 opacity-0"
      >
        <i :key="String(ouvert)" class="fa-solid text-xl" :class="ouvert ? 'fa-xmark' : 'fa-wand-magic-sparkles'"></i>
      </Transition>
      <span v-if="nonLu && !ouvert" class="absolute -right-0.5 -top-0.5 flex h-4 w-4" aria-label="Nouvelle réponse">
        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
        <span class="relative inline-flex h-4 w-4 rounded-full bg-rose-500 ring-2 ring-white"></span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.apparition {
  animation: apparition 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes apparition {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .apparition {
    animation: none;
  }
}
.reponse :deep(p + p),
.reponse :deep(p + ul),
.reponse :deep(p + ol),
.reponse :deep(ul + p),
.reponse :deep(ol + p),
.reponse :deep(ul + ol),
.reponse :deep(ol + ul) {
  margin-top: 0.5rem;
}
.reponse :deep(li::marker) {
  color: #818cf8;
}
.reponse :deep(strong) {
  font-weight: 600;
  color: #111827;
}
</style>
