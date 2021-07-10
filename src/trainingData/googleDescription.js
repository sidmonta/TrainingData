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

class GoogleDescription {
  constructor() {
    this.url = (isbn) =>
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
  }

  async getDescription(isbn) {
    logger.debug(`[google] get description for ${isbn}`)
    const result = await fetch(this.url(isbn), {
      headers: { Accept: 'application/json' },
    }).then((data) => data.json())
    let descr = ''
    if (result.totalItems) {
      logger.debug(
        `[google] found description for ${isbn}. Number=${result.items.length}`
      )
      descr = result.items.reduce(
        (desc, item) => desc + item.volumeInfo.description + '\n',
        ''
      )
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return descr.trim()
  }
}

module.exports = GoogleDescription
