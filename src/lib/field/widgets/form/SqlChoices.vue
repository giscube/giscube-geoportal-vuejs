<template>
  <div>
    <q-field
      :readonly="readonly"
      :disable="disable"
      :label="label_"
      :stack-label="valid(current) || showDialog"
      :value="current"
      :clearable="field.null"
      :hint="hint"
      :rules="rules"
      lazy-rules
      bottom-slots
      @input="onClear"
      @focus.native="focus"
      @click.native="focus"
    >
      <template v-slot:control>
        <div class="self-center full-width no-outline" tabindex="0">{{ v }}</div>
      </template>
    </q-field>

    <q-dialog
      ref="dialog"
      v-model="showDialog"
      :maximized="!$q.screen.gt.sm"
      :full-width="$q.screen.gt.sm"
      :full-height="$q.screen.gt.sm"
    >
      <q-card>
        <q-card-section>
          <q-table
            :title="field.label"
            :data="data"
            :columns="columns"
            :row-key="field.headers[0]"
            :filter="filter"
            :pagination.sync="pagination"
            :flat="$q.screen.gt.sm"
            hide-bottom
          >
            <template v-slot:top="props">
              <div class="q-table__title">{{ field.label }}</div>
              <q-space />
              <q-input borderless dense debounce="300" v-model="filter" :placeholder="$t('actions.search') | capitalize">
                <template v-slot:before>
                  <q-icon name="search" />
                </template>
              </q-input>
              <q-space />
              <q-btn
                label="Close"
                color="primary"
                flat
                @click="$refs.dialog.hide()"
              />
            </template>
            <template v-slot:top-row="props" v-if="current">
              <tr class="sqlchoices-current">
                <td
                  v-for="col in props.cols"
                  :key="'top-' + col.name"
                  :style="{
                    'text-align': col.align
                  }"
                >{{ col.field(current) }}</td>
              </tr>
            </template>
            <template v-slot:body-cell="props">
              <q-td
                :props="props"
                class="cursor-pointer"
                @click.native="select(props.row)"
              >
                {{ props.value }}
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </q-dialog>

  </div>
</template>

<script>
import { QBtn, QCard, QCardSection, QDialog, QField, QIcon, QInput, QSpace, QTable, QTd } from 'quasar'

import MultiResult from '../../../MultiResult.js'

import ValidateMixin from '../mixins/ValidateMixin'

export default {
  props: ['value', 'field', 'readonly', 'disable', 'label'],
  mixins: [ValidateMixin],
  components: {
    QBtn,
    QCard,
    QCardSection,
    QDialog,
    QField,
    QIcon,
    QInput,
    QSpace,
    QTable,
    QTd
  },
  data () {
    return {
      showDialog: false,
      filter: '',
      pagination: { rowsPerPage: 0 }
    }
  },
  computed: {
    label_ () {
      return this.label || this.$filter('capitalize')(this.field.label)
    },
    current () {
      if (MultiResult.is(this.value)) {
        return null
      }
      return this.valid(this.value) ? this.field.valuesDict[this.value] : null
    },
    v () {
      if (MultiResult.is(this.value)) {
        return null
      }
      return this.field.str({ value: this.value })
    },
    hint () {
      if (MultiResult.is(this.value)) {
        return Array.from(this.value.values)
          .map(value => this.field.str({ value }))
          .join(', ')
      }
      return undefined
    },

    columns () {
      return this.field.tableHeaders
        .filter(({ i }) => i >= 0)
        .map(({ name, i, label }) => ({
          align: 'left',
          name,
          label,
          field: row => row[i],
          sortable: true,
          sort: this.compare
        }))
    },
    data () {
      return this.field.valuesList
    }
  },
  methods: {
    focus () {
      if (!this.readonly && !this.disabled) {
        this.$refs.dialog.show()
      }
    },
    select (row) {
      this.$emit('input', row[0])

      this.$nextTick(_ => this.$refs.dialog.hide())
    },
    onClear (v = null) {
      if (v === null) {
        this.$emit('input', null)
      }
    },
    valid (value) {
      return value !== null && value !== undefined
    },
    compare (a, b) {
      const ta = typeof a
      const tb = typeof b
      if (ta !== tb) {
        return (ta).localeCompare(tb)
      } else if (ta === 'number') {
        return a - b
      } else if (ta === 'string') {
        return (a).localeCompare(b)
      } else {
        return (a.toString()).localeCompare(b.toString())
      }
    }
  }
}
</script>

<style lang="stylus">
tr.sqlchoices-current
  background-color: $grey-5 !important // important to prevent :hover to change its style
</style>
