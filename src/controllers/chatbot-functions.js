const { z } = require('zod');
const { ChatOpenAI } = require('@langchain/openai');
const ServicePackage = require('../models/ServicePackage.model');
const { Appointment, APPOINTMENT_STATUS } = require('../models/Appointment.model');

const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const VIETNAM_UTC_OFFSET = '+07:00';
const SLOT_MINUTES = 30;
const SLOT_DURATION_MS = SLOT_MINUTES * 60 * 1000;
const WORKING_START_HOUR = 7;
const WORKING_END_HOUR = 18;
const PRODUCT_LIMIT = 3;

const FALLBACK_SERVICE_CARD = {
  id: 'khac',
  serviceId: 'khac',
  name: 'Khác',
  price: 'Liên hệ',
  duration: 'Thỏa thuận',
  warranty: 'Tùy trường hợp',
  category: 'Khác',
  description: 'Nhu cầu của bạn chưa khớp với các gói dịch vụ có sẵn.',
  image: '',
  detailUrl: ''
};

const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
const openaiBaseUrl = process.env.OPENAI_BASE_URL?.trim();
const serviceMatchModel = process.env.OPENAI_SERVICE_MATCH_MODEL?.trim() || process.env.OPENAI_CHAT_MODEL?.trim() || 'gpt-4.1';

const serviceMatchResponseSchema = z.object({
  matches: z.array(z.object({
    serviceId: z.string(),
    score: z.number().min(0).max(1)
  })).max(PRODUCT_LIMIT)
});

const getFrontendBaseUrl = () => (process.env.APP_FE_URL || 'http://localhost:5173').replace(/\/$/, '');
const normalizePlate = (value = '') => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const getServiceMatchModel = () => {
  if (!openaiApiKey) {
    return null;
  }

  return new ChatOpenAI({
    model: serviceMatchModel,
    temperature: 0,
    apiKey: openaiApiKey,
    ...(openaiBaseUrl ? { configuration: { baseURL: openaiBaseUrl } } : {})
  }).withStructuredOutput(serviceMatchResponseSchema);
};

const formatCurrency = (value) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return 'Liên hệ để báo giá';
  }

  return `${numberValue.toLocaleString('vi-VN')} VNĐ`;
};

const mapServiceCard = (service) => {
  if (!service) {
    return FALLBACK_SERVICE_CARD;
  }

  const serviceId = String(service.serviceId || service._id || 'khac');

  return {
    id: serviceId,
    serviceId,
    mongoId: service._id?.toString?.() || '',
    name: service.name || 'Dịch vụ',
    price: service.priceLabel || formatCurrency(service.price),
    duration: service.duration || 'Tư vấn thêm',
    warranty: service.warranty || 'Tùy hạng mục',
    category: service.category || 'Khác',
    description: service.description || '',
    includes: Array.isArray(service.includes) ? service.includes : [],
    image: service.image || '',
    detailUrl: `${getFrontendBaseUrl()}/san-pham-dich-vu/${encodeURIComponent(serviceId)}`
  };
};

const getVietnamParts = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });
  const parts = formatter.formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value || '';
  const year = Number(pick('year'));
  const month = Number(pick('month'));
  const day = Number(pick('day'));
  const hour = Number(pick('hour'));
  const minute = Number(pick('minute'));
  const second = Number(pick('second'));

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  };
};

