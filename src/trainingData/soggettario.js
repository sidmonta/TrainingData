const zoom = require('node-zoom2')

const getSoggetto = (isbn) => {
  return new Promise((resolve, reject) => {
    zoom.connection('193.206.221.29:3950/nopac')
      .set('preferredRecordSyntax', 'UNIMARC')
      .query('prefix', '@attr 1=7 ' + isbn.replace('-', ''))
      .createReadStream()
      .on('data', function (record) {
        const elem = record.json.fields
          .filter(elem => Object.keys(elem)[0] === '606')
          .map(elem => elem['606'] ? elem['606'].subfields : {})
          .filter(field => Object.keys(field)[0] === 'a')
          .map(field => field.a)
        resolve(elem)
      })
      .on('close', function (close) {
        resolve()
      })
  })
}

module.exports = getSoggetto
