<script>
import Vue from 'vue'
import { QBtn, QIcon } from 'quasar'
import L from 'src/lib/leaflet'

import LatLngPopup from './LatLngPopup'
import ResultPanelMixin from './ResultPanelMixin'
import CoordinatesRef from 'src/lib/refs/coordinates'

function coordsRegex () {
  return /^([\w.,]+),? ([\w.,]+)$/g
}

export function toCoords (coords) {
  coords = coordsRegex().exec(coords)
  if (!coords) {
    return null
  }

  const lat = parseFloat(coords[1])
  const lng = parseFloat(coords[2])
  if (isNaN(lat) || isNaN(lng)) {
    return null
  }

  return [lat, lng]
}

export default {
  mixins: [ResultPanelMixin],
  components: {
    QBtn,
    QIcon
  },
  data () {
    return {
      coords: null,
      error: null
    }
  },
  destroyed () {
    if (this.coords) {
      this.coords.remove()
    }
  },
  computed: {
    canPin () {
      return !!this.coords
    },
    coordinates () {
      return this.result && this.result.coords
    },
    latlng () {
      return this.coords && this.coords.getLatLng()
    },
    description () {
      return this.error
    },
    geom () {
      return this.coords
    },
    title () {
      return this.$t('names.coords')
    }
  },
  mounted () {
    this.applyParameters(this.$route.params)
  },
  methods: {
    applyParameters (params) {
      if (params.coords !== this.query) {
        this.$store.commit('search/result', {
          origin: 'coordinates',
          ...params
        })
      }
      this.$nextTick(() => this.applyResult())
    },
    applyResult () {
      if (this.result.epsg !== '4326') {
        this.error = 'Invalid EPSG'
        return
      }

      const coords = toCoords(this.result.coords)
      if (!coords) {
        this.error = 'Invalid coordinates'
        return
      }

      if (this.coords) {
        this.coords.remove()
      }

      // TODO coordinates may be invalid or swapped
      this.coords = L.marker(coords)

      this.resultsLayer.addLayer(this.coords)

      const PopupContent = Vue.extend(LatLngPopup)
      const popup = new PopupContent({
        parent: this,
        propsData: {
          latlng: this.coords.getLatLng()
        }
      })
      this.coords.bindPopup(popup.$mount().$el)
      this.coords.openPopup()
    },
    pin () {
      this.resultsLayer.removeLayer(this.coords)
      this.$store.dispatch('map/addOverlay', {
        id: new CoordinatesRef(this.coords),
        layer: this.coords,
        name: this.coordinates
      })
      this.coords.openPopup()
      this.coords = null
    }
  }
}
</script>
