const path = require('path')
const fs = require('fs')
const BetterSqlite3 = require('better-sqlite3')
const dbPath = path.resolve(__dirname, '../..', 'database-new.db')

const dbExist = fs.existsSync(dbPath)
const db = new BetterSqlite3(dbPath)

function init() {
  // Create Table
  const tableDewey = `CREATE TABLE IF NOT EXISTS dewey (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent TEXT
  )`
  const tableSoggettario = `CREATE TABLE IF NOT EXISTS soggettario (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent TEXT
  )`
  const tableTrainingData = `CREATE TABLE TrainingData (
    id TEXT NOT NULL,
    metadata TEXT NOT NULL,
    oclc TEXT NOT NULL,
    description TEXT,
    isbn TEXT,
    CONSTRAINT TrainingData_PK PRIMARY KEY (id)
  )`
  const tableDeweyXTraining = `CREATE TABLE data_x_dewey (
    data_id TEXT NOT NULL,
    dewey_id TEXT NOT NULL,
    real_dewey TEXT NOT NULL,
    CONSTRAINT data_x_dewey_PK PRIMARY KEY (data_id,dewey_id),
    CONSTRAINT data_x_dewey_FK FOREIGN KEY (dewey_id) REFERENCES dewey(id) ON DELETE SET NULL,
    CONSTRAINT data_x_dewey_FK_1 FOREIGN KEY (data_id) REFERENCES TrainingData(id)
  )`
  db.run(tableDewey)
  db.run(tableSoggettario)
  db.run(tableTrainingData)
  db.run(tableDeweyXTraining)
}
if (!dbExist) {
  db.transaction(function () {
    init()
  })
}

const initDb = (dbPathArg) => {
  const dbExist = fs.existsSync(dbPathArg)
  const db = new BetterSqlite3(dbPathArg)
  if (!dbExist) {
    db.transaction(function () {
      init()
    })
  }
  return db
}

module.exports = {
  db,
  dbPath,
  initDb,
}
