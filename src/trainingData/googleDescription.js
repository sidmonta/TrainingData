class GoogleDescription {
  constructor() {
    this.url = (isbn) =>
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
  }

  async getDescription(isbn) {
    const result = await fetch(this.url(isbn), {
      headers: { Accept: 'application/json' },
    }).then((data) => data.json())
    let descr = ''
    if (result.totalItems) {
      descr = result.items.reduce(
        (desc, item) => desc + item.volumeInfo.description + '\n',
        ''
      )
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return descr.trim()
  }
}

module.exports = GoogleDescription
