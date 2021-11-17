const TS = require('tablestore')

let client = null

exports.init = (endpoint, instancename, accessKeyId, accessKeySecret, securityToken) => client = new TS.Client({ endpoint, instancename, accessKeyId, accessKeySecret, securityToken })

exports.client = c => c ? client = c : client

// utils functions
const params = (k, t, c) => ({ tableName: t, primaryKey: [{ id: k }], condition: c && new TS.Condition(TS.RowExistenceExpectation[c], null) })

const wrap = (k, row) => {
  const res = { id: k }
  for (const a of row.attributes) {
    const v = a.columnValue
    res[a.columnName] = typeof v === 'object' ? v.toNumber() : v
  }
  return res
}

exports.table = (table) => client && {
  get: (k, cols = []) => client.getRow({ ...params(k, table), columnsToGet: cols }).then(({ row }) => wrap(k, row))
}
