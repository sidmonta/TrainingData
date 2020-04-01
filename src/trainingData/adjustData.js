const { db } = require('../database/sqlite')

db.serialize(() => {
  // db.all('SELECT id, isbn, metadata FROM TrainingData WHERE isbn IS NOT NULL ORDER BY oclc', [], (err, isbns) => {
  //   if (err) {
  //     console.log(err)
  //     return
  //   }
  //   isbns.forEach(data => {
  //     const { id, isbn, metadata } = data
  //     const uniqueLine = new Set()
  //     metadata.split('\n').forEach(line => {
  //       uniqueLine.add(line)
  //     })
  //     const newMetadata = Array.from(uniqueLine.values()).join('\n')
  //     db.run('UPDATE TrainingData SET isbn = ?, metadata = ? WHERE id = ?', [(isbn.replace(/-/g, '')), newMetadata, id])
  //   })
  //   console.log('salvato')
  // })

  db.all('SELECT data_id as data, dewey_id as dewey, real_dewey as real FROM data_x_dewey', [], (err, deweyX) => {
    if (err) {
      console.log(err)
      return
    }

    deweyX.forEach(ddc => {
      let { data, dewey, real } = ddc

      const split = real.toString().split('.')
      if (split[1]) {
        split[1] = split[1].substring(0, 1)
      }
      dewey = parseFloat(split.join('.'))

      let repairDewey = dewey.toString().split('.')
      if (repairDewey[0].length < 3) {
        repairDewey[0] = repairDewey[0].padStart(3, '0')
      }
      repairDewey = repairDewey.join('.')
      console.log(repairDewey)
      db.all('SELECT COUNT(*) as count FROM dewey WHERE id = ?', [repairDewey], record => {
        if (record && record[0].count === 0) {
          repairDewey = repairDewey.split('.')[0]
        }
        db.run('UPDATE data_x_dewey SET dewey_id = ? WHERE data_id = ? AND real_dewey = ?', [repairDewey, data, real])
      })
    })
  })
  // db.close()
})
