<script setup>
/**
 * CreerGroupeModal — création d'un groupe par un formateur.
 *
 * Props :
 *   - ouvert       : affiche la fenêtre
 *   - tenantId     : organisme courant
 *   - promotions   : promotions ouvertes proposées ([{ id, nom }])
 *   - promotionId  : promotion imposée (création depuis la fiche promo) ;
 *                    le choix de promotion est alors masqué
 * Émet :
 *   - close
 *   - created (groupe créé)
 */
import { ref, reactive, computed, watch } from 'vue'
import AppButton from '../ui/AppButton.vue'
import FormField from '../ui/FormField.vue'
import TextInput from '../ui/TextInput.vue'
import AppSelect from '../ui/AppSelect.vue'
import InfoBanner from '../ui/InfoBanner.vue'
import { creerGroupe } from '../../services/pedagogie'

const props = defineProps({
  ouvert:      { type: Boolean, default: false },
  tenantId:    { type: [Number, String], required: true },
  promotions:  { type: Array, default: () => [] },
  promotionId: { type: [Number, String], default: null },
})

const emit = defineEmits(['close', 'created'])

const loading       = ref(false)
const error         = ref('')
const erreursChamps = ref({})
const form = reactive({ promotion: '', nom: '', description: '' })

const promotionOptions = computed(() =>
  props.promotions.map((p) => ({ value: String(p.id), label: p.nom }))
)

// Réinitialise le formulaire à chaque ouverture
watch(
  () => props.ouvert,
  (ouvert) => {
    if (!ouvert) return
    Object.assign(form, {
      promotion: props.promotionId
        ? String(props.promotionId)
        : (promotionOptions.value[0]?.value ?? ''),
      nom: '',
      description: '',
    })
    error.value = ''
    erreursChamps.value = {}
  }
)

const fermer = () => {
  if (!loading.value) emit('close')
}

const premier = (v) => (Array.isArray(v) ? v[0] : v)

const handleCreer = async () => {
  erreursChamps.value = {}
  if (!form.promotion) erreursChamps.value.promotion = 'Choisissez une promotion.'
  if (!form.nom.trim()) erreursChamps.value.nom = 'Le nom est obligatoire.'
  if (Object.keys(erreursChamps.value).length) return

  loading.value = true
  error.value   = ''
  try {
    const groupe = await creerGroupe(props.tenantId, {
      promotion: parseInt(form.promotion),
      nom: form.nom.trim(),
      description: form.description.trim(),
    })
    emit('created', groupe)
  } catch (e) {
    const data = e.response?.data
    if (data?.detail) {
      error.value = data.detail
    } else if (data && typeof data === 'object') {
      erreursChamps.value = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, premier(v)])
      )
    } else {
      error.value = 'Erreur lors de la création du groupe.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="ouvert"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      @click.self="fermer"
    >
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Nouveau groupe</h2>
          <button
            type="button"
            @click="fermer"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-slate-100"
            aria-label="Fermer"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <form class="flex flex-col gap-4 px-6 py-5" @submit.prevent="handleCreer">
          <InfoBanner v-if="error" variant="error" :message="error" />
          <FormField v-if="!promotionId" label="Promotion" required :error="erreursChamps.promotion">
            <AppSelect
              v-model="form.promotion"
              :options="promotionOptions"
              placeholder="Sélectionner une promotion…"
              :disabled="loading"
            />
          </FormField>
          <FormField label="Nom" required :error="erreursChamps.nom">
            <TextInput v-model="form.nom" placeholder="Ex. : Équipe A" :disabled="loading" />
          </FormField>
          <FormField label="Description" :error="erreursChamps.description">
            <TextInput v-model="form.description" type="textarea" :rows="3" :disabled="loading" />
          </FormField>
          <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <AppButton variant="secondary" :disabled="loading" @click="fermer">Annuler</AppButton>
            <AppButton type="submit" :loading="loading">Créer le groupe</AppButton>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
