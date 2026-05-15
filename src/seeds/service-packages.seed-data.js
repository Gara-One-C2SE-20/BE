const servicePackageSeedData = [
    {
        serviceId: "bao-duong-co-ban",
        categoryId: "bao-duong",
        category: "Bảo dưỡng định kỳ",
        name: "Gói bảo dưỡng cơ bản",
        description: "Thay nhớt, lọc nhớt, kiểm tra tổng quát",
        includes: ["Thay nhớt", "Thay lọc nhớt", "Kiểm tra tổng quát"],
        details: [
            "Kiểm tra các hạng mục an toàn cơ bản.",
            "Thay dầu và lọc dầu theo tiêu chuẩn kỹ thuật.",
            "Vệ sinh khoang máy và kiểm tra rò rỉ."
        ],
        duration: "1 giờ",
        warranty: "1 tháng",
        price: 500000,
        priceLabel: "Từ 500.000đ",
        popularity: 85,
        image: "/src/assets/image/car-oil-change.png",
        isFeatured: true,
        isActive: true
    },
    {
        serviceId: "bao-duong-nang-cao",
        categoryId: "bao-duong",
        category: "Bảo dưỡng định kỳ",
        name: "Gói bảo dưỡng nâng cao",
        description: "Bao gồm gói cơ bản + thay lọc gió, lọc điều hòa, kiểm tra phanh",
        includes: ["Thay nhớt", "Thay lọc gió", "Thay lọc điều hòa", "Kiểm tra phanh"],
        details: [
            "Thực hiện đầy đủ các hạng mục của gói cơ bản.",
            "Kiểm tra sâu hệ thống phanh và hệ thống treo.",
            "Đề xuất thay thế vật tư nếu cần thiết."
        ],
        duration: "2 giờ",
        warranty: "3 tháng",
        price: 1200000,
        priceLabel: "Từ 1.200.000đ",
        popularity: 72,
        image: "/src/assets/image/car-maintenance-package-oil-filter-combo.jpg",
        isFeatured: true,
        isActive: true
    },
    {
        serviceId: "bao-duong-toan-dien",
        categoryId: "bao-duong",
        category: "Bảo dưỡng định kỳ",
        name: "Gói bảo dưỡng toàn diện",
        description: "Bao gồm gói nâng cao + thay dầu hộp số, kiểm tra hệ thống treo",
        includes: ["Thay dầu động cơ", "Thay dầu hộp số", "Kiểm tra hệ thống treo"],
        details: [
            "Bảo dưỡng tổng thể theo checklist 20 hạng mục.",
            "Kiểm tra hệ thống điện và điều hòa.",
            "Chạy thử xe trước khi bàn giao."
        ],
        duration: "3-4 giờ",
        warranty: "6 tháng",
        price: 2500000,
        priceLabel: "Từ 2.500.000đ",
        popularity: 58,
        image: "/src/assets/image/full-car-service-inspection.jpg",
        isFeatured: false,
        isActive: true
    },
    {
        serviceId: "sua-chua-phanh",
        categoryId: "phanh",
        category: "Hệ thống phanh",
        name: "Sửa chữa phanh",
        description: "Thay má phanh, đĩa phanh, kiểm tra hệ thống phanh",
        includes: ["Thay má phanh", "Kiểm tra đĩa phanh", "Kiểm tra dầu phanh"],
        details: [
            "Đánh giá độ mòn má phanh và đĩa phanh.",
            "Vệ sinh cùm phanh và căn chỉnh hệ thống.",
            "Test phanh sau khi hoàn thành."
        ],
        duration: "1-2 giờ",
        warranty: "6 tháng",
        price: 800000,
        priceLabel: "Từ 800.000đ",
        popularity: 65,
        image: "/src/assets/image/car-brake-pads-replacement.jpg",
        isFeatured: true,
        isActive: true
    },
    {
        serviceId: "sua-chua-he-thong-treo",
        categoryId: "gam-treo",
        category: "Gầm & treo",
        name: "Sửa chữa hệ thống treo",
        description: "Thay thế hoặc sửa chữa các bộ phận hệ thống treo",
        includes: ["Kiểm tra giảm xóc", "Kiểm tra càng A", "Cân chỉnh góc đặt bánh xe"],
        details: [
            "Kiểm tra tiếng ồn và độ rung của hệ thống treo.",
            "Thay thế phụ tùng treo hư hỏng.",
            "Canh chỉnh độ chụm, camber và caster."
        ],
        duration: "2-3 giờ",
        warranty: "6 tháng",
        price: 1500000,
        priceLabel: "Từ 1.500.000đ",
        popularity: 45,
        image: "/src/assets/image/car-wheel-alignment-service.jpg",
        isFeatured: false,
        isActive: true
    },
    {
        serviceId: "chan-doan-loi-xe",
        categoryId: "dong-co",
        category: "Động cơ & hộp số",
        name: "Chẩn đoán lỗi xe",
        description: "Sử dụng thiết bị chuyên dụng để chẩn đoán các lỗi của xe",
        includes: ["Đọc lỗi ECU", "Kiểm tra cảm biến", "Tư vấn hướng sửa chữa"],
        details: [
            "Sử dụng máy chẩn đoán chuyên dụng theo hãng xe.",
            "Phân tích nguyên nhân gốc của lỗi.",
            "Đề xuất phương án xử lý và báo giá."
        ],
        duration: "30 phút",
        warranty: "Không áp dụng",
        price: 300000,
        priceLabel: "Từ 300.000đ",
        popularity: 90,
        image: "/src/assets/image/car-engine-repair-mechanic-working.jpg",
        isFeatured: true,
        isActive: true
    }
];

module.exports = { servicePackageSeedData };
