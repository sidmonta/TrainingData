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

const Classify = require('./trainingData/ocls')
const GoogleDescription = require('./trainingData/googleDescription')
const { initDb, dbPath } = require('./database/sqlite')
const OpenLibrary = require('./trainingData/openLibrary')

const classify = new Classify()
const googleDesc = new GoogleDescription()
const openLibrary = new OpenLibrary()

const db = initDb(dbPath)
const stmtDeweyExists = db.prepare(
  "SELECT COUNT(*) as 'c' FROM dewey WHERE id = ?"
)
const stmtTrainingData = db.prepare(
  'INSERT OR REPLACE INTO TrainingData VALUES (?, ?, ?, ?, ?)'
)
const stmtRelTb = db.prepare(
  'INSERT OR REPLACE INTO data_x_dewey VALUES (?, ?, ?)'
)

const deweyExists = (dewey) => {
  const d = stmtDeweyExists.get(dewey)
  if (d.c > 0) {
    return true
  }
  logger.warn(`[main] Dewey ${dewey} not exists in DB`)
  return false
}

function addToDb({
  code,
  url,
  isbn,
  deweyCodeList,
  metadata,
  description,
  res,
}) {
  stmtTrainingData.run(url, metadata, code, isbn, description)
  logger.info(`[main] [${getId(url)}] save training data to DB`)
  for (let index = 0; index < deweyCodeList.length; index++) {
    const deweyCode = deweyCodeList[index]
    const deweyRealCode = res[index]
    logger.debug(
      `[main] [${getId(
        url
      )}] insert in map table ${url}-${deweyCode}-${deweyRealCode}`
    )
    stmtRelTb.run(url, deweyCode, deweyRealCode)
  }
  logger.info(`[main] [${getId(url)}] save dewey map to DB`)

  return true
}

async function run() {
  logger.info('[main] start execution')
  try {
    for await (const record of openLibrary.getNext()) {
      console.log(record)
    }
  } catch (error) {
    logger.error(error)
  }
}

;(async () => {
  await run()
  // db.close()
})()
