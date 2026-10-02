<script setup>
/**
 * SupportRevisionPage — relecture d'un quiz ou d'une fiche (formateur, admin).
 *
 * Le créateur corrige un brouillon (questions, options, bonnes réponses,
 * explications ; ou contenu de la fiche), enregistre, puis publie.
 * Publié, ou pour les autres : lecture seule.
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/layouts/AppLayout.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import AppButton from '../../components/ui/AppButton.vue'
import InfoBanner from '../../components/ui/InfoBanner.vue'
import FicheRevision from '../../components/revision/FicheRevision.vue'
import { useAuthStore } from '../../stores/auth'
import { getSupport, modifierSupport, publierSupport } from '../../services/revision'
import { NB_QUESTIONS_MAX, STATUTS, libelleDifficulte, messageErreur } from '../../utils/revision'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const tenantId = authStore.tenantCourant?.id

const support = ref(null)
const chargement = ref(true)
const erreur = ref('')
const succes = ref('')
const enregistrement = ref(false)
const modifie = ref(false)

// Copies modifiables
const titre = ref('')
const questions = ref([])
const fiche = ref(null) // { titre, resume, sections: [{ titre, points (texte, une ligne par point) }], a_retenir (texte) }

const editable = computed(() => support.value?.est_proprietaire && support.value?.statut === 'BROUILLON')
const estQuiz = computed(() => support.value?.type === 'QUIZ')

const preparer = (s) => {
  support.value = s
  titre.value = s.titre
  questions.value = s.questions.map((q) => ({
    intitule: q.intitule,
    type: q.type,
    explication: q.explication,
    options: q.options.map((o) => ({ texte: o.texte, est_correcte: o.est_correcte })),
  }))
  fiche.value = s.contenu && {
    titre: s.contenu.titre,
    resume: s.contenu.resume,
    sections: s.contenu.sections.map((x) => ({ titre: x.titre, points: x.points.join('\n') })),
    a_retenir: s.contenu.a_retenir.join('\n'),
  }
  modifie.value = false
}

onMounted(async () => {
  try {
    preparer(await getSupport(tenantId, route.params.id))
  } catch {
    erreur.value = 'Support introuvable.'
  } finally {
    chargement.value = false
  }
})

const lignes = (texte) => texte.split('\n').map((l) => l.trim()).filter(Boolean)

// Aperçu de la fiche à partir des champs en cours d'édition
const ficheApercu = computed(() => fiche.value && {
  resume: fiche.value.resume,
  sections: fiche.value.sections.map((x) => ({ titre: x.titre, points: lignes(x.points) })),
  a_retenir: lignes(fiche.value.a_retenir),
})

// ─── Édition du quiz ──────────────────────────────────────────────────────────
const marquer = () => {
  modifie.value = true
  succes.value = ''
}

const ajouterQuestion = () => {
  questions.value.push({
    intitule: '', type: 'CHOIX_UNIQUE', explication: '',
    options: [{ texte: '', est_correcte: true }, { texte: '', est_correcte: false }],
  })
  marquer()
}

const supprimerQuestion = (i) => {
  questions.value.splice(i, 1)
  marquer()
}

const ajouterOption = (q) => {
  q.options.push({ texte: '', est_correcte: false })
  marquer()
}

const supprimerOption = (q, j) => {
  q.options.splice(j, 1)
  marquer()
}

// Choix unique : cocher une option décoche les autres
const basculerCorrecte = (q, j) => {
  if (q.type === 'CHOIX_UNIQUE') q.options.forEach((o, k) => (o.est_correcte = k === j))
  else q.options[j].est_correcte = !q.options[j].est_correcte
  marquer()
}

const changerType = (q, type) => {
  q.type = type
  if (type === 'CHOIX_UNIQUE') {
    const premiere = q.options.findIndex((o) => o.est_correcte)
    q.options.forEach((o, k) => (o.est_correcte = k === Math.max(premiere, 0)))
  }
  marquer()
}

const ajouterSection = () => {
  fiche.value.sections.push({ titre: '', points: '' })
  marquer()
}

const supprimerSection = (i) => {
  fiche.value.sections.splice(i, 1)
  marquer()
}

// ─── Enregistrement et publication ────────────────────────────────────────────
const verifier = () => {
  if (estQuiz.value) {
    if (!titre.value.trim()) return 'Le titre est obligatoire.'
    if (!questions.value.length) return 'Le quiz doit avoir au moins une question.'
    for (const [i, q] of questions.value.entries()) {
      const n = i + 1
      if (!q.intitule.trim()) return `Question ${n} : l'intitulé est vide.`
      if (q.options.length < 2) return `Question ${n} : il faut au moins deux options.`
      if (q.options.some((o) => !o.texte.trim())) return `Question ${n} : une option est vide.`
      if (!q.options.some((o) => o.est_correcte)) return `Question ${n} : cochez au moins une bonne réponse.`
    }
    return ''
  }
  const f = fiche.value
  if (!f.titre.trim() || !f.resume.trim()) return 'Le titre et le résumé sont obligatoires.'
  if (!f.sections.length || f.sections.some((x) => !x.titre.trim() || !lignes(x.points).length)) {
    return 'Chaque section a un titre et au moins un point.'
  }
  if (!lignes(f.a_retenir).length) return 'Ajoutez au moins un point « À retenir ».'
  return ''
}

const enregistrer = async () => {
  erreur.value = verifier()
  if (erreur.value) return false

  const payload = estQuiz.value
    ? {
        titre: titre.value.trim(),
        questions: questions.value.map((q) => ({
          intitule: q.intitule.trim(),
          type: q.type,
          explication: q.explication?.trim() ?? '',
          options: q.options.map((o) => ({ texte: o.texte.trim(), est_correcte: o.est_correcte })),
        })),
      }
    : {
        contenu: {
          titre: fiche.value.titre.trim(),
          resume: fiche.value.resume.trim(),
          sections: fiche.value.sections.map((x) => ({ titre: x.titre.trim(), points: lignes(x.points) })),
          a_retenir: lignes(fiche.value.a_retenir),
        },
      }

  enregistrement.value = true
  try {
    preparer(await modifierSupport(tenantId, support.value.id, payload))
    succes.value = 'Modifications enregistrées.'
    return true
  } catch (e) {
    erreur.value = messageErreur(e, 'L\'enregistrement a échoué.')
    return false
  } finally {
    enregistrement.value = false
  }
}

const publier = async () => {
  if (modifie.value && !(await enregistrer())) return
  enregistrement.value = true
  erreur.value = ''
  try {
    preparer(await publierSupport(tenantId, support.value.id))
    succes.value = 'Publié : les apprenants ayant déposé sur ce module y ont maintenant accès.'
  } catch (e) {
    erreur.value = messageErreur(e, 'La publication a échoué.')
  } finally {
    enregistrement.value = false
  }
}

const champ = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-['Plus_Jakarta_Sans'] text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-4xl p-6 lg:p-8">
      <button
        type="button" class="mb-4 inline-flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-sm text-zinc-500 hover:text-indigo-600"
        @click="router.push({ path: '/revision', query: support ? { module: support.module } : {} })"
      >
        <i class="fa-solid fa-arrow-left"></i> Révision
      </button>

      <p v-if="chargement" class="font-['Plus_Jakarta_Sans'] text-sm text-zinc-400">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i>Chargement…
      </p>
      <InfoBanner v-else-if="!support" variant="error" :message="erreur" />

      <template v-else>
        <PageHeader
          :titre="support.titre || (estQuiz ? 'Quiz' : 'Fiche de révision')"
          :description="`${support.module_nom} · ${estQuiz ? `Quiz ${libelleDifficulte(support.difficulte).toLowerCase()}` : 'Fiche de révision'} · ${support.cree_par_nom ?? '—'}`"
        >
          <template #actions>
            <span :class="STATUTS[support.statut].classes" class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-['Plus_Jakarta_Sans'] text-xs font-medium">
              <i :class="STATUTS[support.statut].icone"></i>{{ STATUTS[support.statut].label }}
            </span>
            <template v-if="editable">
              <AppButton variant="secondary" :disabled="!modifie" :loading="enregistrement && modifie" @click="enregistrer">Enregistrer</AppButton>
              <AppButton icon="fa-solid fa-check" :loading="enregistrement && !modifie" @click="publier">Publier</AppButton>
            </template>
          </template>
        </PageHeader>

        <InfoBanner v-if="erreur" variant="error" :message="erreur" class="mt-4" />
        <InfoBanner v-if="succes" variant="success" :message="succes" class="mt-4" />
        <InfoBanner
          v-if="editable" variant="warning" class="mt-4"
          message="Contenu généré par IA : vérifiez chaque question et chaque bonne réponse avant de publier. Une fois publié, il ne sera plus modifiable."
        />
        <InfoBanner
          v-else-if="support.statut === 'BROUILLON'" variant="info" class="mt-4"
          message="Seul le formateur qui a généré ce brouillon peut le corriger et le publier."
        />

        <!-- Sources -->
        <div class="mt-4 font-['Plus_Jakarta_Sans'] text-xs text-zinc-500">
          <span class="font-semibold text-zinc-600">Sources :</span>
          {{ [...support.sources.ressources.map((r) => r.nom), ...support.sources.fichiers_livrables.map((f) => f.nom), ...support.sources.fichiers_ajoutes].join(', ') || 'fichiers ajoutés (effacés après génération)' }}
        </div>

        <!-- ─── Quiz ─── -->
        <template v-if="estQuiz">
          <div v-if="editable" class="mt-5">
            <label class="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-500">Titre</label>
            <input v-model="titre" :class="champ" class="mt-1" maxlength="255" @input="marquer" />
          </div>

          <ol class="mt-5 flex flex-col gap-4">
            <li v-for="(q, i) in questions" :key="i" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="flex items-start gap-3">
                <span class="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-['Sora'] text-xs font-semibold text-indigo-600">{{ i + 1 }}</span>
                <div class="min-w-0 flex-1">
                  <template v-if="editable">
                    <textarea v-model="q.intitule" :class="champ" rows="2" @input="marquer"></textarea>
                    <div class="mt-2 flex gap-2">
                      <button
                        v-for="t in [{ v: 'CHOIX_UNIQUE', l: 'Choix unique' }, { v: 'CHOIX_MULTIPLE', l: 'Choix multiple' }]" :key="t.v" type="button"
                        class="rounded-lg border px-2.5 py-1 font-['Plus_Jakarta_Sans'] text-xs font-medium transition"
                        :class="q.type === t.v ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-zinc-500 hover:bg-slate-50'"
                        @click="changerType(q, t.v)"
                      >{{ t.l }}</button>
                    </div>
                  </template>
                  <template v-else>
                    <p class="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-gray-900">{{ q.intitule }}</p>
                    <p class="mt-0.5 font-['Plus_Jakarta_Sans'] text-xs text-zinc-400">{{ q.type === 'CHOIX_UNIQUE' ? 'Choix unique' : 'Choix multiple' }}</p>
                  </template>

                  <ul class="mt-3 flex flex-col gap-2">
                    <li v-for="(o, j) in q.options" :key="j" class="flex items-center gap-2">
                      <button
                        type="button" :disabled="!editable"
                        :aria-label="o.est_correcte ? 'Bonne réponse' : 'Mauvaise réponse'"
                        :title="editable ? 'Marquer comme bonne réponse' : ''"
                        class="flex h-6 w-6 shrink-0 items-center justify-center border text-xs"
                        :class="[q.type === 'CHOIX_UNIQUE' ? 'rounded-full' : 'rounded-md', o.est_correcte ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent']"
                        @click="basculerCorrecte(q, j)"
                      ><i class="fa-solid fa-check"></i></button>
                      <input v-if="editable" v-model="o.texte" :class="champ" @input="marquer" />
                      <span v-else class="font-['Plus_Jakarta_Sans'] text-sm" :class="o.est_correcte ? 'font-medium text-emerald-700' : 'text-zinc-700'">{{ o.texte }}</span>
                      <button
                        v-if="editable && q.options.length > 2" type="button" class="text-zinc-400 hover:text-red-500"
                        aria-label="Retirer l'option" @click="supprimerOption(q, j)"
                      ><i class="fa-solid fa-xmark"></i></button>
                    </li>
                  </ul>
                  <button
                    v-if="editable && q.options.length < 6" type="button"
                    class="mt-2 font-['Plus_Jakarta_Sans'] text-xs font-medium text-indigo-600 hover:underline" @click="ajouterOption(q)"
                  ><i class="fa-solid fa-plus mr-1"></i>Ajouter une option</button>

                  <div class="mt-3">
                    <template v-if="editable">
                      <label class="font-['Plus_Jakarta_Sans'] text-xs font-semibold text-zinc-500">Explication (montrée après la réponse)</label>
                      <textarea v-model="q.explication" :class="champ" class="mt-1" rows="2" @input="marquer"></textarea>
                    </template>
                    <p v-else-if="q.explication" class="rounded-xl bg-slate-50 px-3 py-2 font-['Plus_Jakarta_Sans'] text-xs text-zinc-600">
                      <i class="fa-solid fa-circle-info mr-1 text-zinc-400"></i>{{ q.explication }}
                    </p>
                  </div>
                </div>
                <button
                  v-if="editable && questions.length > 1" type="button" class="text-zinc-400 hover:text-red-500"
                  aria-label="Supprimer la question" title="Supprimer la question" @click="supprimerQuestion(i)"
                ><i class="fa-solid fa-trash text-sm"></i></button>
              </div>
            </li>
          </ol>
          <AppButton
            v-if="editable && questions.length < NB_QUESTIONS_MAX" class="mt-4" variant="secondary"
            icon="fa-solid fa-plus" @click="ajouterQuestion"
          >Ajouter une question</AppButton>
        </template>

        <!-- ─── Fiche ─── -->
        <template v-else-if="fiche">
          <div v-if="editable" class="mt-5 flex flex-col gap-4">
            <div>
              <label class="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-500">Titre</label>
              <input v-model="fiche.titre" :class="champ" class="mt-1" maxlength="255" @input="marquer" />
            </div>
            <div>
              <label class="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-500">Résumé</label>
              <textarea v-model="fiche.resume" :class="champ" class="mt-1" rows="3" @input="marquer"></textarea>
            </div>
            <div v-for="(section, i) in fiche.sections" :key="i" class="rounded-2xl border border-slate-200 bg-white p-4">
              <div class="flex items-center gap-2">
                <input v-model="section.titre" :class="champ" placeholder="Titre de la section" @input="marquer" />
                <button
                  v-if="fiche.sections.length > 1" type="button" class="text-zinc-400 hover:text-red-500"
                  aria-label="Supprimer la section" @click="supprimerSection(i)"
                ><i class="fa-solid fa-trash text-sm"></i></button>
              </div>
              <textarea v-model="section.points" :class="champ" class="mt-2" rows="4" placeholder="Un point par ligne" @input="marquer"></textarea>
            </div>
            <AppButton class="w-fit" variant="secondary" icon="fa-solid fa-plus" @click="ajouterSection">Ajouter une section</AppButton>
            <div>
              <label class="font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-500">À retenir (un point par ligne)</label>
              <textarea v-model="fiche.a_retenir" :class="champ" class="mt-1" rows="4" @input="marquer"></textarea>
            </div>
          </div>

          <div class="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p v-if="editable" class="mb-4 font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-400">Aperçu</p>
            <FicheRevision :contenu="ficheApercu" />
          </div>
        </template>
      </template>
    </div>
  </AppLayout>
</template>
