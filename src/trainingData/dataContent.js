const fetch = require('node-fetch')

class SPARQLQueryDispatcher {
  constructor () {
    this.endpoint = 'https://query.wikidata.org/sparql'
    this.sparqlQuery = url => `SELECT ?label ?valueLabel
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

  content (url) {
    const fullUrl =
      this.endpoint + '?query=' + encodeURIComponent(this.sparqlQuery(url))
    const headers = { Accept: 'application/sparql-results+json' }
    console.log(url)
    return fetch(fullUrl, { headers })
      .then(body => body.json())
      .then(
        data =>
          new Promise(resolve => {
            resolve(
              data.results.bindings.map(dd => {
                const value = dd.valueLabel.value
                const label = dd.label.value

                return { label, value }
              })
            )
          })
      )
  }
}

module.exports = SPARQLQueryDispatcher
