var qs = require('querystring')
var xtend = require('xtend')
var fc = require('turf-featurecollection')
var polygon = require('turf-polygon')
var hash = require('hash-change')
var d64 = require('d64')

module.exports = class HashState {
  constructor (defaults, onChange) {
    this.defaults = defaults
    this.onChange = onChange
  }

  parse () {
    let hash = window.location.hash || '#'
    let params = qs.parse(hash.slice(1).split(',').join('&'))
    this.state = xtend(this.defaults, params)

    // cast numeric options
    void [
      'multiplier',
      'min_zoom',
      'max_zoom',
      'longitude',
      'latitude',
      'zoom'
    ].forEach((k) => this.state[k] = Number(this.state[k]))

    // decode geojson
    if (this.state.polygon) {
      this.state.polygon = decodeGeoJson(this.state.polygon)
    }

    this.update()
    this.onChange(this.state)
  }

  /*
   * Update the hash state, only overwriting properties
   * that are set on `state`.
   */
  update (state) {
    var self = this
    this.state = xtend(this.state, state || {})
    state = xtend({}, this.state)
    if (state.polygon && typeof state.polygon !== 'string') {
      state.polygon = encodeGeoJson(state.polygon)
    }

    hash.removeAllListeners()
    hash.once('change', function () {
      hash.on('change', () => self.parse())
    })
    window.location.hash = Object.keys(state)
      .map((k) => [k, state[k]].map(encodeURIComponent).join('='))
      .join(',')
  }
}

/*
 * FeatureCollection of Polygons --> [ [ [ [x,y], ... ] ], ... ]
 */
function encodeGeoJson (geojson) {
  if (geojson.type === 'FeatureCollection') {
    geojson = geojson.features.map((f) => f.geometry.coordinates)
  } else {
    geojson = [geojson.geometry.coordinates]
  }

  return d64.encode(new Buffer(JSON.stringify(geojson), 'utf-8'))
}

function decodeGeoJson (str) {
  try {
    var json = d64.decode(str).toString('utf-8')
    var coordinates = JSON.parse(json)
    return fc(coordinates.map((poly) => polygon(poly)))
  } catch (e) {
    console.error(e)
    return undefined
  }
}