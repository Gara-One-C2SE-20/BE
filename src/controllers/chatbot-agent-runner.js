const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');
const { ChatOpenAI } = require('@langchain/openai');
const { StateGraph, MessagesAnnotation, START, END } = require('@langchain/langgraph');
const { ToolNode } = require('@langchain/langgraph/prebuilt');
const {
  getServices,
  findServicesByQuery,
  getMyAppointments,
  findAppointmentsByQuery,
  checkSlotAvailability,
  buildBookingPrefillUrl
} = require('./chatbot-functions');
const { createMemoryTools } = require('./chatbot-memory-tools');

const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
const openaiBaseUrl = process.env.OPENAI_BASE_URL?.trim();
const chatModel = process.env.OPENAI_CHAT_MODEL?.trim() || 'gpt-4.1';

const SYSTEM_PROMPT = `Bạn là trợ lý GaraOne.

Bạn chỉ hỗ trợ các việc liên quan đến:
- tình trạng xe và chẩn đoán sơ bộ
- dịch vụ gara
- đặt lịch
- lịch hẹn và trạng thái

Nguyên tắc:
- Trả lời tiếng Việt, tự nhiên, linh hoạt, dễ hiểu.
- Không bịa dữ liệu thật. Khi cần dữ liệu thật thì gọi tool.
- Không cần lúc nào cũng gợi ý dịch vụ. Chỉ gợi ý khi thật sự hữu ích hoặc khi người dùng muốn xử lý tiếp.
- Khi người dùng hỏi về tình trạng xe, ưu tiên giải thích nguyên nhân hoặc hướng kiểm tra trước.
- Nếu người dùng muốn đặt lịch, hỏi đúng phần thông tin còn thiếu và dùng bộ nhớ hội thoại.
- Nếu ngoài phạm vi gara/ô tô thì từ chối ngắn gọn.

Tên tool:
- get_services, find_services
- get_my_appointments, find_appointments
- check_slot_availability, create_booking_link
- get_current_time, get_booking_memory, save_booking_memory, clear_booking_memory, add_days, make_datetime`;

const getModel = () => {
  if (!openaiApiKey) {
    return null;
  }

  return new ChatOpenAI({
    model: chatModel,
    temperature: 0.2,
    apiKey: openaiApiKey,
    ...(openaiBaseUrl ? { configuration: { baseURL: openaiBaseUrl } } : {})
  });
};

const toMessage = (item) => item.role === 'assistant'
  ? new AIMessage(item.content)
  : new HumanMessage(item.content);

const normalizeReplyText = (content) => {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }

        return part?.type === 'text' ? part.text || '' : '';
      })
      .join('')
      .trim();
  }

  return '';
};

const compactRichReply = (result = {}) => ({
  ...result,
  reply: normalizeReplyText(result.reply)
});

const createRuntime = () => ({
  serviceCards: [],
  appointmentCards: [],
  bookingUrl: '',
  suggestedTimes: []
});

