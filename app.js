window.myDebug = require('debug')
var qs = require('querystring')
var xtend = require('xtend')
var dragDrop = require('drag-drop/buffer')
var worldpop = require('./')
var MapView = require('./app/map-view')
var Progress = require('./app/progress')
var accessToken = require('./app/mapbox-access-token')

var styles = require('./css/styles.css')
styles()

var map = new MapView('map', calculateTotal)
var progress = new Progress(document.querySelector('#progress'))

var options = parseOptions()
if (options.polygon) {
  options.polygon = decodeURIComponent(options.polygon)
  map.setPolygon(options.polygon)
}
updateHash()

dragDrop(document.body, function (files) {
  files.forEach(function (file) {
    console.log('file', file, file.toString())
    map.setPolygon(file)
  })
})

function calculateTotal (layer) {
  progress.reset()
  var tilesUri = 'tilejson+http://api.tiles.mapbox.com/v4/' +
    `${options.source}.json?access_token=${accessToken}`
  var testPoly = layer.toGeoJSON()

  worldpop({
    source: tilesUri,
    density: density,
    polygon: testPoly,
    min_zoom: 11,
    max_zoom: 11,
    progress: progress.update.bind(progress),
    progressFrequency: 1000
  }, function (err, result) {
    if (err) console.error(err)
    testPoly.properties = xtend(testPoly.properties, result)
    map.updatePolygon(layer, testPoly)
    updateHash(map.drawnPolygonsToGeoJSON())
    progress.finish(result)
  })
}

function density (feature) {
  return feature.properties[options.densityProp] / options.multiplier
}

function parseOptions () {
  var defaults = {
    source: 'devseed.oexqd7vi',
    densityProp: 'density',
    multiplier: 10000,
    min_zoom: 11,
    max_zoom: 11
  }

  var hash = window.location.hash || '#'
  var params = qs.parse(hash.slice(1).split(',').join('&'))
  var options = xtend(defaults, params)

  void ['multiplier', 'min_zoom', 'max_zoom']
    .forEach((k) => options[k] = Number(options[k]))

  return options
}

function updateHash (poly) {
  if (poly) {
    console.log('outgoing', poly)
    options.polygon = encodeURIComponent(JSON.stringify(poly))
  }
  window.location.hash = Object.keys(options)
    .map((k) => [k, options[k]].map(encodeURIComponent).join('='))
    .join(',')
}
