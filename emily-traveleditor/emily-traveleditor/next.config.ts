module.exports = {
  //...
  async rewrites() {
    return [
      {
        source: '/api/data',
        destination: 'https://example.com/api/data',
      },
    ]
  },
}