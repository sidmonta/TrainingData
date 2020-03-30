const parser = require('fast-xml-parser')
const fs = require('fs')
const path = require('path')
const { db } = require('./sqlite')

function parseXml (filename) {
  try {
    const xmlString = fs.readFileSync(filename, 'utf-8')
    const xmlObj = parser.parse(xmlString, {
      attributeNamePrefix: '',
      ignoreAttributes: false,
      ignoreNameSpace: false
    })
    return xmlObj['rdf:RDF']['rdf:Description']
  } catch (err) {
    console.error(err)
  }
  return []
}

function extractNode (data) {
  return {
    id: data['rdf:about'],
    name: data['skos:prefLabel']['#text']
  }
}

function getChildren ({ id, name }, records) {
  return records
    .filter(data => {
      return data['skos:broader'] && data['skos:broader']['rdf:resource'] === id
    })
    .map(extractNode)
    .map(data => ({ ...data, parent: id }))
}

function recursive (nodes, records) {
  if (nodes && nodes.length) {
    nodes.forEach(node => {
      // Save in sqlite
      const stmt = db.prepare('INSERT OR REPLACE INTO soggettario VALUES (?, ?, ?)')
      stmt.run(node.id, node.name, node.parent)
      stmt.finalize()
      const children = getChildren(node, records)
      recursive(children, records)
    })
  }
}

db.serialize(() => {
  const tableSoggettario = `CREATE TABLE IF NOT EXISTS soggettario (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent TEXT
  )`

  db.run(tableSoggettario)

  const files = [
    'NS-SKOS-Tempo.xml',
    'NS-SKOS-Agenti-Organismi.xml',
    'NS-SKOS-Agenti-Organizzazioni.xml',
    'NS-SKOS-Agenti-Persone-Gruppi.xml',
    'NS-SKOS-Azioni-Attivita.xml',
    'NS-SKOS-Azioni-Discipline.xml',
    'NS-SKOS-Azioni-Processi.xml',
    'NS-SKOS-Cose-Forme.xml',
    'NS-SKOS-Cose-Materia.xml',
    'NS-SKOS-Cose-Oggetti.xml',
    'NS-SKOS-Cose-Spazio.xml',
    'NS-SKOS-Cose-Strumenti.xml',
    'NS-SKOS-Cose-Strutture.xml'
  ]

  files.forEach(filename => {
    const records = parseXml(path.resolve(__dirname, '../..', 'soggettarioDati', filename))
    recursive(
      records
        .filter(
          data =>
            data['skos:topConceptOf'] &&
            data['skos:topConceptOf'][0] &&
            data['skos:topConceptOf'][0]['rdf:resource'] ===
              'http://purl.org/bncf/tid/Thes'
        )
        .map(extractNode),
      records
    )
  })
})
db.close()
