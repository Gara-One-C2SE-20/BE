const jwt = require('jsonwebtoken');
const { ApiRes } = require('../utils/response');
const {
    appendMessages,
    createConversationId,
    getConversationHistory,
    resetConversation
} = require('../services/chatbot-session.service');
const { runChatbotAgent } = require('./chatbot-agent-runner');

const resolveUserFromToken = (reqHeaders = {}) => {
    const authHeader = reqHeaders.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        return null;
    }

    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return null;
    }
};

const pickConversationId = (reqBody = {}, reqHeaders = {}) => {
    const fromBody = typeof reqBody.conversationId === 'string' ? reqBody.conversationId.trim() : '';
    const fromHeader = typeof reqHeaders['x-chat-session-id'] === 'string' ? reqHeaders['x-chat-session-id'].trim() : '';

    return fromBody || fromHeader || createConversationId();
};

const normalizeHistory = (history = []) => {
    if (!Array.isArray(history)) {
        return [];
    }

    return history
        .filter((item) => item && typeof item.content === 'string' && ['user', 'assistant'].includes(item.role))
        .slice(-12)
        .map((item) => ({
            role: item.role,
            content: item.content.trim()
        }))
        .filter((item) => item.content);
};

const buildResponsePayload = (conversationId, result = {}) => ({
    conversationId,
    reply: result.reply || 'Mình chưa có phản hồi phù hợp.',
    serviceCards: Array.isArray(result.serviceCards) && result.serviceCards.length ? result.serviceCards : undefined,
    appointmentCards: Array.isArray(result.appointmentCards) && result.appointmentCards.length ? result.appointmentCards : undefined,
    bookingUrl: result.bookingUrl || undefined,
    suggestedTimes: Array.isArray(result.suggestedTimes) && result.suggestedTimes.length ? result.suggestedTimes : undefined
});
// xử lý tin nhắn từ người dùng, trả về phản hồi từ chatbot 
const handleChatMessage = async(req, res) => {
    try {
        const { message, history = [] } = req.body || {};
        const conversationId = pickConversationId(req.body || {}, req.headers || {});
        const user = resolveUserFromToken(req.headers || {});

        if (!user || !user.id) {
            return ApiRes.success(res, 'Chưa đăng nhập', {
                conversationId,
                reply: 'Vui lòng **đăng nhập** để sử dụng dịch vụ tư vấn miễn phí của GaraOne nhé!'
            });
        }

        if (!message || !String(message).trim()) {
            return ApiRes.badRequest(res, 'Tin nhắn không được để trống.');
        }

        const trimmedMessage = String(message).trim();
        const savedHistory = getConversationHistory(conversationId);
        const incomingHistory = normalizeHistory(history);
        const mergedHistory = savedHistory.length ? savedHistory : incomingHistory;

        const result = await runChatbotAgent({
            history: mergedHistory,
            message: trimmedMessage,
            conversationId,
            userId: user.id
        });

        const finalReply = result.reply || 'Mình chưa có phản hồi phù hợp.';

        appendMessages(conversationId, [
            { role: 'user', content: trimmedMessage },
            { role: 'assistant', content: finalReply }
        ]);

        return ApiRes.success(res, 'Đã trả lời', buildResponsePayload(conversationId, {
            ...result,
            reply: finalReply
        }));
    } catch (err) {
        console.error('Chatbot error:', err);

        const conversationId = pickConversationId(req.body || {}, req.headers || {});
        const reply = 'Mình chưa xử lý được yêu cầu ngay lúc này. Bạn thử lại sau nhé.';

        appendMessages(conversationId, [
            { role: 'user', content: String(req.body ? .message || '').trim() },
            { role: 'assistant', content: reply }
        ]);

        return ApiRes.success(res, 'Lỗi', {
            conversationId,
            reply
        });
    }
};

const resetChatSession = (req, res) => {
    const user = resolveUserFromToken(req.headers || {});

    if (!user || !user.id) {
        return ApiRes.unauthorized(res, 'Vui lòng đăng nhập để sử dụng chatbot.');
    }

    const conversationId = pickConversationId(req.body || {}, req.headers || {});
    resetConversation(conversationId);

    return ApiRes.success(res, 'Đã xóa hội thoại', {
        conversationId,
        reply: 'Mình đã xóa lịch sử chat. Bạn có thể bắt đầu cuộc trò chuyện mới.'
    });
};

module.exports = {
    handleChatMessage,
    resetChatSession
};