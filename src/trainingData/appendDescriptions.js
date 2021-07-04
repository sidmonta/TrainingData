const fetch = require('node-fetch')
const { db } = require('../database/sqlite')
const GoogleDescription = require('./googleDescription')

const googleDesc = new GoogleDescription()

db.all(
  'SELECT id, metadata, isbn FROM TrainingData WHERE isbn IS NOT NULL AND description IS NULL',
  [],
  async (err, rows) => {
    if (err) {
      console.error(err)
    }
    for (const index in rows) {
      const book = rows[index]
      const isbn = book.isbn.replace(/-/g, '')
      console.log(isbn)
      try {
        const descr = await googleDesc.getDescription(isbn)
        if (descr) {
          try {
            db.run(
              'UPDATE TrainingData SET description = ? WHERE id = ?',
              descr,
              book.id
            )
            console.log(descr)
          } catch (err) {
            console.log(err)
          }
        }
      } catch (err) {
        console.error(err)
      }
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
    db.close()
  }
)
