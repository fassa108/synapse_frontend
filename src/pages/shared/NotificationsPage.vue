<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import AppPagination from '../../components/ui/AppPagination.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import NotificationItem from '../../components/notifications/NotificationItem.vue'
import { useNotifications } from '../../composables/useNotifications'
import { getNotifications } from '../../services/notifications'

const TAILLE = 20

const router = useRouter()
const { tenantId, nonLues, marquerLue, toutMarquerLu, rafraichirCompteur } = useNotifications()

const notifications = ref([])
const total = ref(0)
const page = ref(1)
const filtre = ref('toutes')
const chargement = ref(true)
const erreur = ref('')

const charger = async () => {
  chargement.value = true
  erreur.value = ''
  try {
    const params = { page: page.value, taille: TAILLE }
    if (filtre.value === 'non_lues') params.non_lues = 1
    const data = await getNotifications(tenantId.value, params)
    notifications.value = data.results
    total.value = data.count
  } catch {
    erreur.value = 'Impossible de charger les notifications.'
  } finally {
    chargement.value = false
  }
}

const choisirFiltre = (valeur) => {
  filtre.value = valeur
  page.value = 1
}

watch([page, filtre], charger)

const ouvrir = async (notification) => {
  try {
    await marquerLue(notification)
  } catch {
    // la navigation reste possible même si le marquage échoue
  }
  if (notification.lien) router.push(notification.lien)
}

const toutLire = async () => {
  await toutMarquerLu()
  if (filtre.value === 'non_lues') page.value === 1 ? charger() : (page.value = 1)
  else notifications.value.forEach((n) => (n.lue = true))
}

onMounted(() => {
  charger()
  rafraichirCompteur()
})
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <PageHeader titre="Notifications" description="Les événements qui vous concernent, du plus récent au plus ancien.">
        <template #actions>
          <button
            v-if="nonLues > 0"
            type="button"
            class="rounded-lg border border-slate-200 bg-white px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm font-medium text-zinc-700 transition hover:bg-slate-50"
            @click="toutLire"
          >
            <i class="fa-solid fa-check-double mr-1.5 text-xs"></i>Tout marquer comme lu
          </button>
        </template>
      </PageHeader>

      <div class="mt-6 max-w-3xl">
        <div class="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1" role="tablist">
          <button
            v-for="f in [{ v: 'toutes', l: 'Toutes' }, { v: 'non_lues', l: `Non lues (${nonLues})` }]"
            :key="f.v"
            type="button"
            role="tab"
            :aria-selected="filtre === f.v"
            class="rounded-md px-3 py-1.5 font-['Plus_Jakarta_Sans'] text-sm font-medium transition"
            :class="filtre === f.v ? 'bg-indigo-500 text-white' : 'text-zinc-600 hover:bg-slate-50'"
            @click="choisirFiltre(f.v)"
          >
            {{ f.l }}
          </button>
        </div>

        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <p v-if="chargement" class="px-4 py-10 text-center font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
            Chargement…
          </p>
          <p v-else-if="erreur" class="px-4 py-10 text-center font-['Plus_Jakarta_Sans'] text-sm text-red-500">
            {{ erreur }}
          </p>
          <div v-else-if="!notifications.length" class="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <i class="fa-regular fa-bell text-2xl text-zinc-300"></i>
            <p class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
              {{ filtre === 'non_lues' ? 'Tout est lu.' : 'Aucune notification pour le moment.' }}
            </p>
          </div>
          <div v-else class="divide-y divide-slate-100">
            <NotificationItem
              v-for="n in notifications"
              :key="n.id"
              :notification="n"
              @ouvrir="ouvrir"
            />
          </div>
        </div>

        <AppPagination v-model:page="page" :total="total" :page-size="TAILLE" class="mt-4" />
      </div>
    </div>
  </AppLayout>
</template>
