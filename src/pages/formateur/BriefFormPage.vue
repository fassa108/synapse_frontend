<script setup>
/**
 * BriefFormPage — Formateur : création (/briefs/creer) et modification
 * (/briefs/:id/modifier) d'un brief.
 *
 * Création en deux étapes, sans rien enregistrer entre les deux :
 *   1. Informations (promotion, module, catégorie, titre, description, dates)
 *   2. Contenu (sections, compétences visées, ressources) → « Terminer »
 *      enregistre le brief en brouillon et ouvre sa fiche.
 * Modification : tout sur une seule page.
 *
 * - Promotion : parmi ses promotions ouvertes (non modifiable ensuite).
 * - Module principal obligatoire.
 * - Compétences visées : CompetenceNiveau (compétence + niveau) de tous les
 *   modules de la formation, celles du module principal en premier.
 * - Ressources : choisies dans la bibliothèque de l'organisme.
 * Un brief qui a déjà des livrables n'est plus modifiable.
 */
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import FormField from '../../components/ui/FormField.vue'
import TextInput from '../../components/ui/TextInput.vue'
import AppSelect from '../../components/ui/AppSelect.vue'
import SearchInput from '../../components/ui/SearchInput.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import EditeurTexteRiche from '../../components/texte-riche/EditeurTexteRiche.vue'
import { SECTIONS_BRIEF } from '../../utils/brief'
import { useAuthStore } from '../../stores/auth'
import { getBrief, getBriefs, creerBrief, modifierBrief, getRessources, getCategories } from '../../services/activites'
import {
  getPromotions,
  getModules,
  getCompetences,
  getCompetenceNiveaux,
  getNiveaux,
} from '../../services/pedagogie'

const route     = useRoute()
const router    = useRouter()
const authStore = useAuthStore()
const tenantId  = authStore.tenantCourant?.id
const briefId   = route.params.id ?? null
const edition   = computed(() => briefId !== null)

const promotions        = ref([])
const modules           = ref([])
const competences       = ref([])
const competenceNiveaux = ref([])
const briefsPromotion   = ref([]) // autres briefs de la promotion (compétences déjà visées)
const niveaux           = ref([])
const ressources        = ref([])
const categories        = ref([])
const loading           = ref(true)
const error             = ref('')
const nonModifiable     = ref(false)

const form = reactive({
  promotion: '',
  module: '',
  categorie: '',
  titre: '',
  description: '',
  contexte: '',
  modalites_pedagogiques: '',
  modalites_evaluation: '',
  criteres_performance: '',
  livrables_attendus: '',
  date_debut: '',
  date_limite: '',
  competence_niveaux: [],
  ressources: [],
})
const erreurs      = ref({})
const globalError  = ref('')
const envoi        = ref(false)
const etape        = ref(1) // création uniquement

// Champs de l'étape 1 (pour y revenir si le serveur y signale une erreur)
const CHAMPS_ETAPE_1 = ['promotion', 'module', 'categorie', 'titre', 'description', 'date_debut', 'date_limite']
const afficherEtape = (n) => edition.value || etape.value === n
const rechercheRessource = ref('')

// ISO ↔ valeur d'un <input type="datetime-local">
const versLocal = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const versIso = (local) => (local ? new Date(local).toISOString() : null)

onMounted(async () => {
  try {
    const [proms, comps, cns, nivs, ress, cats] = await Promise.all([
      getPromotions(tenantId),
      getCompetences(tenantId),
      getCompetenceNiveaux(tenantId),
      getNiveaux(tenantId),
      getRessources(tenantId),
      getCategories(tenantId),
    ])
    categories.value        = cats
    competences.value       = comps
    competenceNiveaux.value = cns
    niveaux.value           = nivs
    ressources.value        = ress

    if (edition.value) {
      const brief = await getBrief(tenantId, briefId)
      if (!brief.modifiable) nonModifiable.value = true
      promotions.value = proms.filter((p) => p.id === brief.promotion)
      Object.assign(form, {
        promotion: String(brief.promotion),
        module: String(brief.module),
        categorie: brief.categorie ? String(brief.categorie) : '',
        titre: brief.titre,
        description: brief.description,
        ...Object.fromEntries(SECTIONS_BRIEF.map((s) => [s.cle, brief[s.cle] ?? ''])),
        date_debut: versLocal(brief.date_debut),
        date_limite: versLocal(brief.date_limite),
        competence_niveaux: [...brief.competence_niveaux],
        ressources: [...brief.ressources],
      })
      await chargerModules()
    } else {
      // Création : uniquement dans une promotion ouverte
      promotions.value = proms.filter((p) => p.actif)
      if (promotions.value.length === 1) form.promotion = String(promotions.value[0].id)
    }
  } catch {
    error.value = 'Impossible de charger le formulaire.'
  } finally {
    loading.value = false
  }
})

