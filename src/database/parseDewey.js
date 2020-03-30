const fetch = require('node-fetch')
const jsdom = require('jsdom')
const { JSDOM } = jsdom

const from = 100
const to = 999

let cursor = from
while (cursor <= to) {
  fetch('http://www.librarything.com/mds/' + cursor).then(data => data.text())
    .then(html => {
      const dom = new JSDOM(html)
      // .map(td => [td.querySelector('a') ? td.querySelector('a').innerText : undefined, td.querySelector('.word') ? td.querySelector('.word').innerText : undefined]).filter(td => td[1]).map(td => td.join(' ')).join('\n')
      console.log(
        Array.from(dom.window.document.querySelectorAll('.ddc tr:nth-child(4) td'))
          .map(td => [
            td.querySelector('a') ? td.querySelector('a').textContent : undefined,
            td.querySelector('.word') ? td.querySelector('.word').textContent : undefined]
          )
          .filter(td => td[1])
          .map(td => td.join(' '))
          .join('\n')
      )
    })
    .catch(() => {})
  cursor = cursor + 1
}
