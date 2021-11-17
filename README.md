# simple-aliyun-tablestore (SAT)

阿里云表格存储功能强大，因而API非常繁琐，在只需要完成简单的数据存储功能时非常麻烦。此项目对阿里云的表格存储Nodejs SDK进行简化封装，用一部分功能的代价换取简单方便的接口，方便敏捷开发。此项目**省略的功能**包括：
1. 版本：不考虑多版本表格，也不考虑数据写入的时间戳。
2. 主键：主键永远是`id`。
3. 表操作：不支持对表的操作，仅支持对数据的读写。
4. 整数：整数数字会被自动转化位整数类型。

## 开始使用

为了支持函数计算等应用场景，请直接复制`/SAT.js`。

```js
const SAT = require('./SAT.js')

SAT.init('endpoint', 'instance', 'akId', 'akSecret')

async function test () {
  const res = await SAT.table('tablename').get('rowid')
  console.log(res)
}
test()
```
