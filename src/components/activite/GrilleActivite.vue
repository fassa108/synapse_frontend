<script setup>
/**
 * GrilleActivite — activité jour par jour, en trois vues animées :
 * - Calendrier : un carré par jour, une colonne par semaine (lundi en haut) ;
 * - Jours : les jours actifs regroupés par jour de la semaine, du plus intense
 *   au moins intense ;
 * - Mois : les jours actifs empilés par mois, comme un histogramme.
 * Les carrés glissent d'une vue à l'autre. Défilement automatique des vues,
 * arrêté au survol, au focus, au premier clic, ou si l'utilisateur préfère
 * réduire les animations.
 *
 * Adapté du composant React « activity-heatmap » (CCgather).
 *
 * Props : jours — [{ date: 'AAAA-MM-JJ', actions }] consécutifs, du plus ancien
 * au plus récent ; tailleCase (px, au plus) ; couleur ; defilementAuto ;
 * intervalle (ms) ; unite — [singulier, pluriel].
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  jours: { type: Array, required: true },
  tailleCase: { type: Number, default: 10 },
  couleur: { type: String, default: '#6366f1' },
  defilementAuto: { type: Boolean, default: true },
  intervalle: { type: Number, default: 3200 },
  unite: { type: Array, default: () => ['action', 'actions'] },
})

const VUES = ['calendrier', 'jours', 'mois']
const NOMS_VUES = { calendrier: 'Calendrier', jours: 'Jours', mois: 'Mois' }
const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const JOURS_LONGS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const MELANGE_NIVEAUX = [0, 28, 48, 72, 100]
const HAUTEUR = 256
const GAUCHE = 58
const BASE = 230

const FORMAT_JOUR = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const FORMAT_COURT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const FORMAT_FIN = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const FORMAT_MOIS = new Intl.DateTimeFormat('fr-FR', { month: 'short' })

const versDate = (cle) => {
  const [a, m, j] = cle.split('-').map(Number)
  return new Date(a, m - 1, j)
}

const quantite = (n) => `${n} ${n > 1 ? props.unite[1] : props.unite[0]}`
const enJours = (n) => `${n} jour${n > 1 ? 's' : ''}`

// ─── Données ──────────────────────────────────────────────────────────────────

const cases = computed(() => {
  if (!props.jours.length) return []
  const decalage = (versDate(props.jours[0].date).getDay() + 6) % 7 // lundi = 0
  return props.jours.map((j, i) => {
    const date = versDate(j.date)
    return {
      date: j.date,
      valeur: Math.max(0, Number(j.actions) || 0),
      jour: (date.getDay() + 6) % 7,
      semaine: Math.floor((i + decalage) / 7),
      mois: j.date.slice(0, 7),
      libelle: FORMAT_JOUR.format(date),
    }
  })
})

const plusIntenseDabord = (a, b) => b.valeur - a.valeur || a.date.localeCompare(b.date)

const disposer = (liste, largeur, tailleMax) => {
  const utile = Math.max(7, largeur - GAUCHE - 8)
  const nbSemaines = (liste.at(-1)?.semaine ?? 0) + 1
  const capacite = Math.max(1, Math.floor((utile + 1) / 7))
  const premiereSemaine = Math.max(0, nbSemaines - capacite)
  const affichees = liste.filter((c) => c.semaine >= premiereSemaine)
  const semaines = Math.max(1, nbSemaines - premiereSemaine)

  const parJour = Array.from({ length: 7 }, () => [])
  const mois = []
  for (const c of affichees) {
    let m = mois.find((e) => e.cle === c.mois)
    if (!m) {
      m = { cle: c.mois, libelle: FORMAT_MOIS.format(versDate(c.date)), cases: [], premiereSemaine: c.semaine }
      mois.push(m)
    }
    if (c.valeur > 0) {
      parJour[c.jour].push(c)
      m.cases.push(c)
    }
  }
  parJour.forEach((g) => g.sort(plusIntenseDabord))
  mois.forEach((m) => m.cases.sort(plusIntenseDabord))
  const rangsJour = new Map(parJour.flatMap((g) => g.map((c, rang) => [c.date, rang])))
  const rangsMois = new Map(mois.flatMap((m, colonne) => m.cases.map((c, rang) => [c.date, { rang, colonne }])))
  const maxMois = Math.max(1, ...mois.map((m) => m.cases.length))
  const maxJour = Math.max(1, ...parJour.map((g) => g.length))
  const cote = Math.max(6, Math.min(tailleMax, 16, utile / semaines - 1, (BASE - 24) / maxMois - 0.5))

  let total = 0
  let actifs = 0
  let plusLongue = 0
  let enCours = 0
  for (const c of affichees) {
    total += c.valeur
    if (c.valeur > 0) {
      actifs += 1
      enCours += 1
      plusLongue = Math.max(plusLongue, enCours)
    } else enCours = 0
  }

  return {
    affichees, semaines, premiereSemaine, parJour, mois, rangsJour, rangsMois, cote,
    pasJour: Math.min(cote + 2, (utile - cote) / Math.max(1, maxJour - 1)),
    pasMois: Math.min(cote + 1, (BASE - 24) / maxMois),
    pasCalendrier: utile / semaines,
    colonneMois: utile / Math.max(1, mois.length),
    total, actifs, plusLongue, enCours,
    meilleurJour: parJour.findIndex((g) => g.length === maxJour),
    meilleurMois: mois.findIndex((m) => m.cases.length === maxMois),
  }
}

// ─── État ─────────────────────────────────────────────────────────────────────

const hote = ref(null)
const trace = ref(null)
const bulleRef = ref(null)
const largeur = ref(0)
const vue = ref('calendrier')
const reduit = ref(true)
const survol = ref(false)
const focus = ref(false)
const arrete = ref(false)
const cache = ref(false)
const dateFocus = ref('')
const bulle = ref(null)

const d = computed(() => disposer(cases.value, largeur.value || 660, Math.max(6, props.tailleCase)))
const pret = computed(() => largeur.value > 0 && cases.value.length > 0)
const tronque = computed(() => d.value.affichees.length < cases.value.length)
const visibles = computed(() =>
  vue.value === 'calendrier' ? d.value.affichees : d.value.affichees.filter((c) => c.valeur > 0),
)
const dateTab = computed(() =>
  visibles.value.some((c) => c.date === dateFocus.value) ? dateFocus.value : visibles.value[0]?.date,
)
const maximum = computed(() => Math.max(1, ...d.value.affichees.map((c) => c.valeur)))
const enMarche = computed(
  () => props.defilementAuto && !reduit.value && !survol.value && !focus.value && !arrete.value && !cache.value && pret.value,
)

const niveau = (v) => (v <= 0 ? 0 : Math.min(4, Math.ceil((v / maximum.value) * 4)))
const couleurNiveau = (n) => (n === 0 ? undefined : `color-mix(in srgb, ${props.couleur} ${MELANGE_NIVEAUX[n]}%, transparent)`)

const position = (c, v) => {
  const calendrier = { x: GAUCHE + (c.semaine - d.value.premiereSemaine) * d.value.pasCalendrier, y: 52 + c.jour * 24 }
  if (v === 'calendrier' || c.valeur <= 0) return calendrier
  if (v === 'jours') return { x: GAUCHE + (d.value.rangsJour.get(c.date) ?? 0) * d.value.pasJour, y: calendrier.y }
  const at = d.value.rangsMois.get(c.date)
  return {
    x: GAUCHE + (at.colonne + 0.5) * d.value.colonneMois - d.value.cote / 2,
    y: BASE - d.value.cote - at.rang * d.value.pasMois,
  }
}

const statistiques = computed(() => [
  { cle: 'total', label: 'Total', valeur: quantite(d.value.total) },
  { cle: 'actifs', label: 'Jours actifs', valeur: String(d.value.actifs) },
  { cle: 'longue', label: 'Plus longue série', valeur: enJours(d.value.plusLongue) },
  { cle: 'cours', label: 'Série en cours', valeur: enJours(d.value.enCours) },
])

const periode = computed(() => {
  const premier = d.value.affichees[0]
  const dernier = d.value.affichees.at(-1)
  if (!premier || !dernier) return ''
  return `${FORMAT_COURT.format(versDate(premier.date))} – ${FORMAT_FIN.format(versDate(dernier.date))}`
})

const constat = computed(() => {
  if (!d.value.actifs) return 'Aucun jour actif sur la période'
  if (vue.value === 'jours') {
    const n = d.value.parJour[d.value.meilleurJour].length
    return `Le ${JOURS_LONGS[d.value.meilleurJour]} est le plus actif : ${enJours(n)}`
  }
  if (vue.value === 'mois') {
    const m = d.value.mois[d.value.meilleurMois]
    return `${m.libelle.charAt(0).toUpperCase()}${m.libelle.slice(1)} est le mois le plus actif : ${enJours(m.cases.length)}`
  }
  return 'Un peu chaque jour, ça finit par compter.'
})

// ─── Vues et défilement automatique ───────────────────────────────────────────

const changerVue = (suivante, manuel = false) => {
  if (manuel) arrete.value = true
  bulle.value = null
  vue.value = suivante
}

let minuterie = null
watch(
  [enMarche, vue, () => props.intervalle],
  () => {
    clearTimeout(minuterie)
    if (!enMarche.value) return
    minuterie = setTimeout(
      () => changerVue(VUES[(VUES.indexOf(vue.value) + 1) % VUES.length]),
      Math.max(900, props.intervalle),
    )
  },
  { immediate: true },
)

const clavierVues = (e) => {
  let i = -1
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = (VUES.indexOf(vue.value) + 1) % 3
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = (VUES.indexOf(vue.value) + 2) % 3
  if (e.key === 'Home') i = 0
  if (e.key === 'End') i = 2
  if (i < 0) return
  e.preventDefault()
  changerVue(VUES[i], true)
  e.currentTarget.querySelector(`[data-vue="${VUES[i]}"]`)?.focus()
}

// ─── Infobulle et clavier ─────────────────────────────────────────────────────

const montrerBulle = (c, cible) => {
  const { left, top, right, bottom } = cible.getBoundingClientRect()
  bulle.value = { c, left, top, right, bottom }
}

watch(bulle, async (b) => {
  if (!b) return
  await nextTick()
  const el = bulleRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const gauche = (b.left + b.right - r.width) / 2
  const haut = b.top - r.height - 8 >= 8 ? b.top - r.height - 8 : b.bottom + 8
  el.style.left = `${Math.max(8, Math.min(innerWidth - r.width - 8, gauche))}px`
  el.style.top = `${Math.max(8, Math.min(innerHeight - r.height - 8, haut))}px`
})

const DIRECTIONS = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }
const naviguer = (e, c) => {
  if (e.key === 'Escape') {
    bulle.value = null
    return
  }
  const dir = DIRECTIONS[e.key]
  if (!dir && e.key !== 'Home' && e.key !== 'End') return
  e.preventDefault()
  arrete.value = true
  let suivante = e.key === 'Home' ? visibles.value[0] : e.key === 'End' ? visibles.value.at(-1) : undefined
  if (dir) {
    const ici = position(c, vue.value)
    suivante = visibles.value
      .map((autre) => {
        const at = position(autre, vue.value)
        const dx = at.x - ici.x
        const dy = at.y - ici.y
        const avant = dx * dir[0] + dy * dir[1]
        const cote = Math.abs(dx * dir[1] - dy * dir[0])
        return { c: autre, avant, distance: avant + cote * 20 }
      })
      .filter((x) => x.avant > 0.5)
      .sort((a, b) => a.distance - b.distance)[0]?.c
  }
  if (suivante) trace.value?.querySelector(`[data-date="${suivante.date}"]`)?.focus()
}

const surFocusSortant = (e) => {
  if (!e.currentTarget.contains(e.relatedTarget)) focus.value = false
}
const surPointeur = (e) => {
  if (!e.target.closest('[data-pause]')) arrete.value = true
}

// ─── Cycle de vie ─────────────────────────────────────────────────────────────

let observateur = null
let media = null
const majReduit = () => (reduit.value = media.matches)
const majCache = () => (cache.value = document.hidden)
const effacerBulle = () => (bulle.value = null)

onMounted(() => {
  media = window.matchMedia('(prefers-reduced-motion: reduce)')
  majReduit()
  majCache()
  media.addEventListener('change', majReduit)
  document.addEventListener('visibilitychange', majCache)
  window.addEventListener('scroll', effacerBulle, true)
  observateur = new ResizeObserver(() => {
    largeur.value = hote.value.getBoundingClientRect().width
    bulle.value = null
  })
  observateur.observe(hote.value)
  largeur.value = hote.value.getBoundingClientRect().width
})

onUnmounted(() => {
  clearTimeout(minuterie)
  observateur?.disconnect()
  media?.removeEventListener('change', majReduit)
  document.removeEventListener('visibilitychange', majCache)
  window.removeEventListener('scroll', effacerBulle, true)
})
</script>

<template>
  <div
    class="w-full min-w-0 font-['Plus_Jakarta_Sans'] text-gray-900"
    @mouseenter="survol = true"
    @mouseleave="survol = false; bulle = null"
    @focusin="focus = true"
    @focusout="surFocusSortant"
    @pointerdown="surPointeur"
  >
    <div ref="hote" class="w-full min-w-0">
      <!-- Chiffres clés -->
      <div class="grid grid-cols-2 gap-3 min-[480px]:grid-cols-4">
        <div v-for="s in statistiques" :key="s.cle" class="min-w-0">
          <p class="text-[11px] leading-4 text-zinc-400">{{ s.label }}</p>
          <p class="mt-0.5 truncate font-['Sora'] text-lg font-semibold leading-6 tabular-nums" :title="s.valeur">{{ s.valeur }}</p>
        </div>
      </div>

      <!-- Choix de la vue -->
      <div class="mt-5 flex min-w-0 items-center justify-between gap-2 border-t border-slate-100 pt-4">
        <div role="radiogroup" aria-label="Vue de l'activité" class="inline-flex min-w-0 gap-1 rounded-lg bg-slate-100 p-1" @keydown="clavierVues">
          <button
            v-for="option in VUES"
            :key="option"
            type="button"
            role="radio"
            :data-vue="option"
            :aria-checked="vue === option"
            :tabindex="vue === option ? 0 : -1"
            class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            :class="vue === option ? 'bg-white text-gray-900 shadow-sm' : 'text-zinc-500 hover:text-gray-900'"
            @click="changerVue(option, true)"
          >
            <i
              class="fa-solid hidden text-[10px] min-[480px]:inline"
              :class="{ calendrier: 'fa-calendar-days', jours: 'fa-bars-staggered', mois: 'fa-chart-column' }[option]"
            ></i>
            {{ NOMS_VUES[option] }}
          </button>
        </div>
        <button
          v-if="defilementAuto && !reduit"
          type="button"
          data-pause
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          :aria-label="arrete ? 'Reprendre le défilement des vues' : 'Mettre en pause le défilement des vues'"
          @click="arrete = !arrete"
        >
          <i class="fa-solid text-[11px]" :class="arrete ? 'fa-play' : 'fa-pause'"></i>
        </button>
      </div>

      <div class="mt-3 flex min-h-5 items-center justify-between gap-2 text-[11px] leading-4">
        <p class="font-medium text-gray-900" aria-live="polite">{{ constat }}</p>
        <span class="hidden shrink-0 text-zinc-400 min-[480px]:inline">Un carré, une journée</span>
      </div>
      <p v-if="tronque" class="mt-2 text-[11px] leading-4 text-zinc-400">
        Les {{ d.semaines }} dernières semaines ({{ d.affichees.length }} jours sur {{ cases.length }}) ; les chiffres portent sur ces jours.
      </p>

      <!-- Tracé -->
      <div
        ref="trace"
        role="group"
        :aria-label="`Activité, vue ${NOMS_VUES[vue]}`"
        :aria-busy="!pret"
        class="relative mt-1 w-full overflow-hidden"
        :style="{ height: `${HAUTEUR}px`, visibility: pret ? 'visible' : 'hidden' }"
      >
        <div aria-hidden="true" class="pointer-events-none absolute inset-0">
          <!-- Jours de la semaine -->
          <div
            v-for="(jour, i) in JOURS_COURTS"
            :key="jour"
            class="absolute inset-x-0"
            :style="{ top: `${52 + i * 24}px`, height: `${d.cote}px`, opacity: vue === 'mois' ? 0 : 1, transition: reduit ? 'none' : 'opacity 180ms' }"
          >
            <div class="absolute right-0 top-1/2 border-t border-dashed border-slate-200/70" :style="{ left: `${GAUCHE}px` }"></div>
            <span
              class="absolute inset-y-0 left-0 flex w-12 items-center justify-between text-[10px]"
              :class="vue === 'jours' && i === d.meilleurJour ? 'font-semibold text-gray-900' : 'text-zinc-400'"
            >
              <span>{{ jour }}</span>
              <span v-if="vue === 'jours'" class="tabular-nums">{{ d.parJour[i].length }}</span>
            </span>
          </div>

          <!-- Mois : en tête de colonne (calendrier) ou sous les barres (mois) -->
          <template v-for="(m, i) in d.mois" :key="m.cle">
            <span
              class="absolute text-[10px] leading-3"
              :class="vue === 'mois' && i === d.meilleurMois ? 'font-semibold text-gray-900' : 'text-zinc-400'"
              :style="{
                left: `${vue === 'mois' ? GAUCHE + (i + 0.5) * d.colonneMois : GAUCHE + (m.premiereSemaine - d.premiereSemaine) * d.pasCalendrier}px`,
                top: `${vue === 'mois' ? BASE + 9 : 25}px`,
                transform: vue === 'mois' ? 'translateX(-50%)' : undefined,
                opacity: vue === 'jours' ? 0 : 1,
              }"
            >
              {{ m.libelle }}
            </span>
            <span
              v-if="vue === 'mois'"
              class="absolute text-[10px] leading-3 tabular-nums"
              :class="i === d.meilleurMois ? 'font-semibold text-gray-900' : 'text-zinc-400'"
              :style="{
                left: `${GAUCHE + (i + 0.5) * d.colonneMois}px`,
                top: `${BASE - (m.cases.length ? d.cote + (m.cases.length - 1) * d.pasMois : 0) - 17}px`,
                transform: 'translateX(-50%)',
              }"
            >
              {{ m.cases.length }}
            </span>
          </template>
        </div>

        <!-- Un carré par jour -->
        <button
          v-for="(c, index) in d.affichees"
          :key="c.date"
          type="button"
          :data-date="c.date"
          :aria-label="`${c.libelle} : ${quantite(c.valeur)}`"
          :aria-hidden="!(vue === 'calendrier' || c.valeur > 0)"
          :disabled="!(vue === 'calendrier' || c.valeur > 0)"
          :tabindex="(vue === 'calendrier' || c.valeur > 0) && c.date === dateTab ? 0 : -1"
          class="absolute left-0 top-0 m-0 cursor-crosshair rounded-[2px] border-0 bg-slate-100 p-0 outline-none hover:ring-2 hover:ring-indigo-300 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
          :style="{
            width: `${d.cote}px`,
            height: `${d.cote}px`,
            transform: `translate(${position(c, vue).x}px, ${position(c, vue).y}px)`,
            opacity: vue === 'calendrier' || c.valeur > 0 ? 1 : 0,
            pointerEvents: vue === 'calendrier' || c.valeur > 0 ? 'auto' : 'none',
            backgroundColor: couleurNiveau(niveau(c.valeur)),
            transitionProperty: 'transform, opacity',
            transitionDuration: reduit ? '0ms' : '620ms',
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            transitionDelay: reduit ? '0ms' : `${(index % 13) * 12}ms`,
          }"
          @pointerenter="montrerBulle(c, $event.currentTarget)"
          @pointerleave="bulle = null"
          @focus="dateFocus = c.date; montrerBulle(c, $event.currentTarget)"
          @blur="bulle = null"
          @keydown="naviguer($event, c)"
        ></button>
      </div>

      <div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] leading-4 text-zinc-400">
        <span>{{ periode }}</span>
        <div class="flex items-center gap-1.5" aria-label="Intensité : de moins à plus d'activité">
          <span>Moins</span>
          <span
            v-for="(_, n) in MELANGE_NIVEAUX"
            :key="n"
            class="h-2 w-2 rounded-[1px] bg-slate-100"
            :style="{ backgroundColor: couleurNiveau(n) }"
          ></span>
          <span>Plus</span>
        </div>
      </div>
    </div>

    <!-- Infobulle -->
    <div
      v-if="bulle"
      ref="bulleRef"
      role="tooltip"
      class="pointer-events-none fixed z-50 w-max max-w-[calc(100vw-16px)] rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg"
      style="left: 8px; top: 8px"
    >
      <p class="text-[10px] capitalize text-zinc-400">{{ bulle.c.libelle }}</p>
      <p class="mt-0.5 text-xs font-semibold">
        {{ quantite(bulle.c.valeur) }}<template v-if="bulle.c.valeur === 0"> · aucune activité</template>
      </p>
    </div>
  </div>
</template>
