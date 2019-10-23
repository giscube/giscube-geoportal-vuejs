export default class CatalogResult {
  constructor (data) {
    for (let [key, value] of Object.entries(data)) {
      Object.defineProperty(this, key, { value, writable: true, enumerable: true })
    }
  }

  get isLayer () {
    return this.geojson || (this.children && this.children.length > 0)
  }

  toLayer (root) {
    if (!this.isLayer) {
      return
    }

    return {
      layerDescriptor: this.children[0],
      title: this.title,
      options: this.options || {},
      metaOptions: {
        root
      },
      auth: this.private
    }
  }

  static create (data) {
    return new CatalogResult(data)
  }
}