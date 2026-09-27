<script setup>
/**
 * DataTable — tableau générique avec colonnes configurables.
 *
 * columns : [{ key, label, width? }]
 * rows    : array d'objets
 * loading : bool
 *
 * Slot par colonne : #cell-{key}="{ row }"
 * Slot état vide   : #empty
 */
defineProps({
  columns: {
    type: Array,
    required: true,
  },
  rows: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  rowKey: {
    type: String,
    default: 'id',
  },
})

defineEmits(['row-click'])
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div class="overflow-x-auto">
      <table class="w-full border-collapse">
        <!-- En-tête -->
        <thead>
          <tr class="border-b border-slate-100 bg-slate-50/60">
            <th
              v-for="col in columns"
              :key="col.key"
              :style="col.width ? `width:${col.width}` : ''"
              class="px-5 py-3 text-left font-['Plus_Jakarta_Sans'] text-xs font-semibold uppercase tracking-wide text-zinc-500"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>

        <!-- Corps -->
        <tbody>
          <!-- Chargement -->
          <tr v-if="loading">
            <td
              :colspan="columns.length"
              class="px-5 py-12 text-center"
            >
              <div class="flex flex-col items-center gap-3 text-zinc-400">
                <i class="fa-solid fa-circle-notch animate-spin text-2xl"></i>
                <span class="font-['Plus_Jakarta_Sans'] text-sm">Chargement…</span>
              </div>
            </td>
          </tr>

          <!-- Vide -->
          <tr v-else-if="rows.length === 0">
            <td
              :colspan="columns.length"
              class="px-5 py-12 text-center"
            >
              <slot name="empty">
                <div class="flex flex-col items-center gap-2 text-zinc-400">
                  <i class="fa-solid fa-inbox text-3xl"></i>
                  <span class="font-['Plus_Jakarta_Sans'] text-sm">Aucun résultat</span>
                </div>
              </slot>
            </td>
          </tr>

          <!-- Lignes -->
          <tr
            v-else
            v-for="row in rows"
            :key="row[rowKey]"
            class="group border-b border-slate-100 last:border-0 transition hover:bg-slate-50/60"
            :class="{ 'cursor-pointer': $attrs.onRowClick }"
            @click="$emit('row-click', row)"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              class="px-5 py-3.5 font-['Plus_Jakarta_Sans'] text-sm text-zinc-700"
            >
              <slot :name="`cell-${col.key}`" :row="row">
                {{ row[col.key] ?? '—' }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
