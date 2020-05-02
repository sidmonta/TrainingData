import NaiveBayes from '../../../Classifier/src/algorithms/NaiveBayes'
import { featureWthMetadata } from '../../../Classifier/src/Features'

import { db } from '../database/sqlite'

// Constant
const dataForTrain = 10640
const dataForTest = 1181

const classifier = new NaiveBayes({
  features: featureWthMetadata,
  database: {
    dbPath: '../../database.db'
  }
})

db.serialize(() => {
  console.log('Start training')

  db.all(`
  SELECT td.metadata , td.description, dewey.name , dewey.id
  FROM
  	TrainingData td
  	INNER JOIN data_x_dewey x ON (td.id = x.data_id )
  	INNER JOIN dewey  ON (x.dewey_id = dewey.id )
  ORDER BY td.id
  LIMIT ${dataForTrain}
    `, async (err, all) => {
    if (err) {
      console.error(err)
    }
    console.log(`Training on ${all.length} data`)

    for (let row of all) {
      let { metadata, description, name, id } = row
      metadata = metadata.split('\n')
      metadata.push(name)

      description = description || ''

      await classifier.train({ metadata, content: description }, id)
      console.log('train on ' + id)
    }

    console.log('Finish training')
  })
})