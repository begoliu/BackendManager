'use strict'
let User = require('../model/user');
let crypto = require('lxj-crypto');
let config = require('../config');

// 获取用户信息
async function getUserInfo(username) {
    let res = await User.findOne({username: username}).select("-__v -password");
    if (!res) {
        throw Error(`用户名为${username}的用户不存在`)
    }
    return res;
}

/**
 * 根据username来判断用户是否存在
 * @param username
 * @returns {Promise<void>}
 */
async function isUserExist(username) {
    let res = await User.findOne({username: username});
    if (!res) {
        throw Error(`用户名为${username}的用户不存在`)
    }
}

// 删除用户
async function deleteUser(username) {
    await isUserExist(username)

    // res: {n:1, mModify:1, ok: 1}
    let res = await User.deleteOne({username: username});
    if (res.n < 1) {
        throw Error("删除失败")
    }
}

// 注册 user: { username: xxx, password: xx, age: 11, role: 100}
async function registerUser(user) {
    let res = await User.findOne({username: user.username});
    if (res) {
        throw Error(`用户名为${user.username}的用户已经存在`)
    }

    //密码加密的操作
    user.password = crypto.sha1Hmac(user.password, user.username);
    user.role = 0; // 默认是商家用户
    user.created = Date.now();

    // 存库操作
    res = await User.create(user);
    res.password = ''
    return res
}

// 登录 user: {username: xxx, password: 'xxx'}
async function loginUser(user) {
    //1.对密码进行加密
    user.password = crypto.sha1Hmac(user.password, user.username)

    //2.去数据库查询是否存在
    let res = await User.findOne({username: user.username, password: user.password});
    if (!res) {
        throw Error("用户名或者密码错误")
    }

    //3. 给用户生成一个token，可以用aes算法生成
    let tokenData = {
        username: user.username,
        expire: Date.now() + config.TokenExpire
    };

    let token = crypto.aesEncrypt(JSON.stringify(tokenData), config.TokenKey);
    return token
}


module.exports = {
    registerUser,
    getUserInfo,
    deleteUser,
    loginUser
}