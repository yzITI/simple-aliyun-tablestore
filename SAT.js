// https://github.com/yzITI/simple-aliyun-tablestore
// v1.2.3 2022-09-05
const TS = require('tablestore')

const constants = {
  'IGNORE': 0, 'I': 0,
  'EXPECT_EXIST': 1, 'E': 1,
  'EXPECT_NOT_EXIST': 2, 'NE': 2,

  'EQUAL': 1, '==': 1,
  'NOT_EQUAL': 2, '!=': 2,
  'GREATER_THAN': 3, '>': 3,
  'GREATER_EQUAL': 4, '>=': 4,
  'LESS_THAN': 5, '<': 5,
  'LESS_EQUAL': 6, '<=': 6,

  'NOT': 1, '!': 1,
  'AND': 2, '&&': 2,
  'OR': 3, '||': 3,
}

let client = null

// utils functions
const int2Long = v => Number.isInteger(v) ? TS.Long.fromNumber(v) : v
const long2Int = v => typeof v === 'object' ? v.toNumber() : v

const condition = c => {
  if (typeof c == 'string') c = [c]
  const rc = c.shift()
  cs = c.map(x => new TS.SingleColumnCondition(x[0], int2Long(x[2]), constants[x[1]]))
  let colCond = null
  if (cs.length) {
    if (cs.length > 1) {
      colCond = new TS.CompositeCondition(constants.AND)
      for (const cc of cs) colCond.addSubCondition(cc)
    } else colCond = cs[0]
  }
  return new TS.Condition(constants[rc], colCond)
}

const pk = (k, pks) => {
  const ks = (k instanceof Array) ? k : [k]
  return pks.map((x, i) => ({ [x]: int2Long(ks[i]) }))
}

const params = (k, c, t, pks) => ({ tableName: t, primaryKey: pk(k, pks), condition: c && condition(c) })

function wrap (k, row, pks) {
  if (!row.attributes) return null
  const res = {}, ks = (k instanceof Array) ? k : [k] 
  for (let i = 0; i < pks.length; i++) res[pks[i]] = long2Int(ks[i])
  for (const a of row.attributes) res[a.columnName] = long2Int(a.columnValue)
  return res
}

function wrapRows (rows, pks, res) {
  for (const r of rows) {
    if (!r.primaryKey) continue
    const k = r.primaryKey.map(x => x.value)
    res[k.join()] = wrap(k, r, pks)
  }
}

const columns = (as, pks) => {
  if (!as) return []
  for (const k of pks) delete as[k]
  const res = []
  for (const k in as) res.push({ [k]: int2Long(as[k]) })
  return res
}

const attrColumns = (attrs, pks) => {
  const dA = [], puts = {}, incs = {}
  for (const key in attrs) {
    const a = attrs[key]
    if (typeof a == 'object' && (a.del || a.inc)) {
      if (a.del) dA.push(key)
      if (a.inc) incs[key] = a.inc
    } else puts[key] = a
  }
  return [{ 'PUT': columns(puts, pks) }, {'DELETE_ALL': dA }, { 'INCREMENT': columns(incs, pks) }]
}

// Main interface
const SAT = (t, pks = ['id']) => client && {
  // basic
  get: (k, cols = []) => client.getRow({ ...params(k, null, t, pks), columnsToGet: cols }).then(({ row }) => wrap(k, row, pks)),
  put: (k, attrs, c = 'I') => client.putRow({ ...params(k, c, t, pks), attributeColumns: columns(attrs, pks) }),
  del: (k, c = 'I') => client.deleteRow(params(k, c, t, pks)),
  // advanced
  getRange: async (start, end, cols = []) => {
    let next = start, res = {}
    while (next) {
      const data = await client.getRange({ tableName: t, columnsToGet: cols, direction: 'FORWARD', inclusiveStartPrimaryKey: pk(next, pks), exclusiveEndPrimaryKey: pk(end, pks) })
      wrapRows(data.rows, pks, res)
      next = data.nextStartPrimaryKey && data.nextStartPrimaryKey.map(x => x.value)
    }
    return res
  },
  getBatch: async (ks, cols = []) => {
    const res = {}, kst = [...ks], opts = []
    while (kst.length) {
      const ksp = kst.splice(0, 100)
      opts.push(client.batchGetRow({ tables: [{ tableName: t, primaryKey: ksp.map(x => pk(x, pks)), columnsToGet: cols }] }))
    }
    const vs = await Promise.all(opts)
    for (const v of vs) wrapRows(v.tables[0], pks, res)
    return res
  },
  update: (k, attrs, c = 'I') => client.updateRow({ ...params(k, c, t, pks), updateOfAttributeColumns: attrColumns(attrs, pks) }),
  writeBatch: rows => {
    const rowst = [...rows], opts = []
    while (rowst.length) {
      const rowsp = rowst.splice(0, 100)
      opts.push(client.batchWriteRow({ tables: [{ tableName: t, rows: rowsp.map(r => ({ type: r[0].toUpperCase() === 'DEL' ? 'DELETE' : r[0].toUpperCase(), attributeColumns: r[0].toUpperCase() === 'UPDATE' ? attrColumns(r[2], pks) : columns(r[2], pks), ...params(r[1], r[3] || 'I', t, pks) })) }] }))
    }
    return Promise.all(opts)
  },
  search: async (i, q) => {
    const res = {}, query = { queryType: 3, query: { fieldName: q[0], term: int2Long(q[1]) } }
    let nextToken = undefined
    do {
      const data = await client.search({ tableName: t, indexName: i, searchQuery: { limit: 100, query, token: nextToken }, columnToGet: { returnType: 1 } })
      wrapRows(data.rows, pks, res)
      nextToken = data.nextToken
    } while (nextToken.toString('base64'))
    return res
  }
}

module.exports = SAT

SAT.init = (endpoint, instancename, accessKeyId, accessKeySecret, securityToken) => client = new TS.Client({ endpoint, instancename, accessKeyId, accessKeySecret, securityToken })

SAT.client = c => c ? client = c : client

SAT.utils = { int2Long, condition, pk, params, wrap, wrapRows, columns, attrColumns }