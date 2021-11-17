# simple-aliyun-tablestore (SAT)

阿里云表格存储功能强大，因而API非常繁琐，在只需要完成简单的数据存储功能时非常麻烦。此项目对阿里云的表格存储Nodejs SDK进行简化封装，用一部分功能的代价换取简单方便的接口，方便敏捷开发。此项目**省略的功能**包括：
1. 版本：不考虑多版本表格，也不考虑数据写入的时间戳。
2. 主键：主键永远是`id`。
3. 表操作：不支持对表的操作，仅支持对数据的读写。
4. 整数：整数数字会被自动转化为整数类型。

## 开始使用

为了支持函数计算等应用场景，请直接复制`/SAT.js`。

需要先安装官方的Nodejs SDK: `npm i tablestore`

```js
const SAT = require('./SAT.js')

SAT.init('endpoint', 'instance', 'akId', 'akSecret')

async function test () {
  const res = await SAT.table('tablename').get('rowid')
  console.log(res)
}
test()
```

## 约定

### 常量

新增了短的常量符号,与官方常量的对照关系如下：（官方的常量依然支持）
```
I   IGNORE
E   EXPECT_EXIST
NE  EXPECT_NOT_EXIST

==  EQUAL
!=  NOT_EQUAL
>   GREATER_THAN
>=  GREATER_EQUAL
<   LESS_THAN
<=  LESS_EQUAL

!   NOT
&&  AND
||  OR
```

### 条件

条件变量`c`可以描述行的存在条件，也可以同时描述列条件。常规情况下，`c`是一个如下格式的数组：
```js
c = ['E', ['num', '==', 10], ['space', '>', 10]]
```
数组首个元素是字符串，指定期望的行条件。从第二个元素开始，每个元素是一个长度为3的数组，描述一个列条件。多个列条件默认使用逻辑与连接。

上述例子中的条件表示：期望行存在 and num属性值等于10 and space属性值大于10

当不需要列条件时，条件变量`c`可以省略为一个字符串，描述期望的行条件。
