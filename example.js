const SAT = require('./SAT.js')

SAT.init('endpoint', 'instance', 'akId', 'akSecret', 'possible STS')

// basic get, put, delete
async function get () {
  const res = await SAT.table('table').get('testid')
  console.log(res) // an object
}

async function put () {
  await SAT.table('table').put('testid', { hello: 'world!', num: 12 })
}

async function del () {
  await SAT.table('table').del('testid')
}

// advanced
async function getRange () {
  // scan id
  const res = await SAT.table('table').getRange('a', 'z')
  console.log(res) // { 'someid': { ... }, ... }
}

async function update () {
  // update values
  await SAT.table('table').update('testid', { hello: 'hi', num: 3 })
  // delete properties
  await SAT.table('table').update('testid', { hello: { del: 1 } })
  // increment with condition on columns
  await SAT.table('node').update('test', { num: { inc: -1 } }, ['E', ['num', '>', 0]])
}
