const express = require('express');
const { handleChatMessage, resetChatSession } = require('../controllers/chatbot.controler');

const router = express.Router();

router.post('/message', handleChatMessage);
router.post('/reset', resetChatSession);

module.exports = router;