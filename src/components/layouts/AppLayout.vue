<script setup>
import { computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Sidebar from './Sidebar.vue'
import LayoutHeader from './LayoutHeader.vue'
import AssistantFlottant from '../assistant/AssistantFlottant.vue'
import { useAuthStore } from '../../stores/auth'
import { useSidebar } from '../../composables/useSidebar'
import { useAbonnement } from '../../composables/useAbonnement'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { ouverteMobile, fermerMobile } = useSidebar()

const role = computed(() => authStore.role)

const organisme = computed(() => authStore.tenantCourant?.nom ?? '')

const tenants = computed(() => authStore.tenants ?? [])

const prenom = computed(() => authStore.utilisateur?.prenom ?? '')
const nom = computed(() => authStore.utilisateur?.nom ?? '')

// Échéance de l'abonnement (bannière), sauf sur la page « Abonnement » elle-même
const { alerte, charger: chargerAbonnement } = useAbonnement()
const alerteAbonnement = computed(() =>
  role.value === 'ADMINISTRATEUR' && !route.path.startsWith('/abonnement') ? alerte.value : null,
)
watch(
  () => [role.value, authStore.tenantCourant?.id],
  ([r, id]) => {
    if (r === 'ADMINISTRATEUR') chargerAbonnement(id)
  },
  { immediate: true },
)

const handleChangerOrganisme = () => {
  router.push('/choisir-organisme')
}

// Mobile : le tiroir se referme après une navigation ou avec Échap
watch(() => route.fullPath, fermerMobile)

const surTouche = (e) => {
  if (e.key === 'Escape') fermerMobile()
}
onMounted(() => {
  fermerMobile()
  window.addEventListener('keydown', surTouche)
})
onBeforeUnmount(() => window.removeEventListener('keydown', surTouche))
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-slate-50">
    <!-- Sidebar : réductible sur desktop, tiroir sur mobile -->
    <Sidebar
      v-if="role"
      :role="role"
      :organisme="organisme"
      :tenants="tenants"
      @changer-organisme="handleChangerOrganisme"
    />

    <!-- Fond du tiroir mobile -->
    <div
      v-if="role && ouverteMobile"
      class="fixed inset-0 z-30 bg-black/30 lg:hidden"
      aria-hidden="true"
      @click="fermerMobile"
    ></div>

    <!-- Colonne principale -->
    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <!-- Topbar -->
      <LayoutHeader
        :prenom="prenom"
        :nom="nom"
        :role="role"
      />

      <!-- Abonnement bientôt échu, en grâce ou expiré : administrateur seulement -->
      <div
        v-if="alerteAbonnement"
        class="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 font-['Plus_Jakarta_Sans'] text-sm sm:px-6"
        :class="alerteAbonnement.niveau === 'erreur' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'"
      >
        <span class="flex items-center gap-2">
          <i :class="alerteAbonnement.niveau === 'erreur' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-bell'"></i>
          {{ alerteAbonnement.texte }}
        </span>
        <RouterLink to="/abonnement" class="font-semibold underline underline-offset-2 hover:no-underline">
          Renouveler
        </RouterLink>
      </div>

      <!-- Contenu scrollable -->
      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>

    <!-- Assistant pédagogique : apprenants seulement -->
    <AssistantFlottant v-if="role === 'APPRENANT' && authStore.tenantCourant" />
  </div>
</template>
