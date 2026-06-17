const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const moment = require('moment');
const querystring = require('qs');
const pool = require('../db');

function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj){
        if (Object.prototype.hasOwnProperty.call(obj, key)) { str.push(encodeURIComponent(key)); }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

// POST /api/payment/create-url (VNPAY)
router.post('/create-url', async (req, res) => {
    try {
        const { amount, returnUrl } = req.body;
        const walletId = req.user.userId; // user_id is the primary key for wallets mapping in our design, but wait!
        
        // Find wallet_id for the user
        const walletRes = await pool.query('SELECT id FROM wallets WHERE user_id = $1', [req.user.userId]);
        if (walletRes.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'VÃ­ khÃ´ng tá»“n táº¡i' });
        }
        const wId = walletRes.rows[0].id;

        const tmnCode = process.env.VNPAY_TMN_CODE || 'DEMO1234';
        const secretKey = process.env.VNPAY_SECRET_KEY || 'DEMOSECRETKEY1234567890';
        let vnpUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        
        const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;

        let date = new Date();
        let createDate = moment(date).format('YYYYMMDDHHmmss');
        let orderId = moment(date).format('DDHHmmss'); 

        let vnp_Params = {
            'vnp_Version': '2.1.0',
            'vnp_Command': 'pay',
            'vnp_TmnCode': tmnCode,
            'vnp_Locale': 'vn',
            'vnp_CurrCode': 'VND',
            'vnp_TxnRef': orderId,
            'vnp_OrderInfo': wId, // Save walletId here to know who to deposit to
            'vnp_OrderType': 'topup',
            'vnp_Amount': amount * 100, 
            'vnp_ReturnUrl': returnUrl,
            'vnp_IpAddr': ipAddr,
            'vnp_CreateDate': createDate
        };

        vnp_Params = sortObject(vnp_Params);
        const signData = querystring.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac("sha512", secretKey);
        const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest("hex"); 
        
        vnp_Params['vnp_SecureHash'] = signed;
        vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

        res.json({ success: true, url: vnpUrl });
    } catch (e) {
        console.error('Create VNPAY URL Error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/payment/vnpay-ipn
router.get('/vnpay-ipn', async (req, res) => {
    try {
        let vnp_Params = req.query;
        const secureHash = vnp_Params['vnp_SecureHash'];
        const amount = vnp_Params['vnp_Amount'] / 100;
        const orderId = vnp_Params['vnp_TxnRef'];
        const responseCode = vnp_Params['vnp_ResponseCode'];
        const walletId = vnp_Params['vnp_OrderInfo']; 

        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

        vnp_Params = sortObject(vnp_Params);
        const secretKey = process.env.VNPAY_SECRET_KEY || 'DEMOSECRETKEY1234567890';
        const signData = querystring.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac("sha512", secretKey);
        const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest("hex");     

        if (secureHash !== signed) {
            return res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
        }

        if (responseCode !== '00') {
             return res.status(200).json({ RspCode: '00', Message: 'Success processing failed transaction' });
        }

        // Call RPC process_deposit
        const dbRes = await pool.query('SELECT process_deposit($1, $2, $3, $4) AS success', [walletId, amount, 'VNPAY', orderId]);
        const isSuccess = dbRes.rows[0].success;

        if (!isSuccess) {
             return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
        }

        res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
    } catch (err) {
        console.error('IPN Error:', err);
        res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
    }
});

module.exports = router;

