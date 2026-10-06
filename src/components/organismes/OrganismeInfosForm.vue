<script setup>
/**
 * OrganismeInfosForm — Admin d'organisme
 *
 * Modification des informations de l'organisme courant.
 * Le statut et le code ne sont pas modifiables ici.
 */
import { onMounted, reactive, ref } from 'vue'
import AppButton from '../ui/AppButton.vue'
import FormField from '../ui/FormField.vue'
import TextInput from '../ui/TextInput.vue'
import InfoBanner from '../ui/InfoBanner.vue'
import { useAuthStore } from '../../stores/auth'
import { modifierOrganisme, recupererOrganisme } from '../../services/tenants'
import { useFormulaire } from '../../composables/useFormulaire'
import {
  erreurEmailFacultatif,
  erreurSiteWeb,
  erreurTelephone,
  erreurTexte,
} from '../../utils/validation'

const CHAMPS = ['nom', 'description', 'email', 'telephone', 'adresse', 'site_web']

const authStore = useAuthStore()
const tenantId = authStore.tenantCourant?.id

const form = reactive(Object.fromEntries(CHAMPS.map((c) => [c, ''])))
const code = ref('')
const chargement = ref(true)
const enregistrement = ref(false)
const erreurGenerale = ref('')
const succes = ref('')

const { erreur, quitter, modifier, toutVerifier, erreursDuServeur } = useFormulaire({
  nom: () => erreurTexte(form.nom, { libelle: "Le nom de l'organisme", min: 2, max: 150 }),
  description: () => '',
  email: () => erreurEmailFacultatif(form.email),
  telephone: () => erreurTelephone(form.telephone),
  adresse: () => '',
  site_web: () => erreurSiteWeb(form.site_web),
})

const champ = (nom) => ({
  name: nom,
  'aria-invalid': !!erreur(nom),
  onBlur: () => quitter(nom),
  onInput: () => {
    succes.value = ''
    modifier(nom)
  },
})

const remplir = (organisme) => {
  for (const c of CHAMPS) form[c] = organisme[c] ?? ''
  code.value = organisme.code
}

onMounted(async () => {
  try {
    remplir(await recupererOrganisme(tenantId))
  } catch {
    erreurGenerale.value = "Impossible de charger les informations de l'organisme."
  } finally {
    chargement.value = false
  }
})

const enregistrer = async () => {
  erreurGenerale.value = ''
  succes.value = ''
  if (!toutVerifier()) return

  enregistrement.value = true
  try {
    const organisme = await modifierOrganisme(
      tenantId,
      Object.fromEntries(CHAMPS.map((c) => [c, form[c].trim()])),
    )
    remplir(organisme)
    // Le nom affiché dans l'en-tête suit la modification
    authStore.mettreAJourTenantCourant({ nom: organisme.nom })
    succes.value = 'Informations enregistrées.'
  } catch (e) {
    if (e.response?.status === 400) {
      erreurGenerale.value = erreursDuServeur(e.response.data)
    } else {
      erreurGenerale.value = e.response?.data?.detail ?? "L'enregistrement a échoué. Réessayez."
    }
  } finally {
    enregistrement.value = false
  }
}
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div class="mb-5 flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="font-['Sora'] text-sm font-semibold text-gray-900">Mon organisme</h2>
      <span v-if="code" class="font-mono text-xs text-zinc-400">{{ code }}</span>
    </div>

    <div v-if="chargement" class="flex justify-center py-10 text-zinc-400">
      <i class="fa-solid fa-circle-notch animate-spin text-xl"></i>
    </div>

    <form v-else class="flex flex-col gap-4" novalidate @submit.prevent="enregistrer">
      <InfoBanner v-if="erreurGenerale" variant="error" :message="erreurGenerale" />
      <InfoBanner v-if="succes" variant="success" :message="succes" />

      <FormField label="Nom" required :error="erreur('nom')">
        <TextInput v-model="form.nom" v-bind="champ('nom')" maxlength="150" :disabled="enregistrement" />
      </FormField>
      <FormField label="Description" :error="erreur('description')">
        <TextInput
          v-model="form.description" v-bind="champ('description')" type="textarea" :rows="3"
          placeholder="Vos formations, votre public…" :disabled="enregistrement"
        />
      </FormField>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Email de contact" :error="erreur('email')">
          <TextInput v-model="form.email" v-bind="champ('email')" type="email" :disabled="enregistrement" />
        </FormField>
        <FormField label="Téléphone" :error="erreur('telephone')">
          <TextInput v-model="form.telephone" v-bind="champ('telephone')" type="tel" maxlength="30" placeholder="+221 33 800 00 00" :disabled="enregistrement" />
        </FormField>
      </div>
      <FormField label="Adresse" :error="erreur('adresse')">
        <TextInput v-model="form.adresse" v-bind="champ('adresse')" maxlength="255" :disabled="enregistrement" />
      </FormField>
      <FormField label="Site web" :error="erreur('site_web')" hint="« https:// » est ajouté s'il manque.">
        <TextInput v-model="form.site_web" v-bind="champ('site_web')" maxlength="200" placeholder="www.organisme.sn" :disabled="enregistrement" />
      </FormField>

      <div class="flex justify-end border-t border-slate-100 pt-4">
        <AppButton type="submit" icon="fa-solid fa-floppy-disk" :loading="enregistrement">
          Enregistrer
        </AppButton>
      </div>
    </form>
  </section>
</template>
