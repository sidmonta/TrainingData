const fetch = require('node-fetch')
const { JSDOM } = require('jsdom')

class Classify {
  constructor () {
    this.queryConstructor = id =>
      `http://classify.oclc.org/classify2/Classify?oclc=${id}&summary=true`
  }

  query (oclc) {
    const headers = { Accept: 'text/xml' }
    return fetch(this.queryConstructor(oclc), { headers })
      .then(data => data.text())
      .then(
        xml =>
          new Promise(resolve => {
            const xmlDoc = (new JSDOM(xml)).window.document
            const r = Array.from(xmlDoc.querySelectorAll('ddc > [sfa]'))
              .map(elem => parseFloat(elem.attributes.sfa.value))
              .filter(d => d)
            resolve(r)
          })
      )
      .catch(console.error)
  }
}

module.exports = Classify
