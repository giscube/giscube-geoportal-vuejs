import { defaultsDeep } from 'lodash'

import L from '../../lib/leaflet'
import except from '../../lib/except'
import { createExternalLayer, createLayer } from '../../lib/geomUtils'
import validate from '../../lib/validate'
import { enumerate, reverse, unique } from '../../lib/utils'

import FeaturePopup from '../../components/FeaturePopup'

import { LAYER_TEMPLATE, LAYER_TEMPLATE_DEFAULTS } from './constants'

export function setMap (context, value) {
  context.dispatch('stopDrawing')

  const sharedGroup = context.state.shared
  const overlaysGroup = context.state.layers._overlaysGroup
  const resultLayer = context.rootState.search.resultsLayer

  sharedGroup.remove()
  overlaysGroup.remove()
  resultLayer.remove()

  if (value) {
    sharedGroup.addTo(value)
    overlaysGroup.addTo(value)
    resultLayer.addTo(value)
  }

  context.commit('mapObject', value)
}

export function invalidateOffset (context) {
  const padding = context.rootGetters['layout/hiddenMap']
  context.state.mapObject.setGlobalPadding(padding)
}

export function invalidateSize (context) {
  context.state.mapObject.invalidateSize()
}

function _makeBaseLayer (baseLayer) {
  if (!baseLayer.layer) {
    let layer
    if (baseLayer.type === 'tilelayer') {
      layer = L.tileLayer(baseLayer.url, baseLayer)
    } else if (baseLayer.type === 'wms') {
      layer = L.tileLayer.wms(baseLayer.url, baseLayer)
    } else {
      console.warn(`Unsupported base layer type: ${baseLayer.type}`)
    }
    baseLayer.layer = layer
  }
  return baseLayer.layer
}

export function setBaseLayer (context, value) {
  // Remove old base layer
  const oldValue = context.state.layers.baseLayer
  if (oldValue) {
    if (oldValue.layer) {
      oldValue.layer.remove()
    }
    oldValue.layer = null
    context.commit('_baseLayer', null)
  }

  // Add new base layer
  const baseLayer = this.$config.basemaps[value]
  if (baseLayer) {
    const map = context.state.mapObject
    const layer = _makeBaseLayer(baseLayer)
    if (map && layer) {
      map.addLayer(layer)
    }
    context.commit('_baseLayer', baseLayer)
  }
}

export function setDefaultBaseLayer (context) {
  let selected = this.$router.params && this.$router.params.b
  if (selected === void 0) {
    selected = this.$config.basemaps.findIndex(basemap => basemap.selected)
  }

  if (!selected || selected < 0) {
    selected = 0
  }
  context.dispatch('setBaseLayer', selected)
}

export function setOverlays (context, overlays) {
  context.commit('overlays', overlays)
  context.dispatch('reorderOverlay')
}

export function addOverlay (context, { id, layer, layerType, name, opacity }) {
  const overlays = context.state.layers.overlays
  const overlaysGroup = context.state.layers._overlaysGroup
  if (id === void 0) {
    id = unique() // TODO get it from the layer info
  }

  const existing = overlays.find(o => o.layer === layer || o.id === id)
  if (existing) {
    if (name) {
      existing.name = name
    }
    if (opacity !== void 0) {
      existing.opacity = opacity
    }
    if (existing.layer !== layer) {
      existing.layer.remove()
      existing.layer = layer
      existing.layerType = layerType
    }
    existing.setVisible(true)
  } else {
    const overlay = {
      id,
      name,
      layer,
      layerType,
      visible: false,
      setVisible (value) {
        if (typeof value !== 'boolean') {
          throw new TypeError('Invalid param')
        }

        if (value === this.visible) {
          return
        }

        this.layer.remove()
        if (value) {
          overlaysGroup.addLayer(this.layer)
        }
        this.visible = value
      },
      opacity: void 0,
      setOpacity (value) {
        if (this.layer.setOpacity) {
          this.layer.setOpacity(value)
          this.opacity = value
        }
      }
    }
    overlay.setVisible(true)
    overlays.unshift(overlay)

    context.dispatch('reorderOverlay')
  }
}

export function removeOverlay (context, overlay) {
  const overlays = context.state.layers.overlays
  const i = overlays.indexOf(overlay)
  if (i >= 0) {
    overlays[i].layer.remove()
    overlays.splice(i, 1)
  }
}

export function removeOverlayById (context, id) {
  const overlays = context.state.layers.overlays
  const i = overlays.findIndex(overlay => overlay.id === id)
  if (i >= 0) {
    overlays[i].layer.remove()
    overlays.splice(i, 1)
  }
}

export function removeOverlayByLayer (context, layer) {
  const overlays = context.state.layers.overlays
  const i = overlays.findIndex(overlay => overlay.layer === layer)
  if (i >= 0) {
    layer.remove()
    overlays.splice(i, 1)
  }
}

export function reorderOverlay (context) {
  const overlays = context.state.layers.overlays
  for (let [i, overlay] of enumerate(reverse(overlays))) {
    if (overlay.layer.setZIndex) {
      overlay.layer.setZIndex(i + 2)
    } else if (overlay.layer.setZIndexOffset) {
      overlay.layer.setZIndexOffset(i + 2)
    }
  }
}

export function draw (context, type) {
  const oldTool = context.rootState.root.currentTool
  context.commit('setCurrentTool', 'draw', { root: true })

  const promise = createLayer({ map: context.state.mapObject, type: type.toLowerCase() })
  promise.then(() => {}, () => {}).then(() => {
    context.commit('setCurrentTool', oldTool, { root: true })
  })
  return promise
}

export function stopDrawing (context) {
  if (context.state.mapObject && context.state.mapObject.editTools.drawing()) {
    context.state.mapObject.editTools.stopDrawing()
  }
}

export function disableDoubleClickZoom (context) {
  context.state.mapObject.doubleClickZoom.disable()
}

export function enableDoubleClickZoom (context) {
  context.state.mapObject.doubleClickZoom.enable()
}

export function addLayer (context, { layerDescriptor, title, options, metaOptions, auth = false }) {
  const map = context.state.mapObject
  const headers = auth ? context.rootGetters['auth/headers'] : void 0
  createExternalLayer({ layerDescriptor, title, options, map, popupComponent: FeaturePopup, metaOptions, headers })
    .then(({ type, layer }) => {
      map.addLayer(layer)

      const name = type === 'WMS' ? layerDescriptor.title : title
      context.dispatch('addOverlay', { layer, layerType: type, name })
    })
    .catch(e => {
      if (e) {
        except(e)
      }
    })
}

export function addSharedMarker (context, marker) {
  context.state.shared.addLayer(marker)
}

export function addDefaultLayers (context) {
  const layers = this.$config.defaultLayers
  if (!layers || layers.length <= 0) {
    return
  }
  layers.forEach(layer => {
    setTimeout(() => {
      const l = defaultsDeep(layer, LAYER_TEMPLATE_DEFAULTS)
      validate(l, LAYER_TEMPLATE)
      context.dispatch('addLayer', layer)
    }, 0)
  })
}
