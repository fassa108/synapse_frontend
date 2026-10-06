<script setup>
/**
 * OrganismeCreationModal — Admin SaaS
 *
 * Création d'un organisme avec son premier administrateur.
 * Validation au fil de la saisie ; le prénom et le nom ne sont exigés
 * par le backend que pour un nouveau compte.
 *
 * Émet : 'fermer', 'cree' (organisme créé)
 */
import { reactive, ref } from 'vue'
import AppButton from '../ui/AppButton.vue'
import FormField from '../ui/FormField.vue'
import TextInput from '../ui/TextInput.vue'
import InfoBanner from '../ui/InfoBanner.vue'
import { creerOrganisme } from '../../services/tenants'
import { useFormulaire } from '../../composables/useFormulaire'
import {
  erreurEmail,
  erreurEmailFacultatif,
  erreurSiteWeb,
  erreurTelephone,
  erreurTexte,
} from '../../utils/validation'

const emit = defineEmits(['fermer', 'cree'])

const form = reactive({
  nom: '',
  email: '',
  telephone: '',
  adresse: '',
  site_web: '',
  admin_email: '',
  admin_prenom: '',
  admin_nom: '',
})

const chargement = ref(false)
const erreurGenerale = ref('')

const { erreur, quitter, modifier, toutVerifier, erreursDuServeur } = useFormulaire({
  nom: () => erreurTexte(form.nom, { libelle: "Le nom de l'organisme", min: 2, max: 150 }),
  email: () => erreurEmailFacultatif(form.email),
  telephone: () => erreurTelephone(form.telephone),
  adresse: () => '',
  site_web: () => erreurSiteWeb(form.site_web),
  admin_email: () => erreurEmail(form.admin_email),
  admin_prenom: () => '',
  admin_nom: () => '',
})

// Attributs communs d'un champ : nom (focus sur erreur), suivi de la saisie, état d'erreur
const champ = (nom) => ({
  name: nom,
  'aria-invalid': !!erreur(nom),
  onBlur: () => quitter(nom),
  onInput: () => modifier(nom),
})

const fermer = () => {
  if (!chargement.value) emit('fermer')
}

const creer = async () => {
  erreurGenerale.value = ''
  if (!toutVerifier()) return

  chargement.value = true
  try {
    // Les champs vides ne sont pas envoyés
    const payload = Object.fromEntries(
      Object.entries(form)
        .map(([k, v]) => [k, v.trim()])
        .filter(([, v]) => v !== '')
    )
    emit('cree', await creerOrganisme(payload))
  } catch (e) {
    const data = e.response?.data
    if (e.response?.status === 400) {
      erreurGenerale.value = erreursDuServeur(data)
    } else {
      erreurGenerale.value = data?.detail ?? 'Une erreur est survenue lors de la création.'
    }
  } finally {
    chargement.value = false
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    @click.self="fermer"
  >
    <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">

      <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div>
          <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
            Nouvel organisme
          </h2>
          <p class="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
            L'administrateur recevra un email pour activer son compte.
          </p>
        </div>
        <button
          type="button"
          @click="fermer"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-slate-100"
          aria-label="Fermer"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <form class="flex flex-col gap-5 px-6 py-5" novalidate @submit.prevent="creer">

        <InfoBanner v-if="erreurGenerale" variant="error" :message="erreurGenerale" />

        <div class="flex flex-col gap-4">
          <h3 class="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Organisme
          </h3>
          <FormField label="Nom" required :error="erreur('nom')">
            <TextInput v-model="form.nom" v-bind="champ('nom')" maxlength="150" placeholder="Ex. : Simplon Dakar" :disabled="chargement" />
          </FormField>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Email de contact" :error="erreur('email')">
              <TextInput v-model="form.email" v-bind="champ('email')" type="email" :disabled="chargement" />
            </FormField>
            <FormField label="Téléphone" :error="erreur('telephone')">
              <TextInput v-model="form.telephone" v-bind="champ('telephone')" type="tel" maxlength="30" placeholder="+221 33 800 00 00" :disabled="chargement" />
            </FormField>
          </div>
          <FormField label="Adresse" :error="erreur('adresse')">
            <TextInput v-model="form.adresse" v-bind="champ('adresse')" maxlength="255" :disabled="chargement" />
          </FormField>
          <FormField label="Site web" :error="erreur('site_web')" hint="« https:// » est ajouté s'il manque.">
            <TextInput v-model="form.site_web" v-bind="champ('site_web')" maxlength="200" placeholder="www.organisme.sn" :disabled="chargement" />
          </FormField>
        </div>

        <div class="flex flex-col gap-4 border-t border-slate-100 pt-5">
          <h3 class="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Premier administrateur
          </h3>
          <FormField
            label="Email"
            required
            :error="erreur('admin_email')"
            hint="Si un compte existe déjà avec cet email, il devient administrateur de l'organisme."
          >
            <TextInput v-model="form.admin_email" v-bind="champ('admin_email')" type="email" :disabled="chargement" />
          </FormField>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Prénom" :error="erreur('admin_prenom')">
              <TextInput v-model="form.admin_prenom" v-bind="champ('admin_prenom')" maxlength="100" :disabled="chargement" />
            </FormField>
            <FormField label="Nom" :error="erreur('admin_nom')">
              <TextInput v-model="form.admin_nom" v-bind="champ('admin_nom')" maxlength="100" :disabled="chargement" />
            </FormField>
          </div>
          <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
            Prénom et nom sont obligatoires pour un nouveau compte.
          </p>
        </div>

        <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <AppButton variant="secondary" :disabled="chargement" @click="fermer">
            Annuler
          </AppButton>
          <AppButton type="submit" :loading="chargement">
            Créer l'organisme
          </AppButton>
        </div>
      </form>
    </div>
  </div>
</template>
