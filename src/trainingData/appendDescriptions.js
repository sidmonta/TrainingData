const fetch = require('node-fetch')
const { db } = require('../database/sqlite')

db.serialize(async () => {
  db.all('SELECT id, description, isbn FROM TrainingData WHERE isbn IS NOT NULL ORDER BY oclc', [], async (err, rows) => {
    if (err) {
      console.error(err)
    }
    for (const index in rows) {
      const book = rows[index]
      const isbn = book.isbn.replace(/-/g, '')
      console.log(isbn)
      try {
        const result = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`, {
          headers:
            { Accept: 'application/json' }
        }).then(data => data.json())

        if (result.totalItems) {
          const descr = result.items[0].volumeInfo.description
          if (descr) {
            book.description = book.description + '\n' + descr
            db.run('UPDATE TrainingData SET description = ? WHERE id = ?', book.description, book.id)
            console.log(descr)
          }
        }
      } catch (err) {
        console.error(err)
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    db.close()
  })
})
