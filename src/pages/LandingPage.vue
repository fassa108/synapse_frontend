<script setup>
/**
 * LandingPage — page d'accueil publique d'EduHub.
 *
 * Présente la plateforme et mène vers la connexion ou la demande
 * d'inscription d'un organisme. Un utilisateur déjà connecté est
 * redirigé vers son espace par le garde de /login.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import logo from '../assets/logo-eduhub.png'
import logoBlanc from '../assets/logo-eduhub-blanc.png'
import photo from '../assets/auth-formation.jpg'
import apercu from '../assets/apercu-tableau-de-bord.jpg'

const connecte = !!localStorage.getItem('access_token')
const libelleConnexion = connecte ? 'Accéder à mon espace' : 'Se connecter'

// ─── En-tête : verre teinté sur l'accroche, clair une fois la page défilée ─────
const defile = ref(false)
const menuOuvert = ref(false)
const surDefilement = () => { defile.value = window.scrollY > 40 }

const liens = [
  { id: 'fonctionnalites', libelle: 'Fonctionnalités' },
  { id: 'fonctionnement', libelle: 'Fonctionnement' },
  { id: 'pour-qui', libelle: 'Pour qui' },
  { id: 'ia', libelle: 'IA' },
]
const allerA = (id) => {
  menuOuvert.value = false
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

// ─── Chiffres : compteur animé à l'apparition de la section ───────────────────
const chiffres = [
  { valeur: 4, libelle: 'rôles', detail: 'Admin plateforme, admin organisme, formateur, apprenant' },
  { valeur: 5, libelle: 'étapes', detail: 'Du brief à la révision, sans changer d\'outil' },
  { valeur: 3, libelle: 'formats lus par l\'IA', detail: 'PDF, DOCX et PPTX' },
  { valeur: 1, libelle: 'seul espace', detail: 'Consignes, rendus, évaluations et progression' },
]
const affiches = ref(chiffres.map(() => 0))
const sectionChiffres = ref(null)
let observateur = null

const animerChiffres = () => {
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduit) { affiches.value = chiffres.map((c) => c.valeur); return }
  const debut = performance.now(), duree = 1200
  const pas = (t) => {
    const p = Math.min(1, (t - debut) / duree)
    const ease = 1 - Math.pow(1 - p, 3)
    affiches.value = chiffres.map((c) => Math.round(c.valeur * ease))
    if (p < 1) requestAnimationFrame(pas)
  }
  requestAnimationFrame(pas)
}

onMounted(() => {
  window.addEventListener('scroll', surDefilement, { passive: true })
  surDefilement()
  observateur = new IntersectionObserver(([entree]) => {
    if (entree.isIntersecting) { animerChiffres(); observateur.disconnect() }
  }, { threshold: 0.4 })
  if (sectionChiffres.value) observateur.observe(sectionChiffres.value)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', surDefilement)
  observateur?.disconnect()
})

// ─── Contenu ──────────────────────────────────────────────────────────────────
const fonctionnalites = [
  { icone: 'fa-solid fa-folder-open', titre: 'Centraliser', texte: 'Briefs, ressources et rendus réunis au même endroit, pour chaque promotion.' },
  { icone: 'fa-solid fa-list-check', titre: 'Évaluer', texte: 'Évaluation par compétences et par niveau, avec un commentaire pour chaque rendu.' },
  { icone: 'fa-solid fa-chart-line', titre: 'Suivre', texte: 'Tableaux de bord par rôle : retards, taux de rendu et compétences validées.' },
  { icone: 'fa-solid fa-comments', titre: 'Collaborer', texte: 'Les apprenants commentent le travail de leurs pairs, sous le regard du formateur.' },
  { icone: 'fa-solid fa-wand-magic-sparkles', titre: 'Réviser', texte: 'Quiz et fiches de révision générés par l\'IA à partir des supports du cours.' },
]

const etapes = [
  { titre: 'Brief', texte: 'Le formateur publie un brief et les compétences visées.' },
  { titre: 'Rendu', texte: 'L\'apprenant dépose son livrable avant l\'échéance.' },
  { titre: 'Évaluation', texte: 'Chaque compétence est jugée et commentée.' },
  { titre: 'Progression', texte: 'Les compétences validées s\'ajoutent au parcours.' },
  { titre: 'Révision', texte: 'Quiz et fiches pour consolider les acquis.' },
]

const publics = [
  {
    icone: 'fa-solid fa-building-columns', titre: 'Organismes de formation',
    points: ['Formations, promotions et référentiel de compétences', 'Invitation des formateurs et des apprenants', 'Vue d\'ensemble et points d\'attention'],
  },
  {
    icone: 'fa-solid fa-chalkboard-user', titre: 'Formateurs',
    points: ['Briefs et ressources en quelques minutes', 'Évaluation par compétences, rapide et tracée', 'Repérage des retards et du décrochage'],
  },
  {
    icone: 'fa-solid fa-user-graduate', titre: 'Apprenants',
    points: ['Toutes les consignes et échéances au même endroit', 'Retours et progression visibles à tout moment', 'Révision avec quiz et fiches'],
  },
]

const annee = new Date().getFullYear()
const pied = computed(() => `© ${annee} EduHub · Projet de certification · Simplon Sénégal`)
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-['Plus_Jakarta_Sans'] text-slate-700">

    <!-- ═══ En-tête ═══════════════════════════════════════════════════════════ -->
    <header class="fixed inset-x-0 top-0 z-50 px-4 pt-3 sm:px-6">
      <nav
        class="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border px-4 py-2.5 backdrop-blur-xl transition-colors duration-300 sm:px-5"
        :class="defile
          ? 'border-slate-200/70 bg-white/75 shadow-lg shadow-indigo-950/5'
          : 'border-white/15 bg-white/10'"
        aria-label="Navigation principale"
      >
        <a href="#" class="shrink-0" @click.prevent="allerA('haut')">
          <img :src="defile ? logo : logoBlanc" alt="EduHub" class="h-8 w-auto" />
        </a>

        <ul class="hidden items-center gap-1 lg:flex">
          <li v-for="l in liens" :key="l.id">
            <a
              :href="`#${l.id}`"
              class="rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
              :class="defile ? 'text-slate-600 hover:bg-slate-100 hover:text-indigo-700' : 'text-white/85 hover:bg-white/10 hover:text-white'"
              @click.prevent="allerA(l.id)"
            >{{ l.libelle }}</a>
          </li>
        </ul>

        <div class="flex items-center gap-2">
          <router-link
            to="/login"
            class="hidden rounded-xl px-4 py-2 text-sm font-semibold transition-colors sm:inline-flex"
            :class="defile ? 'text-indigo-700 hover:bg-indigo-50' : 'text-white hover:bg-white/10'"
          >{{ libelleConnexion }}</router-link>
          <router-link
            v-if="!connecte"
            to="/inscription"
            class="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-600"
          >S'inscrire</router-link>
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-xl lg:hidden"
            :class="defile ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'"
            :aria-expanded="menuOuvert"
            aria-label="Menu"
            @click="menuOuvert = !menuOuvert"
          >
            <i :class="menuOuvert ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'"></i>
          </button>
        </div>
      </nav>

      <!-- Menu mobile -->
      <div
        v-if="menuOuvert"
        class="mx-auto mt-2 max-w-6xl rounded-2xl border border-slate-200/70 bg-white/90 p-2 shadow-xl backdrop-blur-xl lg:hidden"
      >
        <a
          v-for="l in liens" :key="l.id" :href="`#${l.id}`"
          class="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          @click.prevent="allerA(l.id)"
        >{{ l.libelle }}</a>
        <router-link to="/login" class="block rounded-xl px-4 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 sm:hidden">
          {{ libelleConnexion }}
        </router-link>
      </div>
    </header>

    <main>
      <!-- ═══ Accroche ════════════════════════════════════════════════════════ -->
      <section id="haut" class="relative isolate overflow-hidden bg-indigo-950 pb-16 pt-32 sm:pt-36 lg:pb-24">
        <!-- Fond : dégradé et halos colorés (indispensables à l'effet de verre) -->
        <div class="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900"></div>
        <div class="absolute -left-32 top-10 -z-10 h-96 w-96 rounded-full bg-indigo-500/40 blur-3xl"></div>
        <div class="absolute right-0 top-1/3 -z-10 h-[28rem] w-[28rem] rounded-full bg-violet-500/30 blur-3xl"></div>
        <div class="absolute bottom-0 left-1/3 -z-10 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl"></div>

        <div class="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 class="font-['Sora'] text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Du brief à la <br class="hidden sm:block" />
              compétence validée
            </h1>
            <p class="mt-6 max-w-xl text-lg leading-8 text-indigo-100/90">
              EduHub réunit briefs, rendus, évaluations et progression par compétences
              dans un seul espace, pour les organismes qui forment par projets.
            </p>
            <div class="mt-9 flex flex-wrap gap-3">
              <router-link
                v-if="!connecte"
                to="/inscription"
                class="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-indigo-700 shadow-xl shadow-indigo-950/30 transition hover:bg-indigo-50"
              >
                Inscrire mon organisme <i class="fa-solid fa-arrow-right text-xs"></i>
              </router-link>
              <router-link
                to="/login"
                class="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20"
              >
                {{ libelleConnexion }}
              </router-link>
            </div>
          </div>

          <!-- Photo encadrée, avec des cartes en verre qui illustrent le cycle -->
          <div class="relative mx-auto w-full max-w-md">
            <div class="overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 p-2 shadow-2xl shadow-indigo-950/50 backdrop-blur-md">
              <img :src="photo" alt="Un formateur accompagne des apprenants en salle informatique" class="aspect-[4/5] w-full rounded-[1.6rem] object-cover object-[center_25%]" />
            </div>

            <div class="flottant absolute -left-4 top-10 flex items-center gap-3 rounded-2xl border border-white/25 bg-indigo-950/45 px-4 py-3 shadow-xl backdrop-blur-xl sm:-left-10">
              <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/90 text-white"><i class="fa-solid fa-file-arrow-up text-sm"></i></span>
              <div>
                <p class="text-xs font-bold text-white">Livrable déposé</p>
                <p class="text-[11px] text-indigo-100/80">avant l'échéance</p>
              </div>
            </div>

            <div class="absolute -right-3 bottom-24 flex items-center gap-3 rounded-2xl border border-white/25 bg-indigo-950/45 px-4 py-3 shadow-xl backdrop-blur-xl sm:-right-8">
              <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/90 text-white"><i class="fa-solid fa-check text-sm"></i></span>
              <div>
                <p class="text-xs font-bold text-white">Compétence validée</p>
                <p class="text-[11px] text-indigo-100/80">niveau atteint</p>
              </div>
            </div>

            <div class="absolute -bottom-5 left-6 flex items-center gap-3 rounded-2xl border border-white/25 bg-indigo-950/45 px-4 py-3 shadow-xl backdrop-blur-xl">
              <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/90 text-white"><i class="fa-solid fa-wand-magic-sparkles text-sm"></i></span>
              <div>
                <p class="text-xs font-bold text-white">Quiz de révision prêt</p>
                <p class="text-[11px] text-indigo-100/80">validé par le formateur</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Chiffres -->
        <div ref="sectionChiffres" class="mx-auto mt-20 grid max-w-6xl grid-cols-2 gap-3 px-4 sm:px-6 lg:grid-cols-4 lg:gap-4">
          <div
            v-for="(c, i) in chiffres" :key="c.libelle"
            class="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl"
          >
            <p class="font-['Sora'] text-4xl font-bold text-white">{{ affiches[i] }}</p>
            <p class="mt-1 text-sm font-bold text-indigo-100">{{ c.libelle }}</p>
            <p class="mt-2 text-xs leading-5 text-indigo-100/70">{{ c.detail }}</p>
          </div>
        </div>
      </section>

      <!-- ═══ Fonctionnalités ═════════════════════════════════════════════════ -->
      <section id="fonctionnalites" class="scroll-mt-24 py-20 lg:py-28">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
          <div class="max-w-2xl">
            <p class="text-sm font-bold uppercase tracking-widest text-indigo-600">Fonctionnalités</p>
            <h2 class="mt-3 font-['Sora'] text-3xl font-bold text-slate-900 sm:text-4xl">Tout le parcours projet, au même endroit</h2>
            <p class="mt-4 text-lg leading-8 text-slate-600">Fini les consignes perdues entre Drive, email et WhatsApp.</p>
          </div>
          <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <article
              v-for="f in fonctionnalites" :key="f.titre"
              class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <span class="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-200 text-indigo-600">
                <i :class="f.icone"></i>
              </span>
              <h3 class="mt-5 font-['Sora'] text-lg font-semibold text-slate-900">{{ f.titre }}</h3>
              <p class="mt-2 text-sm leading-6 text-slate-600">{{ f.texte }}</p>
            </article>
            <article class="flex flex-col justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-6 text-white shadow-xl shadow-indigo-500/20">
              <h3 class="font-['Sora'] text-lg font-semibold">Des données cloisonnées</h3>
              <p class="mt-2 text-sm leading-6 text-indigo-100">Chaque organisme dispose de son propre espace : ses membres ne voient que ses données.</p>
            </article>
          </div>
        </div>
      </section>

      <!-- ═══ Fonctionnement ══════════════════════════════════════════════════ -->
      <section id="fonctionnement" class="scroll-mt-24 border-y border-slate-200 bg-white py-20 lg:py-28">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
          <div class="mx-auto max-w-2xl text-center">
            <p class="text-sm font-bold uppercase tracking-widest text-indigo-600">Fonctionnement</p>
            <h2 class="mt-3 font-['Sora'] text-3xl font-bold text-slate-900 sm:text-4xl">Un cycle complet, en cinq étapes</h2>
          </div>
          <ol class="relative mt-14 grid gap-8 md:grid-cols-5 md:gap-4">
            <div class="absolute left-[10%] right-[10%] top-6 hidden h-0.5 bg-gradient-to-r from-indigo-200 via-indigo-400 to-violet-300 md:block" aria-hidden="true"></div>
            <li v-for="(e, i) in etapes" :key="e.titre" class="relative flex gap-4 md:flex-col md:items-center md:text-center">
              <span
                class="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-['Sora'] text-lg font-bold text-white shadow-lg"
                :class="i === etapes.length - 1 ? 'bg-violet-600 shadow-violet-500/30' : 'bg-indigo-500 shadow-indigo-500/30'"
              >{{ i + 1 }}</span>
              <div>
                <h3 class="font-['Sora'] text-base font-semibold text-slate-900 md:mt-4">{{ e.titre }}</h3>
                <p class="mt-1 text-sm leading-6 text-slate-600">{{ e.texte }}</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <!-- ═══ Aperçu de la plateforme ═════════════════════════════════════════ -->
      <section class="relative isolate overflow-hidden bg-indigo-950 py-20 lg:py-28">
        <div class="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-950 to-indigo-900"></div>
        <div class="absolute -right-24 top-0 -z-10 h-96 w-96 rounded-full bg-violet-500/30 blur-3xl"></div>
        <div class="absolute -left-24 bottom-0 -z-10 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl"></div>

        <div class="mx-auto max-w-6xl px-4 sm:px-6">
          <div class="mx-auto max-w-2xl text-center">
            <p class="text-sm font-bold uppercase tracking-widest text-indigo-300">Aperçu</p>
            <h2 class="mt-3 font-['Sora'] text-3xl font-bold text-white sm:text-4xl">Un tableau de bord pour chaque rôle</h2>
            <p class="mt-4 text-lg leading-8 text-indigo-100/80">L'essentiel en un coup d'œil : activité, retards et compétences validées.</p>
          </div>

          <div class="mx-auto mt-14 max-w-5xl rounded-3xl border border-white/20 bg-white/10 p-2 shadow-2xl shadow-indigo-950/60 backdrop-blur-xl sm:p-3">
            <div class="flex items-center gap-1.5 px-3 pb-2.5 pt-1" aria-hidden="true">
              <span class="h-3 w-3 rounded-full bg-white/30"></span>
              <span class="h-3 w-3 rounded-full bg-white/30"></span>
              <span class="h-3 w-3 rounded-full bg-white/30"></span>
            </div>
            <img :src="apercu" alt="Tableau de bord d'un administrateur d'organisme dans EduHub" class="w-full rounded-2xl" loading="lazy" />
          </div>
        </div>
      </section>

      <!-- ═══ Pour qui ════════════════════════════════════════════════════════ -->
      <section id="pour-qui" class="scroll-mt-24 py-20 lg:py-28">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
          <div class="max-w-2xl">
            <p class="text-sm font-bold uppercase tracking-widest text-indigo-600">Pour qui</p>
            <h2 class="mt-3 font-['Sora'] text-3xl font-bold text-slate-900 sm:text-4xl">Pensé pour chaque acteur de la formation</h2>
          </div>
          <div class="mt-12 grid gap-5 md:grid-cols-3">
            <article v-for="p in publics" :key="p.titre" class="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <span class="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-200 text-indigo-600">
                <i :class="p.icone"></i>
              </span>
              <h3 class="mt-5 font-['Sora'] text-lg font-semibold text-slate-900">{{ p.titre }}</h3>
              <ul class="mt-4 space-y-3">
                <li v-for="pt in p.points" :key="pt" class="flex gap-3 text-sm leading-6 text-slate-600">
                  <i class="fa-solid fa-circle-check mt-1 text-indigo-500"></i>{{ pt }}
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <!-- ═══ IA ══════════════════════════════════════════════════════════════ -->
      <section id="ia" class="scroll-mt-24 border-y border-slate-200 bg-white py-20 lg:py-28">
        <div class="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p class="text-sm font-bold uppercase tracking-widest text-indigo-600">Intelligence artificielle</p>
            <h2 class="mt-3 font-['Sora'] text-3xl font-bold text-slate-900 sm:text-4xl">L'IA assiste le formateur, sans le remplacer</h2>
            <p class="mt-4 text-lg leading-8 text-slate-600">
              À partir des supports du cours, EduHub génère des quiz et des fiches de révision.
              Rien n'est publié sans la relecture du formateur.
            </p>
            <div class="mt-6 flex flex-wrap gap-2">
              <span v-for="f in ['PDF', 'DOCX', 'PPTX']" :key="f" class="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">{{ f }}</span>
            </div>
          </div>

          <!-- Illustration du circuit : support → brouillon IA → validation -->
          <div class="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 sm:p-8">
            <div class="absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full bg-sky-300/30 blur-3xl"></div>
            <div class="space-y-3">
              <div class="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl">
                <i class="fa-solid fa-file-lines w-6 text-center text-lg text-sky-200"></i>
                <p class="text-sm font-semibold text-white">Le formateur choisit ses supports</p>
              </div>
              <div class="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl">
                <i class="fa-solid fa-wand-magic-sparkles w-6 text-center text-lg text-violet-200"></i>
                <p class="text-sm font-semibold text-white">L'IA prépare un quiz ou une fiche en brouillon</p>
              </div>
              <div class="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl">
                <i class="fa-solid fa-user-check w-6 text-center text-lg text-emerald-200"></i>
                <p class="text-sm font-semibold text-white">Le formateur relit, corrige et publie</p>
              </div>
              <div class="flex items-center gap-3 rounded-2xl border border-white/30 bg-white/20 p-4 backdrop-blur-xl">
                <i class="fa-solid fa-graduation-cap w-6 text-center text-lg text-white"></i>
                <p class="text-sm font-semibold text-white">Les apprenants révisent</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══ Appel à l'action ════════════════════════════════════════════════ -->
      <section class="py-20 lg:py-28">
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
          <div class="relative isolate overflow-hidden rounded-3xl bg-indigo-950 px-6 py-14 text-center sm:px-12 lg:py-20">
            <div class="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-900 via-indigo-950 to-violet-950"></div>
            <div class="absolute -left-20 -top-20 -z-10 h-80 w-80 rounded-full bg-indigo-500/40 blur-3xl"></div>
            <div class="absolute -bottom-24 -right-10 -z-10 h-80 w-80 rounded-full bg-violet-500/30 blur-3xl"></div>
            <h2 class="mx-auto max-w-2xl font-['Sora'] text-3xl font-bold text-white sm:text-4xl">Vous êtes un organisme de formation ?</h2>
            <p class="mx-auto mt-4 max-w-xl text-lg leading-8 text-indigo-100/85">
              Inscrivez-vous et réglez l'abonnement par Wave ou Orange Money :
              votre espace est créé aussitôt, et vous recevez un email pour l'activer.
            </p>
            <div class="mt-9 flex flex-wrap justify-center gap-3">
              <router-link
                v-if="!connecte"
                to="/inscription"
                class="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-indigo-700 shadow-xl transition hover:bg-indigo-50"
              >
                Inscrire mon organisme <i class="fa-solid fa-arrow-right text-xs"></i>
              </router-link>
              <router-link
                to="/login"
                class="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20"
              >
                {{ libelleConnexion }}
              </router-link>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- ═══ Pied de page ═════════════════════════════════════════════════════ -->
    <footer class="border-t border-slate-200 bg-white">
      <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <img :src="logo" alt="EduHub" class="h-7 w-auto" />
        <p class="text-center text-xs text-slate-500">{{ pied }}</p>
        <router-link to="/login" class="text-sm font-semibold text-indigo-600 hover:text-indigo-700">{{ libelleConnexion }}</router-link>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Carte « Livrable déposé » : léger flottement en boucle */
.flottant {
  animation: flotter 4s ease-in-out infinite;
}
@keyframes flotter {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
@media (prefers-reduced-motion: reduce) {
  .flottant { animation: none; }
}
</style>