const getCurrentVietnamTime = (date = new Date()) => {
  const parts = getVietnamParts(date);

  return {
    timezone: TIME_ZONE,
    utcOffset: VIETNAM_UTC_OFFSET,
    iso: date.toISOString(),
    date: parts.date,
    time: parts.time,
    display: date.toLocaleString('vi-VN', {
      timeZone: TIME_ZONE,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  };
};

const parseDateKey = (dateKey = '') => {
  const match = String(dateKey).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
};

const isValidDateKey = (dateKey = '') => {
  const parts = parseDateKey(dateKey);
  if (!parts) {
    return false;
  }

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return (
    date.getUTCFullYear() === parts.year &&
    date.getUTCMonth() === parts.month - 1 &&
    date.getUTCDate() === parts.day
  );
};

const addDaysToDateKey = (dateKey, days) => {
  const parts = parseDateKey(dateKey);
  if (!parts) {
    return '';
  }

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + Number(days || 0)));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

const normalizeTimeValue = (hour, minute = 0) => {
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return '';
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const isWorkingTime = (time = '') => {
  const match = String(time).match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return false;
  }

  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes >= WORKING_START_HOUR * 60 && minutes < WORKING_END_HOUR * 60;
};

const dateTimeToDate = (dateKey = '', time = '') => {
  if (!isValidDateKey(dateKey) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const parsed = new Date(`${dateKey}T${time}:00${VIETNAM_UTC_OFFSET}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatAppointmentDate = (value) => {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('vi-VN', {
    timeZone: TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getServices = async () => {
  try {
    const services = await ServicePackage.find({ isActive: true })
      .sort({ isFeatured: -1, popularity: -1, createdAt: -1 })
      .lean();

    return services.length ? services.map(mapServiceCard) : [FALLBACK_SERVICE_CARD];
  } catch {
    return [FALLBACK_SERVICE_CARD];
  }
};

const findServicesByQuery = async (query = '') => {
  const userQuery = String(query || '').trim();
  if (!userQuery) {
    return [];
  }

  const services = await ServicePackage.find({ isActive: true })
    .sort({ isFeatured: -1, popularity: -1, createdAt: -1 })
    .lean();

  if (!services.length) {
    return [];
  }

  const matcher = getServiceMatchModel();
  if (!matcher) {
    throw new Error('OPENAI_NOT_CONFIGURED');
  }

  const catalog = services.map((service) => ({
    serviceId: String(service.serviceId || service._id || ''),
    name: service.name || '',
    category: service.category || '',
    description: service.description || '',
    includes: Array.isArray(service.includes) ? service.includes : []
  }));

  const result = await matcher.invoke([
    [
      'system',
      `Bạn là bộ chọn dịch vụ gara.
Chọn tối đa ${PRODUCT_LIMIT} dịch vụ phù hợp nhất từ catalog cho nhu cầu người dùng.
Không suy diễn ra dịch vụ không có trong danh sách.
Chỉ trả về serviceId có trong catalog.
Nếu không có dịch vụ nào thực sự phù hợp thì trả về matches rỗng.
Ưu tiên độ phù hợp ngữ nghĩa với triệu chứng, nhu cầu và hạng mục sửa chữa/bảo dưỡng.`
    ],
    [
      'human',
      JSON.stringify({
        userQuery,
        catalog
      })
    ]
  ]);

  const serviceMap = new Map(services.map((service) => [String(service.serviceId || service._id || ''), service]));
  const matchedServices = (result.matches || [])
    .map((item) => ({
      service: serviceMap.get(String(item.serviceId || '')),
      score: Number(item.score || 0)
    }))
    .filter((item) => item.service && item.score >= 0.35)
    .sort((a, b) => b.score - a.score)
    .slice(0, PRODUCT_LIMIT)
    .map((item) => mapServiceCard(item.service));

  return matchedServices;
};

const buildPlateRegex = (query = '') => {
  const normalized = normalizePlate(query);
  return normalized ? normalized.split('').join('[^A-Z0-9]*') : null;
};

const normalizeQueryDate = (query = '') => {
  const text = String(query || '').trim();
  if (!text) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text) && isValidDateKey(text)) {
    return text;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [day, month, year] = text.split('/');
    const dateKey = `${year}-${month}-${day}`;
    return isValidDateKey(dateKey) ? dateKey : '';
  }

  return '';
};

const { expireAppointmentsByRules } = require('../services/appointment-expiry.service');

const markExpiredAppointments = async (_userId) => {
  await expireAppointmentsByRules();
};

const mapAppointmentCard = (appointment) => ({
  id: appointment._id.toString(),
  date: formatAppointmentDate(appointment.appointmentDate),
  plate: appointment.vehicle?.licensePlate || 'N/A',
  status: appointment.status,
  requirements: appointment.customerRequirements || '',
  note: appointment.note || ''
});

const findAppointmentsByQuery = async (userId, query = '') => {
  if (!userId) {
    return { error: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để xem lịch hẹn.' };
  }

  try {
    await markExpiredAppointments(userId);

    const keyword = String(query || '').trim();
    const plateRegex = buildPlateRegex(keyword);
    const queryDate = normalizeQueryDate(keyword);
    const dateStart = queryDate ? dateTimeToDate(queryDate, '00:00') : null;
    const dateEnd = queryDate ? dateTimeToDate(addDaysToDateKey(queryDate, 1), '00:00') : null;
    const textRegex = keyword ? new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
    const filters = [];

    if (plateRegex) {
      filters.push({ 'vehicle.licensePlate': { $regex: plateRegex, $options: 'i' } });
    }

    if (dateStart && dateEnd) {
      filters.push({ appointmentDate: { $gte: dateStart, $lt: dateEnd } });
    }

    if (textRegex) {
      filters.push(
        { status: textRegex },
        { customerRequirements: textRegex },
        { note: textRegex },
        { 'vehicle.brand': textRegex },
        { 'vehicle.model': textRegex }
      );
    }

    const appointments = await Appointment.find({
      customer: userId,
      ...(filters.length ? { $or: filters } : {})
    })
      .sort({ appointmentDate: -1 })
      .limit(5)
      .lean();

    return {
      summary: appointments.length
        ? 'Mình tìm thấy lịch hẹn phù hợp.'
        : 'Mình chưa tìm thấy lịch hẹn nào khớp với thông tin này.',
      appointmentCards: appointments.map(mapAppointmentCard)
    };
  } catch {
    return { error: 'Không thể tìm lịch hẹn.' };
  }
};

const getMyAppointments = async (userId) => {
  if (!userId) {
    return { error: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập để xem lịch hẹn.' };
  }

  try {
    await markExpiredAppointments(userId);

    const appointments = await Appointment.find({ customer: userId })
      .sort({ appointmentDate: -1 })
      .limit(5)
      .lean();

    const appointmentCards = appointments.map(mapAppointmentCard);
    return {
      appointmentCards,
      message: appointmentCards.length
        ? 'Mình tìm thấy các lịch hẹn gần đây của bạn.'
        : 'Bạn hiện chưa có lịch hẹn nào.'
    };
  } catch {
    return { error: 'Không thể tải lịch hẹn.' };
  }
};

const checkSlotAvailability = async (appointmentDate) => {
  try {
    if (!(appointmentDate instanceof Date) || Number.isNaN(appointmentDate.getTime())) {
      return { available: false, reason: 'invalid_time', message: 'Ngày giờ hẹn không hợp lệ.' };
    }

    if (appointmentDate <= new Date()) {
      return { available: false, reason: 'past_time', message: 'Thời gian hẹn phải ở tương lai.' };
    }

    const vietnamTime = getVietnamParts(appointmentDate);
    if (!isWorkingTime(vietnamTime.time)) {
      return {
        available: false,
        reason: 'outside_hours',
        message: `Gara nhận lịch từ ${String(WORKING_START_HOUR).padStart(2, '0')}:00 đến ${String(WORKING_END_HOUR - 1).padStart(2, '0')}:30.`
      };
    }

    const expiresAt = new Date(appointmentDate.getTime() + SLOT_DURATION_MS);
    const conflict = await Appointment.findOne({
      status: { $nin: [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.CONVERTED, APPOINTMENT_STATUS.EXPIRED] },
      appointmentDate: { $lt: expiresAt },
      expiresAt: { $gt: appointmentDate }
    }).lean();

    return {
      available: !conflict,
      reason: conflict ? 'slot_busy' : '',
      conflict: conflict
        ? {
          id: conflict._id.toString(),
          appointmentDate: formatAppointmentDate(conflict.appointmentDate)
        }
        : null
    };
  } catch {
    return { available: false, reason: 'check_failed', message: 'Không thể kiểm tra khung giờ.' };
  }
};

const roundUpToNextSlot = (date) => new Date(Math.ceil(date.getTime() / SLOT_DURATION_MS) * SLOT_DURATION_MS);

const moveCursorIntoWorkingHours = (date) => {
  const parts = getVietnamParts(date);
  const minutes = parts.hour * 60 + parts.minute;

  if (minutes < WORKING_START_HOUR * 60) {
    return dateTimeToDate(parts.date, `${String(WORKING_START_HOUR).padStart(2, '0')}:00`);
  }

  if (minutes >= WORKING_END_HOUR * 60) {
    return dateTimeToDate(addDaysToDateKey(parts.date, 1), `${String(WORKING_START_HOUR).padStart(2, '0')}:00`);
  }

  return date;
};

const findNextAvailableSlots = async (startDate, maxResults = 3, daysLimit = 7) => {
  const results = [];
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
    return results;
  }

  const searchStart = new Date(Math.max(startDate.getTime(), Date.now() + 60 * 1000));
  const searchEnd = new Date(searchStart.getTime() + daysLimit * 24 * 60 * 60 * 1000);
  let cursor = moveCursorIntoWorkingHours(roundUpToNextSlot(searchStart));

  while (cursor && cursor <= searchEnd && results.length < maxResults) {
    cursor = moveCursorIntoWorkingHours(cursor);
    if (!cursor || cursor > searchEnd) {
      break;
    }

    const slotCheck = await checkSlotAvailability(cursor);
    if (slotCheck.available) {
      const parts = getVietnamParts(cursor);
      results.push({
        date: parts.date,
        time: parts.time,
        label: `${parts.time} ngày ${parts.date}`
      });
    }

    cursor = new Date(cursor.getTime() + SLOT_DURATION_MS);
  }

  return results;
};

const normalizeDateOnly = (value) => {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text) && isValidDateKey(text)) {
    return text;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? '' : getVietnamParts(parsed).date;
};

const normalizeTimeOnly = (dateValue, timeValue) => {
  const timeText = String(timeValue || '').trim();
  if (/^\d{1,2}:\d{2}/.test(timeText)) {
    const [hour, minute] = timeText.split(':');
    return normalizeTimeValue(Number(hour), Number(minute.slice(0, 2)));
  }

  const parsed = new Date(String(dateValue || '').trim());
  return Number.isNaN(parsed.getTime()) ? '' : getVietnamParts(parsed).time;
};

const buildBookingPrefillUrl = async ({
  serviceId = '',
  appointmentDate = '',
  appointmentTime = '',
  licensePlate = '',
  brand = '',
  model = '',
  color = '',
  vin = '',
  year = '',
  customerRequirements = '',
  note = ''
}) => {
  const requiredFields = {
    appointmentDate,
    appointmentTime,
    licensePlate
  };
  const missingFields = Object.entries(requiredFields)
    .filter(([, value]) => !String(value || '').trim())
    .map(([key]) => key);

  if (missingFields.length) {
    return {
      error: 'missing_fields',
      missingFields,
      message: `Thiếu thông tin bắt buộc: ${missingFields.join(', ')}.`
    };
  }

  const normalizedDate = normalizeDateOnly(appointmentDate);
  const normalizedTime = normalizeTimeOnly(appointmentDate, appointmentTime);
  const requestedDate = dateTimeToDate(normalizedDate, normalizedTime);

  if (!requestedDate) {
    return { error: 'invalid_time', message: 'Ngày giờ hẹn không hợp lệ.' };
  }

  const availability = await checkSlotAvailability(requestedDate);
  if (!availability.available) {
    return {
      error: availability.reason || 'slot_unavailable',
      available: false,
      message: availability.message || 'Khung giờ này đang bận.',
      suggestedTimes: await findNextAvailableSlots(requestedDate, 3, 7)
    };
  }

  const params = new URLSearchParams();
  params.set("ref", "chatbot");
  params.set('ngay', normalizedDate);
  params.set('gio', normalizedTime);
  params.set('bien-so', String(licensePlate).trim().toUpperCase());

  if (serviceId) params.set('dich-vu', String(serviceId).trim());
  if (brand) params.set('hang', String(brand).trim());
  if (model) params.set('dong-xe', String(model).trim());
  if (color) params.set('mau', String(color).trim());
  if (vin) params.set('vin', String(vin).trim().toUpperCase());
  if (year) params.set('nam', String(year).trim());
  if (customerRequirements) params.set('yeu-cau', String(customerRequirements).trim());
  if (note) params.set('ghi-chu', String(note).trim());

  return {
    available: true,
    bookingUrl: `${getFrontendBaseUrl()}/dat-dich-vu?${params.toString()}`,
    appointmentDate: normalizedDate,
    appointmentTime: normalizedTime,
    suggestedTimes: []
  };
};

module.exports = {
  TIME_ZONE,
  getServices,
  findServicesByQuery,
  getMyAppointments,
  findAppointmentsByQuery,
  checkSlotAvailability,
  buildBookingPrefillUrl,
  getCurrentVietnamTime
};
