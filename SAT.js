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
const condition = c => {
  if (typeof c == 'string') c = [c]
  const rc = c.shift()
  c.map(x => new TS.SingleColumnCondition(x[0], x[2], constants[x[1]]))
  let colCond = null
  if (c.length) {
    if (c.length > 1) {
      colCond = new TS.CompositeCondition(constants.AND)
      for (const cc of c) colCond.addSubCondition(cc)
    } else colCond = c[0]
  }
  return new TS.Condition(constants[rc], colCond)
}

const params = (k, t, c) => ({ tableName: t, primaryKey: [{ id: k }], condition: c && condition(c) })

const wrap = (k, row) => {
  const res = { id: k }
  for (const a of row.attributes) {
    const v = a.columnValue
    res[a.columnName] = typeof v === 'object' ? v.toNumber() : v
  }
  return res
}

const columns = attrs => {
  const res = []
  for (const k in attrs) {
    res.push({ [k]: Number.isInteger(a[k]) ? TS.Long.fromNumber(a[k]) : a[k] })
  }
  return res
}

// Main interface
exports.table = (t) => client && {
  get: (k, cols = []) => client.getRow({ ...params(k, t), columnsToGet: cols }).then(({ row }) => wrap(k, row)),
  put: (k, attrs, c = 'I') => client.putRow({ ...params(k, t, c), attributeColumns: columns(attrs) }),
  del: (k, c = 'I') => client.deleteRow(params(k, t, c))
}
