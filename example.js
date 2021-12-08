const SAT = require('simple-aliyun-tablestore')
// if use directly from SAT.js
// const SAT = require('./SAT.js')

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

async function getBatch () {
  const res = await SAT.table('table').getBatch(['id1', 'id2', 'id3'])
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

async function writeBatch () {
  SAT.table('tablename').writeBatch([
    ['PUT', 'id1', { hello: 'hi' }, 'I'],
    ['UPDATE', 'id2', { hello: { del: 1 } }],
    ['DELETE', 'id3']
  ])
}

async function multiplePK () {
  const res = await SAT.table('table', ['pk1', 'pk2']).get(['pk1value', 123])
  console.log(res)
}
