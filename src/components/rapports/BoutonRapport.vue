<script setup>
/**
 * BoutonRapport — demande un rapport à l'IA puis ouvre sa page (le texte
 * y arrive en quelques secondes). Un rapport déjà en cours pour la même
 * cible est ouvert au lieu d'en demander un autre.
 *
 * Props : type ('PROMOTION' | 'APPRENANT'), promotionId, apprenantId (bilan), libelle.
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '../ui/AppButton.vue'
import { useAuthStore } from '../../stores/auth'
import { demanderRapport, getRapports } from '../../services/rapports'

const props = defineProps({
  type: { type: String, required: true },
  promotionId: { type: [Number, String], required: true },
  apprenantId: { type: [Number, String], default: null },
  libelle: { type: String, default: '' },
  variant: { type: String, default: 'secondary' },
})

const emit = defineEmits(['erreur'])
const router = useRouter()
const authStore = useAuthStore()
const envoi = ref(false)

const demander = async () => {
  const tenantId = authStore.tenantCourant?.id
  envoi.value = true
  try {
    const rapport = await demanderRapport(tenantId, {
      type: props.type,
      promotion: Number(props.promotionId),
      apprenant: props.apprenantId ? Number(props.apprenantId) : null,
    })
    router.push(`/rapports/${rapport.id}`)
  } catch (e) {
    const filtres = { type: props.type, promotion: props.promotionId }
    if (props.apprenantId) filtres.apprenant = props.apprenantId
    const enCours = e.response?.status === 400
      ? (await getRapports(tenantId, filtres).catch(() => [])).find((r) => r.statut === 'EN_COURS')
      : null
    if (enCours) router.push(`/rapports/${enCours.id}`)
    else emit('erreur', e.response?.data?.detail ?? 'Impossible de demander le rapport.')
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <AppButton :variant="variant" icon="fa-solid fa-file-lines" :loading="envoi" @click="demander">
    {{ libelle || (type === 'PROMOTION' ? 'Rapport de promotion' : 'Bilan individuel') }}
  </AppButton>
</template>
