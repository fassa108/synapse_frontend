<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const props = defineProps({
  prenom: { type: String, default: '' },
  nom:    { type: String, default: '' },
  role:   { type: String, default: '' },
})

const route   = useRoute()
const router  = useRouter()
const authStore = useAuthStore()

// ─── Organisme ────────────────────────────────────────────────────────────────
const tenantCourant    = computed(() => authStore.tenantCourant)
const hasMultipleTenants = computed(() => (authStore.tenants?.length ?? 0) > 1)

const handleChangerOrganisme = () => {
  if (hasMultipleTenants.value) router.push('/choisir-organisme')
}

// ─── Breadcrumbs ──────────────────────────────────────────────────────────────
const routeLabels = {
  dashboard:   'Dashboard',
  admin:       'Administration',
  formations:  'Formations',
  promotions:  'Promotions',
  modules:     'Modules',
  competences: 'Compétences',
  niveaux:     'Niveaux',
  apprenants:  'Apprenants',
  formateurs:  'Formateurs',
  groupes:     'Groupes',
  briefs:      'Briefs',
  activites:   'Mes activités',
  livrables:   'Mes livrables',
  'ma-formation': 'Ma formation',
  creer:       'Créer',
  formateur:   'Espace Formateur',
  apprenant:   'Espace Apprenant',
  organismes:  'Organismes',
  profil:      'Profil',
  parametres:  'Paramètres',
  detail:      'Détail',
}

const breadcrumbs = computed(() => {
  const segments = route.path
    .split('/')
    .filter(Boolean)
    .filter((s) => !/^\d+$/.test(s))

  if (segments.length === 0) return [{ label: 'Accueil', last: true }]

  return segments.map((seg, i) => ({
    label: routeLabels[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1),
    last:  i === segments.length - 1,
  }))
})

// ─── Utilisateur ──────────────────────────────────────────────────────────────
const labelRole = computed(() => {
  const map = {
    ADMINISTRATEUR: 'Admin Organisme',
    FORMATEUR:      'Formateur',
    APPRENANT:      'Apprenant',
    admin_saas:     'Admin SaaS',
  }
  return map[props.role] ?? props.role
})

const initiales = computed(() => {
  const p = props.prenom?.charAt(0) ?? ''
  const n = props.nom?.charAt(0)    ?? ''
  return (p + n).toUpperCase() || '?'
})
</script>

<template>
  <header
    class="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/70 bg-white px-6 shadow-[0px_1px_4px_0px_rgba(0,0,0,0.04)]"
  >
    <!-- Gauche : breadcrumbs -->
    <nav class="flex items-center gap-1.5" aria-label="Fil d'Ariane">
      <template v-for="(crumb, i) in breadcrumbs" :key="i">
        <span
          class="font-['Plus_Jakarta_Sans'] text-sm leading-5"
          :class="crumb.last ? 'font-semibold text-gray-900' : 'font-normal text-zinc-400'"
        >
          {{ crumb.label }}
        </span>
        <span v-if="!crumb.last" class="text-xs text-zinc-300" aria-hidden="true">/</span>
      </template>
    </nav>

    <!-- Droite -->
    <div class="flex items-center gap-3">

      <!-- Organisme actif -->
      <button
        v-if="tenantCourant"
        type="button"
        class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 transition"
        :class="hasMultipleTenants ? 'hover:bg-slate-100 cursor-pointer' : 'cursor-default'"
        :disabled="!hasMultipleTenants"
        @click="handleChangerOrganisme"
        :title="hasMultipleTenants ? 'Changer d\'organisme' : ''"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
        <span class="font-['Plus_Jakarta_Sans'] text-xs font-medium text-zinc-700">
          {{ tenantCourant.nom }}
        </span>
        <i v-if="hasMultipleTenants" class="fa-solid fa-chevron-down text-[10px] text-zinc-400"></i>
      </button>

      <!-- Séparateur -->
      <div class="h-5 w-px bg-slate-200"></div>

      <!-- Notifications -->
      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-slate-100"
        aria-label="Notifications"
      >
        <i class="fa-solid fa-bell text-sm"></i>
      </button>

      <!-- Utilisateur -->
      <div class="flex items-center gap-2">
        <div class="flex flex-col items-end">
          <span class="font-['Plus_Jakarta_Sans'] text-xs font-semibold leading-4 text-gray-900">
            {{ prenom }} {{ nom }}
          </span>
          <span class="font-['Plus_Jakarta_Sans'] text-[10px] leading-3 text-zinc-400">
            {{ labelRole }}
          </span>
        </div>
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500">
          <span class="font-['Plus_Jakarta_Sans'] text-[11px] font-bold uppercase text-white">
            {{ initiales }}
          </span>
        </div>
      </div>

    </div>
  </header>
</template>