const promotionChoisie = computed(() =>
  promotions.value.find((p) => String(p.id) === form.promotion) ?? null
)

const chargerModules = async () => {
  const p = promotionChoisie.value
  const [mods, briefs] = p
    ? await Promise.all([getModules(tenantId, { formation: p.formation }), getBriefs(tenantId, { promotion: p.id })])
    : [[], []]
  modules.value = mods
  briefsPromotion.value = briefs.filter((b) => String(b.id) !== String(briefId))
}

// Une compétence-niveau n'est visée que par un seul brief de la promotion
const briefQuiVise = computed(() => {
  const m = new Map()
  for (const b of briefsPromotion.value) for (const id of b.competence_niveaux) m.set(id, b.titre)
  return m
})

// Changement de promotion (création) : on repart de zéro sur le référentiel
watch(() => form.promotion, async (nouvelle, ancienne) => {
  if (edition.value || nouvelle === ancienne) return
  form.module = ''
  form.competence_niveaux = []
  await chargerModules()
})

const promotionOptions = computed(() =>
  promotions.value.map((p) => ({ value: String(p.id), label: p.nom }))
)
// Catégories actives (+ celle déjà en place sur un brief modifié)
const categorieOptions = computed(() =>
  categories.value
    .filter((c) => c.actif || String(c.id) === form.categorie)
    .map((c) => ({ value: String(c.id), label: c.nom }))
)
const moduleOptions = computed(() =>
  modules.value.filter((m) => m.actif || String(m.id) === form.module)
    .map((m) => ({ value: String(m.id), label: `${m.ordre}. ${m.nom}` }))
)

// Compétences visées regroupées par module, module principal en premier
const nomNiveau = (id) => niveaux.value.find((n) => n.id === id)?.nom ?? `Niveau ${id}`
const ordreNiveau = (id) => niveaux.value.find((n) => n.id === id)?.ordre ?? 0

const groupes = computed(() => {
  const ordonnes = [...modules.value].sort((a, b) => {
    if (String(a.id) === form.module) return -1
    if (String(b.id) === form.module) return 1
    return a.ordre - b.ordre
  })
  return ordonnes
    .map((m) => ({
      module: m,
      competences: competences.value
        .filter((c) => c.module === m.id)
        .map((c) => ({
          competence: c,
          niveaux: competenceNiveaux.value
            .filter((cn) => cn.competence === c.id)
            .sort((a, b) => ordreNiveau(a.niveau) - ordreNiveau(b.niveau)),
        }))
        .filter((c) => c.niveaux.length > 0),
    }))
    .filter((g) => g.competences.length > 0)
})

const basculerCn = (id) => {
  const i = form.competence_niveaux.indexOf(id)
  if (i === -1) form.competence_niveaux.push(id)
  else form.competence_niveaux.splice(i, 1)
}

const ressourcesFiltrees = computed(() => {
  const q = rechercheRessource.value.trim().toLowerCase()
  return q ? ressources.value.filter((r) => r.titre.toLowerCase().includes(q)) : ressources.value
})

const premier = (v) => (Array.isArray(v) ? v[0] : v)

const erreursEtape1 = () => {
  const e = {}
  if (!form.promotion) e.promotion = 'Choisissez une promotion.'
  if (!form.module) e.module = 'Le module est obligatoire.'
  if (!form.titre.trim()) e.titre = 'Le titre est obligatoire.'
  if (!form.description.trim()) e.description = 'La description est obligatoire.'
  if (!form.date_debut) e.date_debut = 'La date de début est obligatoire.'
  if (!form.date_limite) e.date_limite = 'La date limite est obligatoire.'
  if (form.date_debut && form.date_limite && form.date_limite < form.date_debut) {
    e.date_limite = 'La date limite doit être après la date de début.'
  }
  return e
}

const erreursEtape2 = () => {
  const e = {}
  SECTIONS_BRIEF.filter((s) => s.obligatoire && !form[s.cle]).forEach((s) => {
    e[s.cle] = `${s.titre} : ce champ est obligatoire.`
  })
  return e
}

