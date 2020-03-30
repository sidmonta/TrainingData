const fetch = require('node-fetch')

class SPARQLQueryDispatcher {
  constructor (offset) {
    this.endpoint = 'https://query.wikidata.org/sparql'
    this.sparqlQuery = `SELECT ?item ?code ?isbn WHERE {
  ?item wdt:P243 ?code. ?item wdt:P212 ?isbn .} LIMIT 10000 OFFSET ${offset}`
  }

  query () {
    const fullUrl =
      this.endpoint + '?query=' + encodeURIComponent(this.sparqlQuery)
    const headers = { Accept: 'application/sparql-results+json' }

    return fetch(fullUrl, { headers })
      .then(body => body.json())
      .then(
        data =>
          new Promise(resolve => {
            resolve(data.results.bindings)
          })
      )
  }
}

module.exports = SPARQLQueryDispatcher
