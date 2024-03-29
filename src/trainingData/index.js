const logger = require('pino')()

const SPARQLQueryDispatcher = require('./sparql')
const Classify = require('./ocls')
const DataContent = require('./dataContent')
const { db } = require('../database/sqlite')

const queryDispatcher = new SPARQLQueryDispatcher(2000)
const classify = new Classify()
const dataContent = new DataContent()

const getId = (url) => url.split('/').slice(-1).pop().replace('.json', '')

function addToDb({ code, url, isbn, deweyCodeList, metadata, res }) {
  const stmtTrainingData = db.prepare(
    'INSERT OR REPLACE INTO TrainingData VALUES (?, ?, ?, ?, ?)'
  )
  const stmtRelTb = db.prepare(
    'INSERT OR REPLACE INTO data_x_dewey VALUES (?, ?, ?)'
  )

  console.log(code, url, isbn, deweyCodeList, res)

  stmtTrainingData.run(url, metadata, code, isbn.replace(/-/g, ''), null)
  stmtTrainingData.finalize()
  for (let index = 0; index < deweyCodeList.length; index++) {
    const deweyCode = deweyCodeList[index]
    const deweyRealCode = res[index]

    stmtRelTb.run(url, deweyCode, deweyRealCode)
  }
  stmtRelTb.finalize()

  return true
}

async function run() {
  logger.info('[main] start execution')
  try {
    const wikiData = await queryDispatcher.query()
    logger.info(`[main] elaborate ${wikiData.length} of Wikidata books`)
    for (const index in wikiData) {
      const data = wikiData[index]
      const code = data.code.value
      const url = data.item.value
      const isbn = data.isbn.value.replace(/-/g, '')

      const id = getId(url)

      logger.info(`[main] [${id}] start elaborate ${id} books`)
      logger.debug(`[main] [${id}] elaborate %o`, { code, url, isbn, id })
      try {
        const res = await classify.query(code, isbn)
        if (!res.length) {
          logger.warn(
            `[main] [${id}] no DEWEY found for OCLC=${code} or ISBN=${isbn}`
          )
          continue
        }

        const ww = await dataContent.content(id)

        const deweyCodeList = res.map((dewey) => {
          const split = dewey.toString().split('.')
          if (split[1]) {
            split[1] = split[1].substring(0, 1)
          }
          return parseFloat(split.join('.'))
        })

        const metadata = Array.from(new Set(ww.map((info) => info.value))).join(
          '\n'
        )
        addToDb({
          code,
          url,
          isbn: isbn || null,
          deweyCodeList,
          metadata,
          res,
        })
      } catch (err) {
        console.error(err)
      }

      // await new Promise(resolve => setTimeout(resolve, 1000))
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
