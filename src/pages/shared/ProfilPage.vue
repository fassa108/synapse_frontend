<script setup>
import { computed } from 'vue'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const utilisateur = computed(() => authStore.utilisateur)
const tenant = computed(() => authStore.tenantCourant)

const initiales = computed(() => {
  const p = utilisateur.value?.prenom?.[0] ?? '?'
  const n = utilisateur.value?.nom?.[0] ?? ''
  return (p + n).toUpperCase()
})

const labelRole = computed(() => {
  const map = {
    ADMINISTRATEUR: 'Admin Organisme',
    FORMATEUR: 'Formateur',
    APPRENANT: 'Apprenant',
    admin_saas: 'Admin SaaS',
  }
  return map[authStore.role] ?? authStore.role ?? '—'
})
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader titre="Mon profil" />

      <div class="mt-8 max-w-2xl">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex items-center gap-5 border-b border-slate-100 pb-6">
            <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-500">
              <span class="font-['Plus_Jakarta_Sans'] text-xl font-bold text-white">
                {{ initiales }}
              </span>
            </div>
            <div>
              <h2 class="font-['Sora'] text-lg font-semibold text-gray-900">
                {{ utilisateur?.prenom }} {{ utilisateur?.nom }}
              </h2>
              <p class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-500">
                {{ utilisateur?.email }}
              </p>
              <span class="mt-1 inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 font-['Plus_Jakarta_Sans'] text-xs font-medium text-indigo-600 ring-1 ring-indigo-200">
                {{ labelRole }}
              </span>
            </div>
          </div>

          <dl class="mt-5 flex flex-col gap-4">
            <div v-if="tenant">
              <dt class="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Organisme actif
              </dt>
              <dd class="mt-1 font-['Plus_Jakarta_Sans'] text-sm text-zinc-700">
                {{ tenant.nom }}
              </dd>
            </div>
            <div>
              <dt class="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Identifiant
              </dt>
              <dd class="mt-1 font-mono text-sm text-zinc-400">
                #{{ utilisateur?.id }}
              </dd>
            </div>
          </dl>
        </div>
      </div>

    </div>
  </AppLayout>
</template>
