<script setup>
/**
 * AjoutMembreModal — ajout d'un formateur ou d'un apprenant.
 *
 * - Email inconnu : le compte est créé et reçoit une invitation
 *   (prénom et nom exigés par le backend).
 * - Email connu : le compte est ajouté à l'organisme ; s'il n'a jamais
 *   été activé, il reçoit un nouveau lien.
 *
 * Props :
 *   - tenantId
 *   - role    : 'FORMATEUR' | 'APPRENANT'
 *   - libelle : 'formateur' | 'apprenant' (texte affiché)
 * Émet :
 *   - fermer
 *   - ajoute (membre créé, avec invitation_envoyee)
 */
import { reactive, ref } from 'vue'
import AppButton from '../ui/AppButton.vue'
import FormField from '../ui/FormField.vue'
import TextInput from '../ui/TextInput.vue'
import InfoBanner from '../ui/InfoBanner.vue'
import { inviterMembre } from '../../services/membres'
import { useFormulaire } from '../../composables/useFormulaire'
import { erreurEmail } from '../../utils/validation'

const props = defineProps({
  tenantId: { type: [Number, String], required: true },
  role:     { type: String, required: true },
  libelle:  { type: String, required: true },
})

const emit = defineEmits(['fermer', 'ajoute'])

const form = reactive({ prenom: '', nom: '', email: '' })
const chargement = ref(false)
const erreurGenerale = ref('')
const succes = ref('')

// Prénom et nom : seul le backend sait si le compte existe déjà.
const { erreur, quitter, modifier, toutVerifier, erreursDuServeur } = useFormulaire({
  prenom: () => '',
  nom: () => '',
  email: () => erreurEmail(form.email),
})

const champ = (nom) => ({
  name: nom,
  'aria-invalid': !!erreur(nom),
  onBlur: () => quitter(nom),
  onInput: () => modifier(nom),
})

const fermer = () => {
  if (!chargement.value) emit('fermer')
}

const ajouter = async () => {
  erreurGenerale.value = ''
  if (!toutVerifier()) return

  chargement.value = true
  try {
    const payload = Object.fromEntries(
      Object.entries({ ...form, role: props.role })
        .map(([k, v]) => [k, v.trim()])
        .filter(([, v]) => v !== '')
    )
    const membre = await inviterMembre(props.tenantId, payload)

    const nom = `${membre.utilisateur_prenom} ${membre.utilisateur_nom}`.trim() || membre.utilisateur_email
    succes.value = membre.invitation_envoyee
      ? `Invitation envoyée à ${membre.utilisateur_email}. Le lien d'activation est valable 72 heures.`
      : `${nom} fait maintenant partie de l'organisme et peut se connecter avec son compte existant.`
    emit('ajoute', membre)
  } catch (e) {
    if (e.response?.status === 400) {
      erreurGenerale.value = erreursDuServeur(e.response.data)
    } else {
      erreurGenerale.value = e.response?.data?.detail ?? "L'ajout a échoué. Réessayez."
    }
  } finally {
    chargement.value = false
  }
}

// « Ajouter un autre » : on repart d'un formulaire vierge
const recommencer = () => {
  Object.assign(form, { prenom: '', nom: '', email: '' })
  succes.value = ''
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      @click.self="fermer"
    >
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">

        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 class="font-['Sora'] text-base font-semibold text-gray-900">
            Ajouter un {{ libelle }}
          </h2>
          <button
            type="button"
            @click="fermer"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-slate-100"
            aria-label="Fermer"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="px-6 py-5">
          <!-- Succès -->
          <div v-if="succes" class="flex flex-col gap-4">
            <InfoBanner variant="success" :message="succes" />
            <div class="flex justify-end gap-3">
              <AppButton variant="secondary" icon="fa-solid fa-user-plus" @click="recommencer">
                Ajouter un autre
              </AppButton>
              <AppButton @click="emit('fermer')">Fermer</AppButton>
            </div>
          </div>

          <form v-else class="flex flex-col gap-4" novalidate @submit.prevent="ajouter">
            <InfoBanner v-if="erreurGenerale" variant="error" :message="erreurGenerale" />

            <FormField
              label="Adresse e-mail"
              required
              :error="erreur('email')"
              hint="Si ce compte existe déjà, il est simplement ajouté à l'organisme."
            >
              <TextInput v-model="form.email" v-bind="champ('email')" type="email" placeholder="awa.diop@exemple.sn" :disabled="chargement" />
            </FormField>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Prénom" :error="erreur('prenom')">
                <TextInput v-model="form.prenom" v-bind="champ('prenom')" maxlength="100" placeholder="Awa" :disabled="chargement" />
              </FormField>
              <FormField label="Nom" :error="erreur('nom')">
                <TextInput v-model="form.nom" v-bind="champ('nom')" maxlength="100" placeholder="Diop" :disabled="chargement" />
              </FormField>
            </div>
            <p class="-mt-2 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
              Prénom et nom sont obligatoires pour un nouveau compte.
            </p>

            <InfoBanner
              v-if="role === 'APPRENANT'"
              variant="info"
              message="L'inscription dans une promotion se fait depuis la page de la promotion, sans attendre l'activation du compte."
            />

            <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <AppButton type="button" variant="secondary" :disabled="chargement" @click="fermer">
                Annuler
              </AppButton>
              <AppButton type="submit" :loading="chargement">
                Ajouter
              </AppButton>
            </div>
          </form>
        </div>

      </div>
    </div>
  </Teleport>
</template>
