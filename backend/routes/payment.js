const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const moment = require('moment');
const pool = require('../db');

// POST /api/payment/create-url (VNPAY)
router.post('/create-url', async (req, res) => {
    try {
        const { amount, returnUrl } = req.body;

        // Find wallet_id for the user
        const walletRes = await pool.query('SELECT id FROM wallets WHERE user_id = $1', [req.user.userId]);
        if (walletRes.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Ví không tồn tại' });
        }
        const wId = String(walletRes.rows[0].id);

        const tmnCode = process.env.VNPAY_TMN_CODE || 'DEMO1234';
        const secretKey = process.env.VNPAY_SECRET_KEY || 'DEMOSECRETKEY1234567890';
        let vnpUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        
        let rawIp = req.headers['x-forwarded-for'] || (req.socket ? req.socket.remoteAddress : null) || '127.0.0.1';
        if (typeof rawIp === 'string' && rawIp.includes(',')) rawIp = rawIp.split(',')[0].trim();
        if (typeof rawIp === 'string' && rawIp.startsWith('::ffff:')) rawIp = rawIp.slice(7);
        if (rawIp === '::1') rawIp = '127.0.0.1';
        const ipAddr = rawIp || '127.0.0.1';

        const date = new Date();
        const createDate = moment(date).format('YYYYMMDDHHmmss');
        const orderId = moment(date).format('DDHHmmss'); 

        // Tất cả value PHẢI là String
        let vnp_Params = {};
        vnp_Params['vnp_Version']    = '2.1.0';
        vnp_Params['vnp_Command']    = 'pay';
        vnp_Params['vnp_TmnCode']    = tmnCode;
        vnp_Params['vnp_Locale']     = 'vn';
        vnp_Params['vnp_CurrCode']   = 'VND';
        vnp_Params['vnp_TxnRef']     = orderId;
        vnp_Params['vnp_OrderInfo']  = wId;
        vnp_Params['vnp_OrderType']  = 'topup';
        vnp_Params['vnp_Amount']     = String(amount * 100);
        vnp_Params['vnp_ReturnUrl']  = returnUrl;
        vnp_Params['vnp_IpAddr']     = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;

        // Sắp xếp key theo alphabet rồi tự build query string (không qua thư viện)
        const sortedKeys = Object.keys(vnp_Params).sort();
        const signParts = [];
        const urlParts  = [];
        for (const key of sortedKeys) {
            const val = vnp_Params[key];
            const encKey = encodeURIComponent(key);
            const encVal = encodeURIComponent(String(val)).replace(/%20/g, '+');
            signParts.push(encKey + '=' + encVal);
            urlParts.push(encKey + '=' + encVal);
        }
        const signData = signParts.join('&');

        const hmac = crypto.createHmac('sha512', secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        urlParts.push('vnp_SecureHash=' + signed);
        const finalUrl = vnpUrl + '?' + urlParts.join('&');

        console.log('[VNPAY] tmnCode:', tmnCode, '| secretKey length:', secretKey.length);
        console.log('[VNPAY] signData:', signData);
        console.log('[VNPAY] finalUrl:', finalUrl);

        res.json({ success: true, url: finalUrl });
    } catch (e) {
        console.error('Create VNPAY URL Error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/payment/vnpay-ipn
router.get('/vnpay-ipn', async (req, res) => {
    try {
        let vnp_Params = { ...req.query };
        const secureHash = vnp_Params['vnp_SecureHash'];
        const amount = vnp_Params['vnp_Amount'] / 100;
        const orderId = vnp_Params['vnp_TxnRef'];
        const responseCode = vnp_Params['vnp_ResponseCode'];
        const walletId = vnp_Params['vnp_OrderInfo']; 

        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];

        // Sắp xếp key theo alphabet rồi tự build query string
        const sortedKeys = Object.keys(vnp_Params).sort();
        const signParts = [];
        for (const key of sortedKeys) {
            const encKey = encodeURIComponent(key);
            const encVal = encodeURIComponent(String(vnp_Params[key])).replace(/%20/g, '+');
            signParts.push(encKey + '=' + encVal);
        }
        const signData = signParts.join('&');

        const secretKey = process.env.VNPAY_SECRET_KEY || 'DEMOSECRETKEY1234567890';
        const hmac = crypto.createHmac('sha512', secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

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
