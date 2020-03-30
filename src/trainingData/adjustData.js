const { db } = require('../database/sqlite')

db.serialize(async () => {
  const isbns = await db.all('SELECT id, isbn, description FROM TrainingData WHERE isbn IS NOT NULL ORDER BY oclc')
  const stmt = db.prepare('UPDATE TrainingData SET isbn = ?, description = ? WHERE id = ?')
  isbns.forEach(data => {
    const { id, isbn, description } = data
    const uniqueLine = new Set()
    description.split('\n').forEach(line => {
      uniqueLine.add(line)
    })
    const newDescription = Array.from(uniqueLine.values()).join('\n')
    stmt.run((isbn.replace(/-/g, '')), newDescription, id)
  })
  stmt.finalize()

  const deweyX = await db.all('SELECT data_id as data, dewey_id as dewey, real_dewey as real FROM data_x_dewey')
  const stmt2 = db.prepare('UPDATE data_x_dewey SET dewey_id = ? WHERE data_id = ? AND real_dewey = ?')

  deweyX.forEach(async ddc => {
    const { data, dewey, real } = ddc

    let repairDewey = dewey.split('.')
    if (repairDewey[0].length < 3) {
      repairDewey[0] = repairDewey[0].padStart(3, '0')
      repairDewey = repairDewey.join('.')
    }
    const isPresent = await db.get('SELECT * FROM dewey WHERE id = ?', [repairDewey])
    if (!isPresent || !isPresent.id) {
      repairDewey = repairDewey.split('.')[0]
    }

    stmt2.run(repairDewey, data, real)
  })
  db.close()
})
