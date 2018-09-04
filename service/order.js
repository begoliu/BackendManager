'use strict'

let Order = require('../model/order');
let productService = require('../service/product');
let Big = require('big.js');
let config = require('../config');

/**
 * order: {productId: 'cccc', count: 2}
 * @param order
 * @returns {Promise<*>}
 */
async function addOrder(order) {
    // 1.判断productId是否存在
    let p = await productService.getProductById(order.productId);

    //2.库存判断
    if(p.stock < order.count){
        throw Error("商品库存不够")
    }

    //3.给order的字段进行复制
    order.productName = p.name;
    order.productPrice = p.price;
    order.totalPrice = Big(order.productPrice).times(order.count)

    let o = await Order.create(order);

    //4. 减库存
    await productService.updateProduct(p._id, {stock: p.stock-order.count})

    return o
}

/**
 * 分页获取订单信息
 * @param page
 * @returns {Promise<void>}
 */
async function getOrdersByPage(page = 1) {
    return await Order.find().skip( (page-1)*config.PageCount ).limit(config.PageCount)
        .sort("created").select("-__v")
}

module.exports = {
    addOrder,
    getOrdersByPage
}