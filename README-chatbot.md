# README - Chatbot AI (GaraOne)
# Chatbot AI — Giải thích ngắn, rõ ràng

Chatbot là trợ lý ảo của GaraOne, trả lời bằng tiếng Việt để hỗ trợ ba việc chính: tư vấn tình trạng xe, gợi ý dịch vụ và hỗ trợ đặt lịch / xem lịch hẹn.

Mục tiêu của tài liệu này là giúp người hướng dẫn hiểu tường tận cách chatbot hoạt động mà không cần chi tiết kỹ thuật về vị trí file.

## Ý tưởng tổng quan (dễ hình dung)
- Người dùng chat trên web → tin nhắn được gửi lên server.
- Server lần lượt: kiểm tra người dùng, giữ trạng thái hội thoại ngắn hạn, gửi lịch sử + tin nhắn cho mô-đun AI.
- Mô-đun AI (một agent) suy luận bằng mô hình ngôn ngữ; khi cần thông tin thật (danh sách dịch vụ, lịch hẹn, kiểm tra slot, tạo link đặt lịch) agent gọi các chức năng nghiệp vụ thực tế (tool).
- Kết quả trả về gồm: một câu trả lời ngắn để đối thoại, và dữ liệu hỗ trợ hiển thị (ví dụ: danh sách dịch vụ dạng card, lịch hẹn, các khung giờ gợi ý hoặc link đặt lịch).

## Luồng xử lý theo bước (rõ ràng, không rối)
1. Người dùng gửi tin nhắn từ widget chat trên trang.
2. Frontend gửi: nội dung tin nhắn, một phần lịch sử ngắn, và một `conversationId` cho server.
3. Server xác thực (nếu cần) — nhiều thao tác nghiệp vụ (xem lịch, đặt lịch) yêu cầu người dùng đã đăng nhập.
4. Server đưa dữ liệu cho AI Agent:
  - Agent có một bộ quy tắc (prompt) giới hạn phạm vi: chỉ hỗ trợ về xe/gara, đặt lịch và xem lịch.
  - Agent có thể gọi các tool để lấy dữ liệu thật — ví dụ lấy dịch vụ phù hợp, lấy lịch hẹn của người dùng, kiểm tra slot hoặc tạo link đặt lịch.
5. Khi agent hoàn tất, server trả về:
  - `reply`: câu trả lời ngắn, dễ đọc (dùng để hiển thị ngay trong khung chat).
  - các `card` hoặc `links`: dữ liệu chi tiết (dịch vụ, lịch, link đặt lịch, khung giờ gợi ý).
6. Frontend hiển thị `reply` và render các card / nút tương tác; người dùng có thể tiếp tục (chọn khung giờ, mở link, đặt thêm thông tin).

## Flow đặt lịch (ngắn gọn, trực quan)
- Agent thu thập dần các thông tin cần thiết: dịch vụ, ngày, giờ, biển số xe (và có thể yêu cầu mô tả ngắn về vấn đề).
- Mỗi thông tin agent biết được sẽ được lưu tạm vào bộ nhớ cuộc hội thoại (booking memory).
- Khi đủ thông tin bắt buộc, agent gọi chức năng tạo link đặt lịch. Nếu slot bận, hệ thống trả các khung giờ gợi ý để người dùng chọn.

## Nguyên tắc quan trọng để người hướng dẫn nắm
- Agent không tự suy đoán dữ liệu thực tế (ví dụ slot, trạng thái đơn) — mọi dữ liệu thật đều do các tool nghiệp vụ trả về.
- Trả lời được chia thành hai phần: văn bản đối thoại ngắn và dữ liệu card/link để UI hiển thị chi tiết — giúp tránh lặp thông tin và giữ giao diện sạch.
- Trạng thái đặt lịch là tạm thời trong phiên chat; có thể được lưu lâu hơn nếu hệ thống muốn (hiện tại lưu ngắn hạn là đủ cho trải nghiệm chat).

## Vì sao thiết kế này dễ hiểu và an toàn
- Tách biệt rõ ràng: hiểu ngôn ngữ (AI) vs thực hiện hành động (tool nghiệp vụ). Điều này ngăn AI "bịa" thông tin quan trọng.
- Giao diện người dùng chỉ nhận dữ liệu đã được xác thực bởi backend trước khi hiển thị hoặc mở form đặt lịch.

Nếu bạn muốn, tôi có thể chuyển nội dung này thành một email ngắn gửi cho người hướng dẫn, hoặc thành slide 3-4 trang tóm tắt.

---

### Cách tôi triển khai (ngắn, dành cho người hướng dẫn muốn biết phần kỹ thuật)

- Tôi chia hệ thống thành hai phần rõ ràng: **AI (hiểu & quyết định)** và **tool nghiệp vụ (thực thi)**. AI chỉ đưa ra quyết định và ngôn ngữ; mọi thao tác truy vấn dữ liệu hay tạo link đều do các tool thực hiện.
- Dùng LangChain (StateGraph + ToolNode) để orchestration, `ChatOpenAI` để gọi mô hình chat. Mỗi tool trả về JSON chuẩn để agent dễ xử lý.
- Viết một `SYSTEM_PROMPT` bằng tiếng Việt mô tả phạm vi, quy tắc gọi tool (khi nào được phép gọi), và quy tắc đặt lịch (chỉ tạo link khi đủ 4 trường cần thiết).
- Tools gồm:
  - Memory tools: quản lý booking memory (get/save/clear) và helper xử lý thời gian tương đối (get_current_time, add_days, make_datetime).
  - Business tools: get_services/find_services, get_my_appointments/find_appointments, check_slot_availability, create_booking_link.
- Session lưu tạm (in-memory Map) gồm `history` và `state.booking` với TTL 2 giờ — mục đích là nhanh khi phát triển; nên migrate sang DB/Redis nếu cần bền.
- Bảo mật: backend giải mã JWT từ header để biết `userId`; không đưa user/token vào prompt.
- Kết quả trả về gồm `reply` (text ngắn) và các dữ liệu kèm (`serviceCards`, `appointmentCards`, `suggestedTimes`, `bookingUrl`) để frontend render UI.
- Kiểm thử: chạy manual qua UI, kiểm tra luồng booking, test unit cho các tool nghiệp vụ và thêm logs cho audit.

Nếu muốn, tôi có thể thêm ví dụ nhỏ về cách viết một tool hoặc mẫu `SYSTEM_PROMPT` vào phần này.