<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from './Sidebar.vue'
import LayoutHeader from './LayoutHeader.vue'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const role = computed(() => authStore.role)

const organisme = computed(() => authStore.tenantCourant?.nom ?? '')

const tenants = computed(() => authStore.tenants ?? [])

const prenom = computed(() => authStore.utilisateur?.prenom ?? '')
const nom = computed(() => authStore.utilisateur?.nom ?? '')

const handleChangerOrganisme = () => {
  router.push('/choisir-organisme')
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-slate-50">
    <!-- Sidebar fixe -->
    <Sidebar
      v-if="role"
      :role="role"
      :organisme="organisme"
      :tenants="tenants"
      @changer-organisme="handleChangerOrganisme"
    />

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
