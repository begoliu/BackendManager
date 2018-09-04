'use strict'
require('./db')

require('express-async-errors')  // 放到最前面引入
let express = require('express');
let bodyParser = require('body-parser');
let morgan = require('morgan');
let config = require('./config');

let app = express();

// 注册日志中间件
app.use(morgan('combined'));
// 注册body-parser中间件
app.use(bodyParser.json());

// 注册自定义的中间件
app.use(require('./middleware/res_md'));
app.use(require('./middleware/token_md'));  // token认证的中间件
app.use(require('./middleware/permission_md'));  // 权限检查的中间件

// 注册路由
app.use("/user", require('./router/user'));
app.use("/category", require('./router/category'));
app.use("/product", require('./router/product'));
app.use("/order", require('./router/order'));

// 异常处理中间件
app.use((err, req, res, next) => {
    res.fail(err.toString());
});

app.listen(config.PORT);

