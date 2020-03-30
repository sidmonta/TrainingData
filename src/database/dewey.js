const fs = require('fs')
const readline = require('readline')
const path = require('path')
const { db } = require('./sqlite')

const deweyFile = path.resolve(__dirname, '../..', 'dewey.csv')

const deweyMap = new Map()

function getDeweyMatch (line) {
  let m
  let res = false
  if ((m = /\((\d+)\)/.exec(line)) !== null) {
    m.forEach((match, groupIndex) => {
      res = match
    })
  }
  return res
}

function getDeweyMatch2 (line) {
  let m
  let res = false
  if ((m = /^(\d{3}\.\d+)/.exec(line)) !== null) {
    m.forEach((match, groupIndex) => {
      res = match
    })
  }
  return res
}

function extractRecordType1 (line) {
  const dewey = getDeweyMatch(line)
  line = line.replace(`(${dewey})`, '').trim()
  if (dewey) {
    let parent = dewey.split('')
    const currentSelect = parent.pop()
    if (currentSelect === '0') {
      parent.pop()
      parent = parent + '00'
    } else {
      parent = parent.join('') + '0'
    }

    if (deweyMap.has(parent)) {
      const titleToRemove = deweyMap.get(parent).title
      line = line.replace(titleToRemove, '').trim()
    }

    const record = {
      dewey,
      parent,
      title: line
    }

    deweyMap.set(dewey, record)
  }
}

function extractRecordType2 (line) {
  const dewey = getDeweyMatch2(line)
  if (dewey) {
    line = line.replace(dewey, '').trim()

    const parent = dewey.split('.')[0]

    deweyMap.set(dewey, {
      dewey,
      parent,
      title: line
    })
  }
}

const readInterface = readline.createInterface({
  input: fs.createReadStream(deweyFile),
  output: process.stdout,
  console: false
})

readInterface.on('line', function (line) {
  if (line[0] === '(') {
    extractRecordType1(line)
  } else {
    extractRecordType2(line)
  }
})

readInterface.on('close', () => {
  db.serialize(() => {
    const tableDewey = `CREATE TABLE IF NOT EXISTS dewey (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent TEXT
    )`
    db.run(tableDewey)

    const stmt = db.prepare('INSERT OR REPLACE INTO dewey VALUES (?, ?, ?)')
    for (const row of deweyMap.values()) {
      stmt.run(row.dewey, row.title, row.parent)
    }
    stmt.finalize()
  })
  db.close()
})
