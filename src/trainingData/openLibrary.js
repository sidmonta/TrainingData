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

const fetch = require('node-fetch')

class OpenLibrary {
  constructor() {
    this.prefixUrl = 'http://openlibrary.org/search.json?q='
    this.alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('')

    this.recordHistory = new Set()
  }

  async *getNext() {
    let alphabetIndex = 0
    while (alphabetIndex < this.alphabet.length) {
      const alphabetChar = this.alphabet[alphabetIndex]
      const fetch_url = this.prefixUrl + alphabetChar

      logger.debug(
        `[openlibrary] Start get ${alphabetChar.toUpperCase()} paginations`
      )

      let numFound = Number.POSITIVE_INFINITY
      let start = 0
      let page = 0
      while (start < numFound) {
        page++
        try {
          const data = await fetch(url + `&page=${page}`).then((data) =>
            data.json()
          )
          logger.debug(
            `[openlibrary] GET ${data.start}/${
              data.numFound
            } IN PAGE ${page} for ${alphabetChar.toUpperCase()}`
          )

          numFound = data.numFound
          start = data.start

          for (const doc of data.docs) {
            if (!this.recordHistory.has(doc.key)) {
              this.recordHistory.add(doc.key)
              yield doc
            }
          }
        } catch (err) {
          logger.error(err)
        }
      } // while fetch
    } // while alphabet
  }
}
