<script setup>
import { computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Sidebar from './Sidebar.vue'
import LayoutHeader from './LayoutHeader.vue'
import { useAuthStore } from '../../stores/auth'
import { useSidebar } from '../../composables/useSidebar'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { ouverteMobile, fermerMobile } = useSidebar()

const role = computed(() => authStore.role)

const organisme = computed(() => authStore.tenantCourant?.nom ?? '')

const tenants = computed(() => authStore.tenants ?? [])

const prenom = computed(() => authStore.utilisateur?.prenom ?? '')
const nom = computed(() => authStore.utilisateur?.nom ?? '')

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

      <!-- Contenu scrollable -->
      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>
