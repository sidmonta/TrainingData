const zoom = require('node-zoom2')
const { db } = require('../database/sqlite')

const getSoggetto = (isbn) => {
  return new Promise((resolve, reject) => {
    zoom.connection('193.206.221.29:2100/nopac')
      .set('preferredRecordSyntax', 'UNIMARC')
      .query('prefix', '@attr 1=7 ' + isbn.replace('-', ''))
      .search((err, resultset) => {
        console.log(resultset)
        if (err || !resultset) {
          reject(err)
        }
        if (resultset) {
          resultset.getRecords(0, 1, function (err, records) {
            if (err) {
              reject(err)
            }
            if (records) {
              const map = []
              while (records.hasNext()) {
                const record = records.next()
                if (record._record) {
                  map.push(record)
                }
              }

              resolve(map[0])
            }
          })
        } else {
          reject(Error(''))
        }
      })
  })
}

db.serialize(() => {
  db.all('SELECT isbn FROM TrainingData WHERE isbn IS NOT NULL', async (err, all) => {
    if (err) {
      console.error(err)
    }

    const isbnList = all.filter(row => row && row.isbn).map(row => row.isbn)
    for (const index in isbnList) {
      const isbn = isbnList[index]
      try {
        const soggetto = await getSoggetto(isbn)
        if (soggetto && soggetto.length) {
          console.log(soggetto)
        }
      } catch (err) {
        console.error(err)
      }
    }
  })
})
