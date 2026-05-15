const MAX_HISTORY_MESSAGES = 20;
const SESSION_TTL_MS = 1000 * 60 * 60 * 2;

const conversations = new Map();

const createConversationState = () => ({
  booking: {
    serviceId: '',
    serviceName: '',
    appointmentDate: '',
    appointmentTime: '',
    licensePlate: '',
    brand: '',
    customerRequirements: '',
    note: '',
    model: '',
    color: '',
    vin: '',
    year: ''
  }
});

const createConversationId = () => {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const now = () => Date.now();

const isExpired = (conversation) => {
  if (!conversation?.updatedAt) {
    return true;
  }

  return now() - conversation.updatedAt > SESSION_TTL_MS;
};

const getConversation = (conversationId) => {
  const id = conversationId || createConversationId();
  const existingConversation = conversations.get(id);

  if (!existingConversation || isExpired(existingConversation)) {
    const freshConversation = {
      id,
      history: [],
      state: createConversationState(),
      updatedAt: now()
    };

    conversations.set(id, freshConversation);
    return freshConversation;
  }

  return existingConversation;
};

const appendMessages = (conversationId, messages = []) => {
  const conversation = getConversation(conversationId);
  const nextHistory = [...conversation.history, ...messages]
    .filter((item) => item && typeof item.content === 'string' && ['user', 'assistant'].includes(item.role))
    .slice(-MAX_HISTORY_MESSAGES)
    .map((item) => ({
      role: item.role,
      content: item.content.trim()
    }));

  const nextConversation = {
    ...conversation,
    history: nextHistory,
    updatedAt: now()
  };

  conversations.set(nextConversation.id, nextConversation);
  return nextConversation;
};

const resetConversation = (conversationId) => {
  if (conversationId) {
    conversations.delete(conversationId);
  }
};

const getConversationHistory = (conversationId) => {
  return getConversation(conversationId).history;
};

const getConversationState = (conversationId) => {
  return getConversation(conversationId).state || createConversationState();
};

const patchConversationState = (conversationId, patch = {}) => {
  const conversation = getConversation(conversationId);
  const currentState = conversation.state || createConversationState();

  const nextState = {
    ...currentState,
    ...patch,
    booking: {
      ...currentState.booking,
      ...(patch.booking || {})
    }
  };

  const nextConversation = {
    ...conversation,
    state: nextState,
    updatedAt: now()
  };

  conversations.set(nextConversation.id, nextConversation);
  return nextState;
};

module.exports = {
  appendMessages,
  createConversationId,
  getConversationHistory,
  getConversation,
  getConversationState,
  patchConversationState,
  resetConversation
};
