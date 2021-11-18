// https://github.com/yzITI/simple-aliyun-tablestore
// 2021-11-18
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
  'OR': 3, '||': 3
}

let client = null

exports.init = (endpoint, instancename, accessKeyId, accessKeySecret, securityToken) => client = new TS.Client({ endpoint, instancename, accessKeyId, accessKeySecret, securityToken })

exports.client = c => c ? client = c : client

// utils functions
const parseInt = v => Number.isInteger(v) ? TS.Long.fromNumber(v) : v

const condition = c => {
  if (typeof c == 'string') c = [c]
  const rc = c.shift()
  cs = c.map(x => new TS.SingleColumnCondition(x[0], parseInt(x[2]), constants[x[1]]))
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
  return pks.map((x, i) => ({ [x]: parseInt(ks[i]) }))
}

const params = (k, c, t, pks) => ({ tableName: t, primaryKey: pk(k, pks), condition: c && condition(c) })

const wrap = (k, row, pks) => {
  if (!row.attributes) return null
  const res = {}, ks = (k instanceof Array) ? k : [k] 
  for (let i = 0; i < pks.length; i++) res[pks[i]] = ks[i]
  for (const a of row.attributes) {
    const v = a.columnValue
    res[a.columnName] = typeof v === 'object' ? v.toNumber() : v
  }
  return res
}

const columns = as => {
  delete as.id
  const res = []
  for (const k in as) res.push({ [k]: parseInt(as[k]) })
  return res
}

// Main interface
exports.table = (t, pks = ['id']) => client && {
  // basic
  get: (k, cols = []) => client.getRow({ ...params(k, null, t, pks), columnsToGet: cols }).then(({ row }) => wrap(k, row, pks)),
  put: (k, attrs, c = 'I') => client.putRow({ ...params(k, c, t, pks), attributeColumns: columns(attrs) }),
  del: (k, c = 'I') => client.deleteRow(params(k, c, t, pks)),
  // advanced
  getRange: async (start, end, cols = []) => {
    let next = start, res = {}
    while (next) {
      const data = await client.getRange({
        tableName: t, columnsToGet: cols,
        direction: 'FORWARD',
        inclusiveStartPrimaryKey: pk(next, pks),
        exclusiveEndPrimaryKey: pk(end, pks)
      })
      for (const r of data.rows) {
        const k = r.primaryKey.map(x => x.value)
        res[k.join()] = wrap(k, r, pks)
      }
      next = data.nextStartPrimaryKey && data.nextStartPrimaryKey.map(x => x.value)
    }
    return res
  },
  update: (k, attrs, c = 'I') => {
    const dA = [], puts = {}, incs = {}
    for (const key in attrs) {
      const a = attrs[key]
      if (typeof a == 'object' && (a.del || a.inc)) {
        if (a.del) dA.push(key)
        if (a.inc) incs[key] = a.inc
      } else puts[key] = a
    }
    return client.updateRow({ ...params(k, c, t, pks), updateOfAttributeColumns: [{ 'PUT': columns(puts) }, {'DELETE_ALL': dA }, { 'INCREMENT': columns(incs) }] })
  },
  search: (query) => {
  }
}

// utils
exports.utils = { parseInt, condition, pk, params, wrap, columns }

