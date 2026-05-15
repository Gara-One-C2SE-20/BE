const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const {
  getConversationState,
  patchConversationState
} = require('../services/chatbot-session.service');
const { getCurrentVietnamTime } = require('./chatbot-functions');

const emptyBookingMemory = () => ({
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
});

const getBookingMemory = (conversationId) => {
  const state = getConversationState(conversationId) || {};
  return {
    ...emptyBookingMemory(),
    ...(state.booking || {})
  };
};

const getMissingBookingFields = (booking = {}) => {
  const missingFields = [];

  if (!booking.appointmentDate) missingFields.push('appointmentDate');
  if (!booking.appointmentTime) missingFields.push('appointmentTime');
  if (!booking.licensePlate) missingFields.push('licensePlate');

  return missingFields;
};

const createMemoryTools = ({ conversationId }) => {
  const summarizeMemory = (booking) => JSON.stringify({
    booking,
    missingFields: getMissingBookingFields(booking)
  });

  return [
    tool(
      async () => JSON.stringify(getCurrentVietnamTime()),
      {
        name: 'get_current_time',
        description: 'Lấy thời gian hệ thống hiện tại theo Asia/Ho_Chi_Minh để diễn giải các mốc thời gian tương đối như hôm nay, ngày mai, chiều mai.',
        schema: z.object({})
      }
    ),
    tool(
      async ({ date, days }) => {
        const match = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) {
          return JSON.stringify({ error: 'invalid_date', message: 'date phải có dạng YYYY-MM-DD.' });
        }
        const base = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + Number(days || 0)));
        const next = `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}-${String(base.getUTCDate()).padStart(2, '0')}`;
        return JSON.stringify({ date: next });
      },
      {
        name: 'add_days',
        description: 'Cộng số ngày vào một ngày YYYY-MM-DD để ra ngày mới YYYY-MM-DD. Dùng để suy ra "mai", "ngày kia"... từ current time.',
        schema: z.object({
          date: z.string().min(1),
          days: z.number().int()
        })
      }
    ),
    tool(
      async ({ date, time }) => {
        const dateText = String(date || '').trim();
        const timeText = String(time || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText) || !/^\d{2}:\d{2}$/.test(timeText)) {
          return JSON.stringify({ error: 'invalid_input', message: 'date YYYY-MM-DD và time HH:MM.' });
        }
        return JSON.stringify({ appointmentDateTime: `${dateText}T${timeText}:00+07:00` });
      },
      {
        name: 'make_datetime',
        description: 'Tạo chuỗi datetime ISO có timezone +07:00 từ date YYYY-MM-DD và time HH:MM.',
        schema: z.object({
          date: z.string().min(1),
          time: z.string().min(1)
        })
      }
    ),
    tool(
      async () => summarizeMemory(getBookingMemory(conversationId)),
      {
        name: 'get_booking_memory',
        description: 'Đọc bộ nhớ đặt lịch hiện tại để biết thông tin đặt lịch đã có và còn thiếu.',
        schema: z.object({})
      }
    ),
    tool(
      async (input) => {
        const booking = {
          ...getBookingMemory(conversationId),
          ...Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== ''))
        };

        patchConversationState(conversationId, { booking });
        return summarizeMemory(booking);
      },
      {
        name: 'save_booking_memory',
        description: 'Lưu hoặc cập nhật bộ nhớ đặt lịch từ thông tin đã xác định được. Chỉ lưu giá trị có thật.',
        schema: z.object({
          serviceId: z.string().optional(),
          serviceName: z.string().optional(),
          appointmentDate: z.string().optional(),
          appointmentTime: z.string().optional(),
          licensePlate: z.string().optional(),
          brand: z.string().optional(),
          customerRequirements: z.string().optional(),
          note: z.string().optional(),
          model: z.string().optional(),
          color: z.string().optional(),
          vin: z.string().optional(),
          year: z.string().optional()
        })
      }
    ),
    tool(
      async () => {
        const booking = emptyBookingMemory();
        patchConversationState(conversationId, { booking });
        return summarizeMemory(booking);
      },
      {
        name: 'clear_booking_memory',
        description: 'Xóa bộ nhớ đặt lịch hiện tại khi người dùng hủy bỏ, muốn đặt lại từ đầu hoặc đổi hướng hội thoại.',
        schema: z.object({})
      }
    )
  ];
};

module.exports = {
  createMemoryTools,
  emptyBookingMemory,
  getBookingMemory,
  getMissingBookingFields
};
