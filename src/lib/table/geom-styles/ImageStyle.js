import { eachLayer } from 'src/lib/geomUtils'
import GeomStyle from './Base'
import { toNumber } from './utils'
import IconsGenerator from './icons/IconsGenerator'

class ImageStyle extends GeomStyle {
  getDefaultStyle () {
    return {
      icon: void 0,
      width: 32,
      height: 32
    }
  }

  fromInfo ({ size, width, height, icon }) {
    size = toNumber(size)

    return {
      icon,
      width: toNumber(width, size),
      height: toNumber(height, size)
    }
  }

  _apply (row) {
    const { icon, width, height } = this.generate(row)

    eachLayer(row.layer, layer => {
      layer.setIcon(
        IconsGenerator.imgIcon({
          icon,
          sizes: [width, height]
        })
      )
    })
  }
}

export { ImageStyle as default, ImageStyle }
