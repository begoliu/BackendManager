## 电商管理后台

>目标，实现一个有账户模块，权限模块，商品和分类模块和订单模块，给商家和管理员使用的后台系统。
>
>项目采用前后端分离的开发方式，本身只实现API功能，并没有提供界面。



### 1 - 项目结构搭建和实施流程

> 创建 `middleware`, `model`, `router`, `service` 各种包

`middleware` : 用来存放中间件的包，因为权限管理需要用中间件来实现

每个模块的实现顺序为：model层 --> service层 --> router层

### 2 - 配置文件的环境切换

开发环境和生产环境的配置一般是不一样的，比如端口配置，数据库配置。一般我们是通过环境变量`NODE_ENV`来区分。为了能够动态切换配置，就需要根据当前`NODE_ENV`的值来加载不同的配置对象。

做法就是：

- 建立config目录，创建`dev.js`和`prod.js`分别存放对应的配置信息
- 编写`index.js`，实现动态切换配置的逻辑。



###3 - 编写入口文件

**添加依赖** 

```bash
npm i body-parser express express-async-errors mongoose morgan
```

编写`app.js`和`db.js`文件。

```js
//引入dib
require('./db')

const config = require('./config');
const morgan = require('morgan')
const bodyParser = require('body-parser');
const express = require('express')
// 引入异常捕获处理
require('express-async-errors');

const app = express();

//注册中间件
// log中间件
app.use(morgan('combined'));

//注册自定义的中间件

// 注册body-parser中间件
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

// 注册路由
app.use("/users", require('./router/account'));

// 注册异常处理中间件
app.use((err, req, res, next)=>{
    res.fail(err.toString())
});

//启动
app.listen(config.PORT);
```

**db.js**

```
const config = require('./config');
const mongoose  = require('mongoose');
mongoose.connect(`mongodb://127.0.0.1/${config.DB}`);

const db = mongoose.connection;

db.on('error', (err)=>{
    console.log(err);
});

db.on("open", ()=>{
    console.log("mongodb connect successfully!");
});
```

### 4 - 账户模块

>先编写model，再service，最后router；最后对service和router进行测试。

**REST中间件**

> 为了方便进行REST结果的返回，我们编写一个`res_md.js`中间件，作用是给每个res对象安装2个方法，注意该中间件注册的顺序尽量放在前面。代码如下：

```js
module.exports = function (req, res, next) {
  res.success = (data = null) =>{
    res.send({
        code: 0,
        msg: "操作成功",
        data: data
    })
  };
  res.fail = (msg)=>{
    res.send({
        code: -1,
        msg: msg
    })
  };

  next();
};
```

 **账户model**

```js
const mongoose = require('mongoose')
const schema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "用户名不能缺少"]
    },
    password: {
        type: String,
        required: [true, "密码不能缺少"]
    },
    age: {
        type: Number,
        min: [0, "年龄不能小于0"],
        max: [120, "年龄不能大于120"]
    },
    role: {
        type: Number,
        default: 0 // 0是商家， 10086是管理员
    },
    created:{
        type: Date,
        default: Date.now()
    }
});

module.exports = mongoose.model('user', schema);
```

**账户service**

```js
const User = require('../model/user');
const config = require('../config')
const crypto = require('lxj-crypto')

/**
 * 根据用户名获取某个用户
 * @param username
 * @returns {Promise<*>}
 */
async function getUserByUsername(username) {
    return await User.findOne({username: username}).select("-__v")
}


async function checkCanInsertUser(user) {
    //检查密码是否为空
    if(!user.password || user.password.length===0){ 
        throw Error("密码不能为空")
    }
    //检查用户是否已经存在
    let res = await getUserByUsername(user.username);
    if(res){
        throw Error("用户名已经存在")
    }
}


/**
 * 添加普通用户
 * @param user
 * @returns {Promise<void>}
 */
async function addUser(user) {
    await checkCanInsertUser(user);

    user.role = 0;
    user.created = Date.now();

    //对密码进行加密,加密的方式：使用username作为随机数对password进行哈希
    user.password = crypto.md5Hmac(user.password, user.username)
    await User.create(user)
}

async function deleteUser(id) {
    let res = await User.deleteOne({_id:id});
    if(!res || res.n===0){
        throw Error("删除用户失败")
    }
}

/**
 * 登录的方法
 * @param user
 * @returns token
 */
async function login(user) {
    // 1. 对密码进行加密
    user.password = crypto.md5Hmac(user.password, user.username)
    // 2. 进行查询
    let res = await User.findOne({username:user.username, password: user.password});
    if(!res){
        throw Error("用户名或者密码错误")
    }

    // 说明用户名和密码验证成功，需要生产token返回给客户端，以后客户端的header中带上这个token
    // token 生产方法：用aes进行对指定的data加密
    let tokenData = {
        username: user.username,
        expire: Date.now() + config.TokenDuration
    };
    let token = crypto.aesEncrypt(JSON.stringify(tokenData), config.TokenKey);
    return token
}

module.exports = {
    getUserByUsername,
    addUser, 
    deleteUser,
    login
};
```

**账户router**

```js
let router = require("express").Router();
let accountService = require('../service/accout')


router.get("/:username", async (req, res)=>{
    let user = await accountService.getUserByUsername(req.params.username);
    res.success(user);
});

// 登录
router.post("/login", async (req, res)=>{
    let token = await accountService.login(req.body);
    res.success({token});
});

// 注册
router.post("/register", async (req, res)=>{
    await accountService.register(req.body)
    res.success()
});

router.delete("/:id", async (req, res)=>{
    await accountService.deleteUser(req.params.id)
    res.success()
});

module.exports = router;
```

### 5 - 类似

> 商品分类模块, 商品模块, 订单模块与账户模块相同,只是业务逻辑不一样



### 6 - 权限管理模块

主要分2个部分，一个是登录token认证，一个是权限管理。

1. token认证，就是指有的接口需要token才能访问，有的不需要。比如：登录和注册接口不需要token，但是商品的增删改查必须要token。
2. 权限管理是指，有的接口指定角色的用户才能调用，不是该角色的人应该直接报错。比如：用户信息获取和删除用户只能管理员角色操作，商家用户则没有这个权限。

这2个部分显然需要在每次请求前进行处理，所以应该用中间件实现。


