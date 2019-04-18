import Vue from 'vue'

import { pkGenerator } from '../../lib/feature.js'
import { buildFields } from '../../lib/field/index.js'
import template from 'lodash/template.js'

export function sources (state, value) {
  Vue.set(state, 'sources', value)
}

export function current (state, value) {
  if (state.editStatus.editing) {
    console.error('Trying to change layers while editing')
    return
  }
  state.current = value
  state.geojson = null
  state.layerConfig.layerInfo = null
  state.layerConfig.fields = null
  state.table.selected = []
  state.editStatus.editing = false
  state.editStatus.adding = false
  state.editStatus.originals = {}
  state.editStatus.newPkGenerator = null
}

export function layerInfoFromRequest (state, value) {
  value.geom_type = value.geom_type.toLowerCase()
  const fields = buildFields(value)
  const fieldsDict = {}
  fields.forEach(field => { fieldsDict[field.name] = field })

  value.fields.forEach(field => {
    field.valuesDict = null

    const valuesList = field.values_list
    if (Array.isArray(valuesList) && valuesList.length > 0) {
      field.valuesDict = {}
      for (let value of valuesList) {
        if (Array.isArray(value)) {
          field.valuesDict[value[0]] = value[1]
        } else {
          field.valuesDict[value] = value
        }
      }
    }
  })

  value.design.popup = template(value.design.popup, {
    escape: /{([\s\S]+?)}/g,
    interpolate: null,
    evaluate: null
  })

  const strlist2fields = strlist => {
    return strlist
      .split(',')
      .filter(fieldName => fieldName in fieldsDict)
      .map(fieldName => fieldsDict[fieldName])
  }

  value.design.list_fields = strlist2fields(value.design.list_fields)
  value.design.form_fields = strlist2fields(value.design.form_fields)

  state.layerConfig.layerInfo = value
  state.layerConfig.fields = fields
}

export function layerOptions (state, value) {
  state.layerConfig.options = value
}

export function setGeojson (state, set = true) {
  if (set) {
    state.geojson = state.table.features
  } else {
    state.geojson = null
  }
}

export function features (state, features) {
  state.table.features = features
}

export function selected (state, selected) {
  state.table.selected = selected
}

export function select (state, toSelect) {
  toSelect.forEach(feature => {
    if (!feature.status.selected) {
      feature.status.selected = true
      state.table.selected.push(feature)
    }
  })
}

export function valueSelection (state, { feature, value }) {
  let pos = null
  const selected = state.table.selected.some((f, i) => {
    pos = i
    return f.id === feature.id
  })

  if (value !== selected) {
    if (value) {
      state.table.selected.push(feature)
    } else {
      state.table.selected.splice(pos, 1)
    }
  }
}

export function resetEditStatus (state) {
  state.editStatus.originals = {}
  state.editStatus.newPkGenerator = pkGenerator('__new-')
}

export function editing (state, value) {
  state.geojson.forEach(feature => feature.setEditing(value))
  state.editStatus.editing = value
}

export function adding (state, value) {
  state.editStatus.adding = value
}

export function saving (state, value) {
  state.editStatus.saving = value
}

export function geojson (state, value) {
  state.geojson = value
}

export function featureProperties (state, { feature, properties }) {
  state.layerConfig.fields.filter(field => !field.geom).forEach(field => {
    field.cloneSetValue({ properties }, { feature })
  })
}

export function revertFeature (state, feature) {
  const geojson = state.geojson
  const originals = state.editStatus.originals
  const pk = feature.getPk()

  if (!(pk in originals)) {
    // Do nothing if it hasn't been modified
  } else if (originals[pk]) {
    // Restore value if it existed
    feature.geometry = originals[pk].geometry
    state.layerConfig.fields.filter(field => !field.geom).forEach(field => {
      field.moveValue({ properties: originals[pk].properties }, { feature })
    })
    Vue.delete(originals, pk)
  } else {
    // Remove feature from the table if it was a new feature
    const index = geojson.findIndex(f => f.getPk() === pk)
    if (index > -1) {
      geojson.splice(index, 1)
    }

    Vue.delete(originals, pk)
  }
}

export function revertAllFeatures (state) {
  const geojson = state.geojson
  const originals = state.editStatus.originals

  geojson.forEach(feature => {
    const pk = feature.id
    if (pk in originals && originals[pk]) { // Exists and is not new
      feature.geometry = originals[pk].geometry

      state.layerConfig.fields.filter(field => !field.geom).forEach(field => {
        field.moveValue({ properties: originals[pk].properties }, { feature })
      })
    }
    feature.status.deleted = false
  })

  let index = geojson.length - 1
  while (index >= 0 && geojson[index].status.new) {
    --index
  }
  // index = last old
  ++index
  // index = first new
  geojson.splice(index)
}

export function featureHistory (state, feature) {
  const pk = feature.getPk()

  if (!(pk in state.editStatus.originals)) {
    const properties = {}
    state.layerConfig.fields.filter(field => !field.geom).forEach(field => {
      field.cloneSetValue({ feature }, { properties })
    })

    Vue.set(state.editStatus.originals, pk, {
      geometry: feature.geometry,
      properties
    })
  }
}

export function removeFeaturesByIndex (state, featureIndex) {
  const geojson = state.geojson

  featureIndex
    .sort((a, b) => a < b) // Sorts descending
    .forEach(i => geojson.splice(i, 1)) // Removes the elemeint with that index from the geojson
}

export function unselectFeatures (state, pks) {
  const selected = state.table.selected
  for (let i = selected.length - 1; i >= 0; --i) {
    const pk = selected[i].id
    if (pks.includes(pk)) {
      selected.splice(i, 1)
    }
  }
}
