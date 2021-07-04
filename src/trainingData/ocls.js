const fetch = require('node-fetch')
const logger = require('pino')()
const { JSDOM } = require('jsdom')

const getDDC = (xml) =>
  new Promise((resolve) => {
    const xmlDoc = new JSDOM(xml).window.document
    logger.debug(`[OCLC] extract xml %s`, xml)
    const r = Array.from(xmlDoc.querySelectorAll('ddc > [sfa]'))
      .map((elem) => parseFloat(elem.attributes.sfa.value))
      .filter((d) => d)
    resolve(r)
  })

class Classify {
  constructor() {
    this.queryConstructor = (id, type = 'oclc') =>
      `http://classify.oclc.org/classify2/Classify?${type}=${id}&summary=true`

    this.headers = { Accept: 'text/xml' }
  }

  async query(oclc, isbn) {
    const promiseOclc = this._queryOclc(oclc)
    const promiseIsbn = this._queryOclc(isbn)

    try {
      const data = await Promise.all([promiseOclc, promiseIsbn])
      console.log(data)
      const deweyCodeList = data.flat().map((dewey) => {
        const split = dewey.toString().split('.')
        if (split[1]) {
          split[1] = split[1].substring(0, 1)
        }
        return parseFloat(split.join('.'))
      })

      return deweyCodeList
    } catch (err) {
      console.error(err)
    }

    return []
  }

  _queryOclc(oclc) {
    logger.debug(`[OCLC] get data for OCLC ID %s`, oclc)
    return fetch(this.queryConstructor(oclc, 'olcl'), { headers: this.headers })
      .then((data) => data.text())
      .then(getDDC)
  }

  _queryIsbn(isbn) {
    logger.debug(`[OCLC] get data for ISBN ID %s`, isbn)
    return fetch(this.queryConstructor(isbn, 'isbn'), { headers: this.headers })
      .then((data) => data.text())
      .then(getDDC)
  }
}

module.exports = Classify
