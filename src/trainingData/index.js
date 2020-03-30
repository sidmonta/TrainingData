const SPARQLQueryDispatcher = require('./sparql')
const Classify = require('./ocls')
const DataContent = require('./dataContent')
const { db } = require('../database/sqlite')
// const getSoggetto = require('./soggettario')

const queryDispatcher = new SPARQLQueryDispatcher(30000)
const classify = new Classify()
const dataContent = new DataContent()

const getId = url => url.split('/').slice(-1).pop().replace('.json', '')

function addToDb ({ code, url, isbn, deweyCodeList, descriptions, res }) {
  const stmtTrainingData = db.prepare('INSERT OR REPLACE INTO TrainingData VALUES (?, ?, ?, ?)')
  const stmtRelTb = db.prepare('INSERT OR REPLACE INTO data_x_dewey VALUES (?, ?, ?)')

  console.log(code, url, isbn, deweyCodeList, res)

  stmtTrainingData.run(url, descriptions, code, isbn)
  stmtTrainingData.finalize()
  for (let index = 0; index < deweyCodeList.length; index++) {
    const deweyCode = deweyCodeList[index]
    const deweyRealCode = res[index]

    stmtRelTb.run(url, deweyCode, deweyRealCode)
  }
  stmtRelTb.finalize()

  return true
}

async function run () {
  try {
    const wikiData = await queryDispatcher.query()

    for (const index in wikiData) {
      const data = wikiData[index]
      const code = data.code.value
      const url = data.item.value
      const isbn = data.isbn.value

      const id = getId(url)
      try {
        const res = await classify.query(code)

        if (!res.length) {
          continue
        }

        const ww = await dataContent.content(id)

        const deweyCodeList = res.map(dewey => {
          const split = dewey.toString().split('.')
          if (split[1]) {
            split[1] = split[1].substring(0, 1)
          }
          return parseFloat(split.join('.'))
        })

        const descriptions = ww.map(info => info.value).join('\n')
        addToDb({
          code,
          url,
          isbn: isbn || null,
          deweyCodeList,
          descriptions,
          res
        })
      } catch (err) {
        // console.error(err)
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    return true
  } catch (err) {
    console.error(err)
  }

  return false
}

db.serialize(async () => {
  await run()
  // db.close()
})