const createBusinessTools = ({ userId, runtime }) => {
  const requireUser = () => {
    if (!userId) {
      const error = new Error('UNAUTHORIZED');
      error.statusCode = 401;
      throw error;
    }
  };

  return [
    tool(
      async () => {
        requireUser();
        const serviceCards = await getServices();
        runtime.serviceCards = serviceCards;
        return JSON.stringify({
          summary: `Đã tìm thấy ${serviceCards.length} dịch vụ.`,
          serviceCards: serviceCards.map((item) => ({ serviceId: item.serviceId, name: item.name }))
        });
      },
      {
        name: 'get_services',
        description: 'Lấy danh sách dịch vụ để giới thiệu tổng quan cho người dùng.',
        schema: z.object({})
      }
    ),
    tool(
      async ({ query }) => {
        requireUser();
        const serviceCards = await findServicesByQuery(query);
        runtime.serviceCards = serviceCards;
        return JSON.stringify({
          query,
          summary: serviceCards.length ? 'Đã tìm thấy dịch vụ phù hợp.' : 'Chưa tìm thấy dịch vụ phù hợp.',
          serviceCards: serviceCards.map((item) => ({ serviceId: item.serviceId, name: item.name }))
        });
      },
      {
        name: 'find_services',
        description: 'Tìm dịch vụ phù hợp theo vấn đề xe, hạng mục cần làm hoặc nhu cầu bảo dưỡng.',
        schema: z.object({
          query: z.string().min(1)
        })
      }
    ),
    tool(
      async () => {
        requireUser();
        const result = await getMyAppointments(userId);
        runtime.appointmentCards = Array.isArray(result.appointmentCards) ? result.appointmentCards : [];
        return JSON.stringify({
          summary: result.message || '',
          appointmentCards: runtime.appointmentCards.map((item) => ({
            id: item.id,
            plate: item.plate,
            date: item.date,
            status: item.status
          }))
        });
      },
      {
        name: 'get_my_appointments',
        description: 'Lấy các lịch hẹn gần đây của chính người dùng đang đăng nhập.',
        schema: z.object({})
      }
    ),
    tool(
      async ({ query }) => {
        requireUser();
        const result = await findAppointmentsByQuery(userId, query);
        runtime.appointmentCards = Array.isArray(result.appointmentCards) ? result.appointmentCards : [];
        return JSON.stringify({
          summary: result.summary || result.message || '',
          appointmentCards: runtime.appointmentCards.map((item) => ({
            id: item.id,
            plate: item.plate,
            date: item.date,
            status: item.status
          }))
        });
      },
      {
        name: 'find_appointments',
        description: 'Tìm lịch hẹn theo biển số, ngày, trạng thái, hãng xe, ghi chú hoặc yêu cầu.',
        schema: z.object({
          query: z.string().min(1)
        })
      }
    ),
    tool(
      async ({ appointmentDateTime }) => {
        requireUser();
        const appointmentDate = new Date(appointmentDateTime);
        const result = Number.isNaN(appointmentDate.getTime())
          ? { available: false, reason: 'invalid_time', message: 'Ngày giờ không hợp lệ.' }
          : await checkSlotAvailability(appointmentDate);

        if (Array.isArray(result.suggestedTimes) && result.suggestedTimes.length) {
          runtime.suggestedTimes = result.suggestedTimes;
        }

        return JSON.stringify({
          available: Boolean(result.available),
          reason: result.reason || '',
          message: result.message || ''
        });
      },
      {
        name: 'check_slot_availability',
        description: 'Kiểm tra một khung giờ cụ thể còn trống hay không từ datetime ISO +07:00.',
        schema: z.object({
          appointmentDateTime: z.string().min(1)
        })
      }
    ),
    tool(
      async (input) => {
        requireUser();
        const result = await buildBookingPrefillUrl(input);
        runtime.bookingUrl = result.bookingUrl || '';
        runtime.suggestedTimes = Array.isArray(result.suggestedTimes) ? result.suggestedTimes : [];

        return JSON.stringify({
          available: Boolean(result.available),
          bookingUrl: Boolean(result.bookingUrl),
          message: result.message || '',
          missingFields: result.missingFields || [],
          suggestedTimes: runtime.suggestedTimes
        });
      },
      {
        name: 'create_booking_link',
        description: 'Tạo link đặt lịch nhanh khi đã có ngày, giờ, biển số. Có thể truyền thêm serviceId, brand, customerRequirements, note và các trường xe khác nếu có.',
        schema: z.object({
          serviceId: z.string().optional(),
          appointmentDate: z.string().min(1),
          appointmentTime: z.string().min(1),
          licensePlate: z.string().min(1),
          brand: z.string().optional(),
          customerRequirements: z.string().optional(),
          note: z.string().optional(),
          model: z.string().optional(),
          color: z.string().optional(),
          vin: z.string().optional(),
          year: z.string().optional()
        })
      }
    )
  ];
};

const buildGraph = (model, tools) => {
  const modelWithTools = model.bindTools(tools);
  const toolNode = new ToolNode(tools);

  const callModel = async (state) => {
    const response = await modelWithTools.invoke(state.messages);
    return { messages: [response] };
  };

  const shouldContinue = (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    return lastMessage?.tool_calls?.length ? 'tools' : END;
  };

  return new StateGraph(MessagesAnnotation)
    .addNode('agent', callModel)
    .addNode('tools', toolNode)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue)
    .addEdge('tools', 'agent')
    .compile();
};

const runChatbotAgent = async ({ history, message, conversationId, userId }) => {
  const model = getModel();
  if (!model) {
    throw new Error('OPENAI_NOT_CONFIGURED');
  }

  const runtime = createRuntime();
  const tools = [
    ...createMemoryTools({ conversationId }),
    ...createBusinessTools({ userId, runtime })
  ];

  const graph = buildGraph(model, tools);
  const state = await graph.invoke({
    messages: [
      new SystemMessage(SYSTEM_PROMPT),
      ...history.map(toMessage),
      new HumanMessage(message)
    ]
  });

  const finalMessage = [...state.messages].reverse().find((item) => item instanceof AIMessage);
  const result = compactRichReply({
    reply: normalizeReplyText(finalMessage?.content || ''),
    serviceCards: runtime.serviceCards,
    appointmentCards: runtime.appointmentCards,
    bookingUrl: runtime.bookingUrl,
    suggestedTimes: runtime.suggestedTimes
  });

  return {
    reply: result.reply || '',
    serviceCards: result.serviceCards,
    appointmentCards: result.appointmentCards,
    bookingUrl: result.bookingUrl,
    suggestedTimes: result.suggestedTimes
  };
};

module.exports = {
  runChatbotAgent
};
