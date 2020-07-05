const BetterSqlite3 = require('better-sqlite3')
const fetch = require('node-fetch')
const { resolve } = require('path')


const database = new BetterSqlite3(resolve(__dirname, '../../database.db'))

const deweyList = database.prepare('SELECT id FROM dewey WHERE parent IS NOT NULL').all().map(record => record.id)
const preferredDewey = database.prepare('SELECT d.id FROM dewey d WHERE d.id NOT IN (SELECT DISTINCT dxd.dewey_id FROM data_x_dewey dxd) AND d.parent IS NOT NULL').all().map(r => r.id)
const insertQuery = database.prepare('INSERT OR IGNORE INTO TrainingData(id, metadata, oclc, isbn) VALUES(:id, :metadata, :oclc, :isbn)')
const insertRelationQuery = database.prepare('INSERT OR IGNORE INTO data_x_dewey(data_id, dewey_id, real_dewey) VALUES(:id, :dewey, :real_dewey)')

function get(record) {
  const { isbn, text, ddc, oclc, key } = record

  let isbn13 = ''
  let metadata = ''
  let dewey = ''
  let realDewey = ''
  let oclCode = ''
  let id = 'http://openlibrary.org' + key

  if (isbn) {
    let maxL = Math.max(...isbn.map(is => is.length))
    isbn13 = isbn.find(is => is.length === maxL)
  }

  if (text) {
    metadata = text.filter(t => !isFinite(t) && !t.startsWith('OL') && !t.startsWith('0')).join('\n')
  }

  if (ddc) {
    let first = ddc.find(c => preferredDewey.find(d => c.startsWith(c))) || ddc[0]

    realDewey = first
    if (first in deweyList) {
      dewey = first
    } else {
      let deweySplit = first.split('.')
      if (deweySplit.length > 1) {
        let tmpDewey = `${deweySplit[0]}.${deweySplit[1][0]}`
        if (tmpDewey in deweyList) {
          dewey = tmpDewey
        } else {
          dewey = deweySplit[0]
        }
      }
    }

    if (Number.isNaN(parseInt(dewey)) && !(dewey in deweyList)) {
      dewey = ''
    }
  }

  if (oclc) {
    oclCode = oclc[0]
  }


  return { id, isbn13, metadata, dewey, oclc: oclCode, realDewey }
}

function insert(record) {
  const { id, isbn13, metadata, dewey, oclc, realDewey } = record
  try {
    insertQuery.run({
      id, metadata, oclc, isbn: isbn13
    })
    insertRelationQuery.run({
      id, dewey, real_dewey: realDewey
    })
  } catch (err) {
    console.log('TRY TO INSERT', id, dewey)
  }

  console.log('INSERT ', id, dewey)
}

async function main() {
  const url = 'http://openlibrary.org/search.json?q=a'

  let numFound = Number.POSITIVE_INFINITY
  let start = 0
  let page = 0
  while (start < numFound) {
    page++
    try {
      const data = await fetch(url + `&page=${page}`)
        .then(data => data.json())
      console.log(`GET ${data.start}/${data.numFound} IN PAGE ${page}`)

      numFound = data.numFound
      start = data.start

      const records = data.docs
        .filter(doc => doc.ddc)
        .map(get)
        .filter(record => record.id && record.dewey && record.isbn13)

      console.log('USE', records.length)
      records.forEach(insert)
    } catch (err) {
      console.log(err)
    }
  }

}

main()