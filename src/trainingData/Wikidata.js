const fetch = require('node-fetch')
const logger = require('pino')({
  level: 'debug',
  formatters: {
    level(label) {
      return { level: label }
    },
    bindings(bindings) {
      return {}
    },
  },
})

class SPARQLQueryDispatcherWikidata {
  constructor(offset) {
    this.endpoint = 'https://query.wikidata.org/sparql'
    this.sparqlQueryList = `SELECT ?item ?code ?isbn WHERE {
  ?item wdt:P243 ?code; wdt:P212 ?isbn .}`

    this.sparqlQueryMetadata = (url) => `SELECT ?label ?valueLabel
    WHERE
    {
      wd:${url} ?item ?value.
      ?propertyItem wikibase:directClaim ?item.
      ?propertyItem ?tt ?label.
      FILTER (lang(?label) = 'en').
      FILTER (STRENDS( STR(?tt), "altLabel") = FALSE)
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`
  }

  list() {
    const fullUrl =
      this.endpoint + '?query=' + encodeURIComponent(this.sparqlQueryList)
    const headers = { Accept: 'application/sparql-results+json' }
    logger.debug(`[wikidata] process list ${fullUrl}`)
    return fetch(fullUrl, { headers })
      .then((body) => body.json())
      .then((data) => data.results.bindings)
      .catch(console.error)
  }

  content(url) {
    const fullUrl =
      this.endpoint +
      '?query=' +
      encodeURIComponent(this.sparqlQueryMetadata(url))
    const headers = { Accept: 'application/sparql-results+json' }
    logger.debug(`[wikidata] process metadata ${fullUrl}`)
    return fetch(fullUrl, { headers })
      .then((body) => body.json())
      .then(
        (data) =>
          new Promise((resolve) => {
            const metadata = new Set()
            logger.debug(
              `[wikidata] found some metadata. Number ${data.results.bindings.length}`
            )
            data.results.bindings.forEach((dd) => {
              metadata.add({
                label: dd.label.value,
                value: dd.valueLabel.value,
              })
            })
            resolve(Array.from(metadata.values()))
          })
      )
  }
}

module.exports = SPARQLQueryDispatcherWikidata
