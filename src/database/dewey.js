const fs = require('fs')
const readline = require('readline')
const path = require('path')
const { initDb, dbPath } = require('./sqlite')

const deweyFile = path.resolve(__dirname, '../..', 'dewey.csv')

const deweyMap = new Map()

const db = initDb(dbPath)

function getDeweyMatch(line) {
  let m
  let res = false
  if ((m = /^(\d{3}(?:\.\d+)?)/.exec(line)) !== null) {
    m.forEach((match, groupIndex) => {
      res = match
    })
  }
  return res
}

function extractParent(dewey) {
  let parent = dewey.split('')
  const currentSelect = parent.pop()
  if (currentSelect === '0') {
    parent.pop()
    parent = parent + '00'
  } else {
    parent = parent.join('') + '0'
  }
  return parent
}

function extractRecordType(line) {
  const dewey = getDeweyMatch(line)
  if (dewey) {
    line = line.replace(dewey, '').trim()

    const parent =
      dewey.indexOf('.') > 0 ? dewey.split('.')[0] : extractParent(dewey)

    deweyMap.set(dewey, {
      dewey,
      parent,
      title: line,
    })
  }
}

const readInterface = readline.createInterface({
  input: fs.createReadStream(deweyFile),
  output: process.stdout,
  console: false,
})

readInterface.on('line', extractRecordType)

readInterface.on('close', () => {
  const tableDewey = `CREATE TABLE IF NOT EXISTS dewey (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent TEXT
    )`
  db.exec(tableDewey)
  db.exec(`DELETE FROM dewey`)

  const stmt = db.prepare('INSERT OR REPLACE INTO dewey VALUES (?, ?, ?)')
  for (const row of deweyMap.values()) {
    stmt.run(row.dewey, row.title, row.parent)
  }

  // Fix hierarchy
  // Set root category
  db.exec(`UPDATE dewey SET parent = NULL WHERE parent = id`)
  // Add new root category with id as first dewey value (es: 1 for 100)
  db.exec(
    `INSERT INTO dewey SELECT SUBSTR(id, 1, 1) as 'id', name, parent FROM dewey WHERE parent IS NULL AND length(id) = 3`
  )
  // Set prev root as child of new root
  db.exec(
    `UPDATE dewey SET parent = SUBSTR(id, 1, 1) WHERE id LIKE "%00" AND length(id) = 3 AND parent IS NULL`
  )
  // Set child of prev root as child of new root
  db.exec(
    `UPDATE dewey SET parent = SUBSTR(id, 1, 1) WHERE id LIKE "%0" AND length(id) = 3 AND LENGTH(parent) = 3`
  )
  db.close()
})
