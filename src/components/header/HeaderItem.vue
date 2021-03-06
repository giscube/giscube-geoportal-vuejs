<template>
  <q-btn stack flat stretch
    v-if="!menu && supported"
    :icon="icon"
    :label="label"
    :to="to"
    @click="_onClick"
    class="gt-xs"
    :style="style"
  />
  <q-item
    v-else-if="supported"
    clickable
    v-close-popup
    :to="to"
    :style="style"
    @click="_onClick"
  >
    <q-item-section side>
      <q-icon :name="icon" />
    </q-item-section>
    <q-item-section>{{ label }}</q-item-section>
  </q-item>
</template>

<script>
import { ClosePopup, QBtn, QIcon, QItem, QItemSection } from 'quasar'

export default {
  props: {
    name: {
      type: String,
      required: true
    },
    tool: {
      type: Object,
      required: true
    },
    menu: {
      type: Boolean,
      default: false
    }
  },
  components: {
    QBtn,
    QIcon,
    QItem,
    QItemSection
  },
  directives: {
    ClosePopup
  },
  computed: {
    supported () {
      return !this.tool.supported || this.tool.supported.call(this, this.tool)
    },
    icon () {
      return this._getOrCall(this.tool.icon)
    },
    label () {
      return this.$t('tools.' + this.name + '.headerName')
    },
    to () {
      const value = this._getOrCall(this.tool.to)
      if (typeof value === 'string') {
        return { name: value }
      } else {
        return value
      }
    },
    style () {
      return {}
    }
  },
  methods: {
    emit (event, value) {
      if (typeof event === 'string' && event) {
        this.$emit('event', { name: event, value })
      } else if (typeof event === 'object' && event.name.toString()) {
        this.$emit('event', event)
      } else {
        this.$except('[HeaderItemHolder.vue] Trying to emit an incorrectly configured event. Check your config.')
      }
    },
    _onClick () {
      if (this.tool.to) {
        this.$emit('sidebar-visibility-changed', true)
      }
      if (this.tool.action) {
        this.tool.action.call(this, this.tool)
      }
      if (this.tool.emit) {
        this.emit(this._getOrCall(this.tool.emit))
      }
    },
    _getOrCall (v) {
      if (v) {
        if (typeof v === 'function') {
          return v.call(this, this.tool)
        } else {
          return v
        }
      }
    }
  }
}
</script>