// Création : « Suivant » vérifie l'étape 1 sans rien enregistrer
const suivant = () => {
  erreurs.value = erreursEtape1()
  if (Object.keys(erreurs.value).length) return
  globalError.value = ''
  etape.value = 2
  window.scrollTo({ top: 0 })
}

const precedent = () => {
  etape.value = 1
  window.scrollTo({ top: 0 })
}

const enregistrer = async () => {
  erreurs.value = { ...erreursEtape1(), ...erreursEtape2() }
  if (Object.keys(erreurs.value).length) {
    if (!edition.value && CHAMPS_ETAPE_1.some((c) => erreurs.value[c])) etape.value = 1
    return
  }
  envoi.value = true
  globalError.value = ''

  const payload = {
    module: parseInt(form.module),
    categorie: form.categorie ? parseInt(form.categorie) : null,
    titre: form.titre.trim(),
    description: form.description.trim(),
    ...Object.fromEntries(SECTIONS_BRIEF.map((s) => [s.cle, form[s.cle]])),
    date_debut: versIso(form.date_debut),
    date_limite: versIso(form.date_limite),
    competence_niveaux: form.competence_niveaux,
    ressources: form.ressources,
  }

  try {
    let brief
    if (edition.value) {
      brief = await modifierBrief(tenantId, briefId, payload)
    } else {
      // « Terminer » : enregistré en brouillon, publié ensuite depuis la fiche
      brief = await creerBrief(tenantId, { ...payload, promotion: parseInt(form.promotion), statut: 'BROUILLON' })
    }
    router.push(`/briefs/${brief.id}`)
  } catch (err) {
    const data = err.response?.data
    if (typeof data === 'object' && data && !Array.isArray(data) && !data.detail) {
      erreurs.value = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, premier(v)]))
      globalError.value = premier(data.non_field_errors) || 'Veuillez corriger les champs indiqués.'
      if (!edition.value && CHAMPS_ETAPE_1.some((c) => erreurs.value[c])) etape.value = 1
    } else {
      globalError.value = data?.detail || premier(data) || "Impossible d'enregistrer le brief."
    }
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">

      <PageHeader :titre="edition ? 'Modifier le brief' : 'Nouveau brief'">
        <template #actions>
          <!-- Création, étape « Contenu » : retour aux informations (saisies conservées) -->
          <AppButton
            v-if="!edition && etape === 2"
            variant="secondary"
            icon="fa-solid fa-arrow-left"
            :disabled="envoi"
            @click="precedent"
          >
            Retour aux informations
          </AppButton>
          <AppButton v-else variant="secondary" icon="fa-solid fa-arrow-left" @click="router.back()">Retour</AppButton>
        </template>
      </PageHeader>

      <div v-if="loading" class="flex h-64 items-center justify-center text-zinc-400">
        <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
      </div>

      <InfoBanner v-else-if="error" variant="error" :message="error" class="mt-6" />

      <InfoBanner
        v-else-if="nonModifiable"
        variant="info"
        message="Ce brief a déjà des livrables : il n'est plus modifiable (seul son statut peut encore changer, depuis sa fiche)."
        class="mt-6"
      />

      <InfoBanner
        v-else-if="!edition && promotions.length === 0 && !loading"
        variant="info"
        message="Vous n'êtes affecté à aucune promotion ouverte : impossible de créer un brief."
        class="mt-6"
      />

      <!-- Étapes (création) -->
      <ol v-if="!loading && !error && !nonModifiable && !edition && promotions.length" class="mt-6 flex items-center gap-3 font-['Plus_Jakarta_Sans'] text-sm">
        <li v-for="(nom, i) in ['Informations', 'Contenu']" :key="nom" class="flex items-center gap-3">
          <span v-if="i > 0" class="h-px w-10 bg-slate-300"></span>
          <span
            class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
            :class="etape > i + 1 ? 'bg-emerald-500 text-white' : etape === i + 1 ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-zinc-500'"
          >
            <i v-if="etape > i + 1" class="fa-solid fa-check"></i>
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span :class="etape === i + 1 ? 'font-semibold text-gray-900' : 'text-zinc-500'">{{ nom }}</span>
        </li>
      </ol>

      <form v-if="!loading && !error && !nonModifiable && (edition || promotions.length)" class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3" @submit.prevent="edition || etape === 2 ? enregistrer() : suivant()">

        <!-- Colonne principale -->
        <div class="flex flex-col gap-6 lg:col-span-2">
          <InfoBanner v-if="globalError" variant="error" :message="globalError" />

          <div v-if="afficherEtape(1)" class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Promotion" required :error="erreurs.promotion">
                <AppSelect v-model="form.promotion" :options="promotionOptions" placeholder="Choisir…" :disabled="edition || envoi" />
              </FormField>
              <FormField label="Module principal" required :error="erreurs.module">
                <AppSelect v-model="form.module" :options="moduleOptions" placeholder="Choisir…" :disabled="!form.promotion || envoi" />
              </FormField>
            </div>
            <FormField label="Catégorie" :error="erreurs.categorie" hint="Facultatif — pour classer (brief projet, TP, atelier, veille…).">
              <AppSelect v-model="form.categorie" :options="categorieOptions" placeholder-selectable
                         :placeholder="categorieOptions.length ? 'Aucune' : 'Aucune catégorie définie par l’organisme'" :disabled="envoi" />
            </FormField>
            <FormField label="Titre" required :error="erreurs.titre">
              <TextInput v-model="form.titre" placeholder="Ex. : Site vitrine d'une boulangerie" :disabled="envoi" />
            </FormField>
            <FormField label="Description" required :error="erreurs.description" hint="Résumé court, affiché dans les listes.">
              <TextInput v-model="form.description" type="textarea" :rows="2" :disabled="envoi" />
            </FormField>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Date de début" required :error="erreurs.date_debut" hint="Les dépôts sont possibles à partir de cette date.">
                <TextInput v-model="form.date_debut" type="datetime-local" :disabled="envoi" />
              </FormField>
              <FormField label="Date limite" required :error="erreurs.date_limite" hint="Un dépôt après cette date est accepté mais marqué en retard.">
                <TextInput v-model="form.date_limite" type="datetime-local" :disabled="envoi" />
              </FormField>
            </div>
          </div>

          <!-- Contenu du brief (texte riche) -->
          <div v-if="afficherEtape(2)" class="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Contenu du brief</h2>
            <FormField
              v-for="s in SECTIONS_BRIEF"
              :key="s.cle"
              :label="s.titre"
              :required="s.obligatoire"
              :error="erreurs[s.cle]"
            >
              <EditeurTexteRiche v-model="form[s.cle]" :disabled="envoi" :invalide="!!erreurs[s.cle]" />
            </FormField>
          </div>

          <!-- Compétences visées -->
          <div v-if="afficherEtape(2)" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="mb-1 flex items-baseline justify-between">
              <h2 class="font-['Sora'] text-base font-semibold text-gray-900">Compétences visées</h2>
              <span class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                {{ form.competence_niveaux.length }} sélectionnée{{ form.competence_niveaux.length > 1 ? 's' : '' }}
              </span>
            </div>
            <p class="mb-4 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
              Choisissez, pour chaque compétence travaillée, le niveau visé.
              Les compétences du module principal sont proposées en premier. Une compétence
              déjà visée par un autre brief de la promotion ne peut pas l'être à nouveau.
            </p>
            <InfoBanner v-if="erreurs.competence_niveaux" variant="error" :message="erreurs.competence_niveaux" class="mb-3" />

            <p v-if="!form.promotion" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">Choisissez d'abord une promotion.</p>
            <p v-else-if="groupes.length === 0" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
              Aucune compétence décrite par niveau dans cette formation.
            </p>

            <div v-for="g in groupes" :key="g.module.id" class="mb-5 last:mb-0">
              <p class="mb-2 font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide"
                 :class="String(g.module.id) === form.module ? 'text-indigo-600' : 'text-zinc-400'">
                {{ g.module.nom }}
                <span v-if="String(g.module.id) === form.module" class="normal-case tracking-normal">· module principal</span>
              </p>
              <div class="flex flex-col gap-3">
                <div v-for="c in g.competences" :key="c.competence.id" class="rounded-xl border border-slate-100 p-3">
                  <p class="font-['Plus_Jakarta_Sans'] text-sm font-medium text-gray-900">{{ c.competence.nom }}</p>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <button
                      v-for="cn in c.niveaux" :key="cn.id" type="button"
                      :title="briefQuiVise.has(cn.id) ? `Déjà visée par « ${briefQuiVise.get(cn.id)} »` : cn.description"
                      class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-['Plus_Jakarta_Sans'] text-xs font-medium transition disabled:cursor-not-allowed"
                      :class="form.competence_niveaux.includes(cn.id)
                        ? 'border-indigo-500 bg-indigo-500 text-white'
                        : briefQuiVise.has(cn.id)
                          ? 'border-dashed border-slate-200 text-zinc-300'
                          : 'border-slate-200 text-zinc-600 hover:border-indigo-300'"
                      :aria-pressed="form.competence_niveaux.includes(cn.id)"
                      :disabled="briefQuiVise.has(cn.id) && !form.competence_niveaux.includes(cn.id)"
                      @click="basculerCn(cn.id)"
                    >
                      <i v-if="form.competence_niveaux.includes(cn.id)" class="fa-solid fa-check text-[10px]"></i>
                      <i v-else-if="briefQuiVise.has(cn.id)" class="fa-solid fa-lock text-[9px]"></i>
                      {{ nomNiveau(cn.niveau) }}
                    </button>
                  </div>
                  <p
                    v-for="cn in c.niveaux.filter((x) => briefQuiVise.has(x.id) && !form.competence_niveaux.includes(x.id))"
                    :key="`v${cn.id}`"
                    class="mt-2 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400"
                  >
                    <i class="fa-solid fa-lock mr-1 text-[9px]"></i>{{ nomNiveau(cn.niveau) }} : déjà visée par « {{ briefQuiVise.get(cn.id) }} »
                  </p>
                  <p
                    v-for="cn in c.niveaux.filter((x) => form.competence_niveaux.includes(x.id) && x.description)"
                    :key="`d${cn.id}`"
                    class="mt-2 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500"
                  >
                    <span class="font-semibold text-indigo-700">{{ nomNiveau(cn.niveau) }}</span> — {{ cn.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Colonne latérale -->
        <div class="flex flex-col gap-6">
          <!-- Récapitulatif de l'étape 1 (création, étape 2) -->
          <div v-if="!edition && etape === 2" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 class="mb-2 font-['Sora'] text-sm font-semibold text-gray-900">{{ form.titre }}</h2>
            <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
              {{ promotionChoisie?.nom }} · {{ moduleOptions.find((m) => m.value === form.module)?.label }}
              <template v-if="form.categorie"> · {{ categorieOptions.find((c) => c.value === form.categorie)?.label }}</template>
            </p>
            <button type="button" class="mt-2 font-['Plus_Jakarta_Sans'] text-xs text-indigo-600 hover:underline" @click="precedent">
              Modifier les informations
            </button>
          </div>
          <div v-if="afficherEtape(2)" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 class="mb-1 font-['Sora'] text-sm font-semibold text-gray-900">Ressources</h2>
            <p class="mb-3 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
              Choisies dans la bibliothèque.
              <RouterLink to="/ressources" class="text-indigo-600 hover:underline">Gérer la bibliothèque</RouterLink>
            </p>
            <SearchInput v-if="ressources.length > 5" v-model="rechercheRessource" placeholder="Filtrer…" class="mb-3" />
            <p v-if="ressources.length === 0" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
              La bibliothèque est vide.
            </p>
            <div v-else class="flex max-h-72 flex-col divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              <label v-for="r in ressourcesFiltrees" :key="r.id" class="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50">
                <input v-model="form.ressources" type="checkbox" :value="r.id" class="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                <i :class="r.url ? 'fa-solid fa-link' : 'fa-solid fa-file-lines'" class="text-xs text-zinc-400"></i>
                <span class="truncate font-['Plus_Jakarta_Sans'] text-sm text-gray-900">{{ r.titre }}</span>
              </label>
            </div>
          </div>

          <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <template v-if="edition">
              <AppButton type="submit" :loading="envoi" :disabled="envoi">Enregistrer</AppButton>
            </template>
            <template v-else-if="etape === 1">
              <AppButton type="submit" icon="fa-solid fa-arrow-right">Suivant</AppButton>
              <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                Étape suivante : contenu, compétences visées et ressources.
              </p>
            </template>
            <template v-else>
              <AppButton type="submit" :loading="envoi" :disabled="envoi">Terminer</AppButton>
              <AppButton variant="secondary" icon="fa-solid fa-arrow-left" :disabled="envoi" @click="precedent">Retour</AppButton>
              <p class="font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">
                Le brief est enregistré en brouillon : vous le publierez depuis sa fiche.
              </p>
            </template>
          </div>
        </div>
      </form>
    </div>
  </AppLayout>
</template>
