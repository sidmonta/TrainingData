const logger = require('pino')()

const SPARQLQueryDispatcherWikidata = require('./trainingData/Wikidata')
const Classify = require('./trainingData/ocls')
const GoogleDescription = require('./trainingData/googleDescription')
const { initDb, dbPath } = require('./database/sqlite')

const queryDispatcher = new SPARQLQueryDispatcherWikidata(2000)
const classify = new Classify()
const googleDesc = new GoogleDescription()

const getId = (url) => url.split('/').slice(-1).pop().replace('.json', '')

const db = initDb(dbPath)

function addToDb({
  code,
  url,
  isbn,
  deweyCodeList,
  metadata,
  description,
  res,
}) {
  const stmtTrainingData = db.prepare(
    'INSERT OR REPLACE INTO TrainingData VALUES (?, ?, ?, ?, ?)'
  )
  const stmtRelTb = db.prepare(
    'INSERT OR REPLACE INTO data_x_dewey VALUES (?, ?, ?)'
  )

  // stmtTrainingData.run(url, metadata, code, isbn, description)
  // stmtTrainingData.finalize()
  // logger.info(`[main] [${getId(url)}] save training data to DB`)
  // for (let index = 0; index < deweyCodeList.length; index++) {
  //   const deweyCode = deweyCodeList[index]
  //   const deweyRealCode = res[index]

  //   stmtRelTb.run(url, deweyCode, deweyRealCode)
  // }
  // logger.info(`[main] [${getId(url)}] save dewey map to DB`)
  // stmtRelTb.finalize()

  return true
}

async function run() {
  logger.info('[main] start execution')
  try {
    const wikiData = await queryDispatcher.list()
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
        logger.debug(`[main] [${id}] dewey %o`, res)
        const wikidataMetadata = await queryDispatcher.content(id)
        const metadata = Array.from(
          new Set(wikidataMetadata.map(({ value }) => value))
        ).join('\n')
        logger.debug(`[main] [${id}] metadata %s`, metadata)
        const descr = await googleDesc.getDescription(isbn)
        logger.debug(`[main] [${id}] description %s`, descr)

        addToDb({
          code,
          url,
          isbn: isbn || null,
          deweyCodeList,
          metadata,
          description: descr,
          res,
        })
      } catch (err) {
        logger.error(err)
        console.error(err)
      }

      // await new Promise(resolve => setTimeout(resolve, 1000))
    }
    return true
  } catch (err) {
    logger.fatal(err)
  }

  return false
}

;(async () => {
  await run()
  // db.close()
})()
