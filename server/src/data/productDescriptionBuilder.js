/**
 * Tạo mô tả HTML sản phẩm cho TechPhone.
 * Thông số tham khảo trang chính hãng (Apple, Samsung, Xiaomi, OPPO, LG, Daikin…)
 * và các trang spec uy tín (VD: GSMArena, trang support nhà sản xuất).
 * Nội dung văn bản được biên soạn lại, không sao chép nguyên văn từ đối tác bán lẻ.
 */

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractCapacities(name = '') {
  return [...name.matchAll(/(\d+)\s*GB/gi)].map((m) => `${m[1]} GB`);
}

function extractHp(name = '') {
  const match = name.match(/(\d+(?:\.\d+)?)\s*HP/i);
  return match ? `${match[1]} HP` : null;
}

function extractInches(name = '') {
  const match = name.match(/(\d+(?:\.\d+)?)\s*(?:inch|")/i);
  return match ? `${match[1]} inch` : null;
}

function extractCapacityKg(name = '') {
  const match = name.match(/(\d+)\s*kg/i);
  return match ? `${match[1]} kg` : null;
}

function extractMah(name = '') {
  const match = name.match(/(\d[\d.,]*)\s*mAh/i);
  return match ? `${match[1]} mAh` : null;
}

const PLACEHOLDER = 'Thông tin sản phẩm đang được cập nhật.';

/** @type {Record<number, { highlights: string[], sections: { title: string, body: string }[] }>} */
const PRODUCT_PROFILES = {
  1: {
    highlights: [
      'Khung titan cấp hàng không vũ trụ, nhẹ và bền hơn thép không gỉ.',
      'Chip A17 Pro cho hiệu năng đồ họa và AI vượt trội thế hệ trước.',
      'Camera chính 48MP, tele 5x và ultra wide — quay video ProRes chất lượng cao.',
      'Màn Super Retina XDR 6.7 inch, tần số quét thích ứng 120Hz.',
      'Pin cả ngày, sạc không dây MagSafe và USB-C.',
    ],
    sections: [
      {
        title: 'Thiết kế titan cao cấp',
        body: 'iPhone 15 Pro Max sử dụng khung titan Grade 5 giúp máy nhẹ hơn đáng kể so với thế hệ Pro trước, đồng thời tăng độ bền khi sử dụng hàng ngày. Mặt lưng kính mờ hạn chế bám vân tay, cảm giác cầm chắc tay và sang trọng.',
      },
      {
        title: 'Hiệu năng A17 Pro',
        body: 'Vi xử lý A17 Pro 3nm mang lại khả năng xử lý game nặng, render video 4K và các tác vụ AI trên thiết bị mượt mà. RAM 8GB đảm bảo đa nhiệm ổn định khi chuyển đổi giữa nhiều ứng dụng chuyên nghiệp.',
      },
      {
        title: 'Hệ thống camera chuyên nghiệp',
        body: 'Camera chính 48MP hỗ trợ chụp độ phân giải cao và chế độ ProRAW. Ống kính tele 5x quang học giúp chụp xa mà không mất chi tiết. Chế độ Cinematic và Action mode tối ưu cho quay vlog và video du lịch.',
      },
    ],
  },
  2: {
    highlights: [
      'Màn Dynamic AMOLED 2X 6.2 inch, 120Hz, độ sáng cao ngoài trời.',
      'Camera 50MP AI Nightography, zoom quang học 3x.',
      'Chip Exynos 2500 / Snapdragon 8 Gen 4 (tuỳ thị trường).',
      'Pin 4.800 mAh, sạc nhanh 45W và không dây.',
      'Kháng nước IP68, One UI 8 dựa trên Android mới nhất.',
    ],
    sections: [
      {
        title: 'Màn hình và thiết kế',
        body: 'Galaxy S26 mang thiết kế phẳng hiện đại, viền mỏng và màn Dynamic AMOLED 2X rực rỡ. Tần số quét 120Hz giúp cuộn mượt, xem phim và chơi game đã mắt hơn.',
      },
      {
        title: 'Camera AI thông minh',
        body: 'Bộ ba camera sau được tối ưu bằng Galaxy AI: chụp đêm sáng hơn, xóa vật thể, gợi ý khung hình và chỉnh ảnh tự động phù hợp mạng xã hội.',
      },
    ],
  },
  205: {
    highlights: [
      'Điện thoại gập dọc cao cấp, màn trong 7.82 inch LTPO OLED 120Hz.',
      'Snapdragon 8 Gen 2, RAM 16GB, bộ nhớ UFS 4.0 512GB.',
      'Hasselblad Camera System: 48MP chính + tele + ultra wide.',
      'Pin 4.805 mAh, sạc SUPERVOOC 67W.',
      'Khung nhôm, bản lề tiền cơ học bền bỉ qua hàng trăm nghìn lần gập.',
    ],
    sections: [
      {
        title: 'Trải nghiệm gập đa nhiệm',
        body: 'OPPO Find N3 mở ra không gian làm việc rộng như tablet nhưng gập gọn bỏ túi. Chế độ chia màn hình giúp xem video và ghi chú song song, phù hợp doanh nhân và người sáng tạo nội dung.',
      },
    ],
  },
  206: {
    highlights: [
      'Smartphone gập cao cấp thế hệ mới với bản lề bền hơn, màn phẳng hơn khi mở.',
      'RAM 16GB, ROM 512GB cho đa nhiệm và lưu trữ thoải mái.',
      'Hệ thống camera Hasselblad cải tiến, quay video 4K HDR.',
      'Pin lớn, sạc nhanh SUPERVOOC.',
      'ColorOS tối ưu giao diện gập và widget đa cửa sổ.',
    ],
    sections: [
      {
        title: 'Nâng cấp trải nghiệm gập',
        body: 'Find N6 tiếp tục tối ưu độ mỏng khi gập và giảm nếp gấm màn hình. Người dùng có thể dùng nửa màn ngoài như điện thoại thông thường hoặc mở full để chỉnh ảnh, họp trực tuyến trên màn lớn.',
      },
    ],
  },
  207: {
    highlights: [
      'Màn Dynamic AMOLED 6.2 inch, 120Hz, độ phân giải FHD+.',
      'Chip Exynos 2500, RAM 12GB, ROM 256GB.',
      'Camera 50MP OIS, tele 3x, selfie 12MP.',
      'Pin 4.800 mAh, sạc 45W.',
      'IP68, Galaxy AI tích hợp.',
    ],
    sections: [],
  },
  209: {
    highlights: [
      'Màn Dynamic AMOLED 2X 6.8 inch QHD+, 120Hz, S Pen hỗ trợ.',
      'Camera 200MP, tele periscope 5x và ultra wide.',
      'Chip Snapdragon 8 Gen 4 for Galaxy, RAM 12GB.',
      'Pin 5.000 mAh, sạc 45W + sạc không dây.',
      'Khung titan, IP68, bảo mật Knox.',
    ],
    sections: [
      {
        title: 'Flagship toàn diện',
        body: 'Galaxy S26 Ultra hướng tới người dùng cần camera zoom xa, màn lớn và bút S Pen ghi chú nhanh. Hiệu năng đỉnh giúp dựng phim 8K, chơi game AAA và livestream ổn định.',
      },
    ],
  },
  211: {
    highlights: [
      'Thiết kế Reno trẻ trung, mỏng nhẹ, nhiều tuỳ chọn màu.',
      'Màn AMOLED 120Hz, độ sáng cao, hiển thị màu sống động.',
      'Chip Dimensity 7300-Energy, RAM 8GB, ROM 256GB.',
      'Camera 50MP OIS, selfie 50MP góc rộng.',
      'Pin 7000mAh, sạc SUPERVOOC 80W.',
    ],
    sections: [
      {
        title: 'Cân bằng pin và camera',
        body: 'Reno15 F phù hợp người dùng trẻ cần pin trụ cả ngày, chụp selfie nhóm và sạc nhanh trước khi ra ngoài. ColorOS mang nhiều tính năng AI hỗ trợ dịch, quét tài liệu và quản lý ảnh.',
      },
    ],
  },
  213: {
    highlights: [
      'Chip MediaTek Dimensity 9400+, hiệu năng flagship.',
      'Leica Summilux: camera chính 50MP, tele và ultra wide.',
      'Màn AMOLED 6.73 inch 120Hz, 4000 nits peak brightness.',
      'RAM 12GB, UFS 4.0 512GB.',
      'Pin 5.500 mAh, sạc HyperCharge 90W.',
    ],
    sections: [],
  },
  212: {
    highlights: [
      'Smartphone gập 3 màn hình, màn trong 8 inch Dynamic AMOLED 120Hz.',
      'Snapdragon 8 Gen 3 for Galaxy, RAM 12GB.',
      'Camera 200MP + ultra wide + tele under-display.',
      'S Pen Fold Edition, đa nhiệm Flex Mode.',
      'Khung Armor Aluminum, IPX8 chống nước.',
    ],
    sections: [],
  },
  4: {
    highlights: [
      'Chip Apple M3 8 nhân CPU / 10 nhân GPU.',
      'Màn Liquid Retina 13.6 inch, 500 nits.',
      'Fanless — vận hành im lặng.',
      'Pin 18 giờ, MagSafe, 2 cổng Thunderbolt.',
      'macOS Sonoma — tối ưu cho Apple Silicon.',
    ],
    sections: [],
  },
  504: {
    highlights: [
      'Chip Apple M3 Pro, hiệu năng chuyên nghiệp.',
      'Màn Liquid Retina XDR 14.2 inch, ProMotion 120Hz.',
      'RAM 8GB unified memory, SSD 512GB.',
      '3 cổng Thunderbolt 4, HDMI, khe SD.',
      'Pin 18 giờ, loa 6 driver.',
    ],
    sections: [],
  },
};

function inferPhoneHighlights(name, brand) {
  const caps = extractCapacities(name);
  const ram = caps.length >= 2 ? caps[0] : caps[0] || '8 GB';
  const storage = caps.length >= 2 ? caps[1] : '256 GB';
  const is5G = /5G/i.test(name);
  const brandLabel = brand || name.split(' ')[0] || 'Thương hiệu';

  return [
    `Thiết kế hiện đại, tối ưu cầm nắm và nhận diện ${brandLabel}.`,
    `Màn hình AMOLED/OLED sắc nét, tần số quét cao cho trải nghiệm mượt.`,
    `RAM ${ram}, bộ nhớ ${storage}${is5G ? ', hỗ trợ kết nối 5G' : ''}.`,
    'Camera đa ống kính: chụp đêm, chân dung và góc rộng linh hoạt.',
    'Pin dung lượng lớn, sạc nhanh — đáp ứng nhu cầu cả ngày dài.',
  ];
}

function inferLaptopHighlights(name) {
  const caps = extractCapacities(name);
  return [
    'Cấu hình cân bằng cho học tập, văn phòng và giải trí.',
    caps.length ? `RAM ${caps[0]}${caps[1] ? `, SSD ${caps[1]}` : ''} — mở nhiều tab mượt mà.` : 'Ổ SSD tốc độ cao, khởi động nhanh.',
    'Màn hình sắc nét, màu chuẩn cho làm việc lâu.',
    'Bàn phím thoải mái, touchpad chính xác.',
    'Cổng kết nối đầy đủ: USB-C, HDMI, jack tai nghe (tuỳ model).',
  ];
}

function inferTabletHighlights(name) {
  const caps = extractCapacities(name);
  const screen = extractInches(name) || '11 inch';
  return [
    `Màn hình ${screen} — không gian hiển thị rộng cho học online và xem phim.`,
    caps.length ? `RAM ${caps[0]}, bộ nhớ ${caps[1] || caps[0]}.` : 'Bộ nhớ đủ dùng cho ứng dụng và tài liệu.',
    'Pin cả ngày, sạc nhanh qua USB-C.',
    'Hỗ trợ bút cảm ứng / bàn phím rời (tuỳ model).',
    'Loa stereo, Wi-Fi 6, camera trước/sau cho họp trực tuyến.',
  ];
}

function inferAcHighlights(name, brand) {
  const hp = extractHp(name) || '1 HP';
  const brandLabel = brand || 'Thương hiệu';
  return [
    `Công suất ${hp}, làm lạnh nhanh cho diện tích phòng phù hợp.`,
    'Công nghệ Inverter tiết kiệm điện, vận hành êm ái.',
    `${brandLabel} — thương hiệu uy tín, bảo hành chính hãng tại TechPhone.`,
    'Lọc không khí / khử mùi / tự làm sạch (tuỳ model).',
    'Điều khiển từ xa và hẹn giờ tiện lợi.',
  ];
}

function inferApplianceHighlights(name, brand) {
  const inches = extractInches(name);
  const kg = extractCapacityKg(name);
  const brandLabel = brand || 'Thương hiệu';
  if (/tivi|tv/i.test(name)) {
    return [
      inches ? `Màn hình ${inches}, độ phân giải 4K/UHD sắc nét.` : 'Màn hình độ phân giải cao, màu sống động.',
      'Hệ điều hành smart TV: Netflix, YouTube, ứng dụng giải trí phổ biến.',
      'Âm thanh Dolby / Object Tracking Sound (tuỳ model).',
      `${brandLabel} — chất lượng panel và linh kiện tin cậy.`,
      'Kết nối Wi-Fi, Bluetooth, HDMI đa cổng.',
    ];
  }
  if (/giặt/i.test(name)) {
    return [
      kg ? `Khối lượng giặt ${kg} — phù hợp gia đình 3–5 người.` : 'Dung tích giặt lớn cho gia đình.',
      'Công nghệ Inverter tiết kiệm điện nước.',
      'Nhiều chế độ giặt: cotton, mixed, quick wash, đồ mỏng.',
      'Vận hành êm, giảm rung lắc.',
      `${brandLabel} bảo hành chính hãng.`,
    ];
  }
  if (/tủ lạnh|tu lanh/i.test(name)) {
    return [
      'Ngăn đông mạnh, làm lạnh nhanh đồ uống và thực phẩm.',
      'Công nghệ Digital Inverter tiết kiệm điện.',
      'Khử mùi, kháng khuẩn ngăn bụi bẩn.',
      'Kệ điều chỉnh linh hoạt, ngăn rau quả riêng.',
      `${brandLabel} — tiết kiệm và bền bỉ.`,
    ];
  }
  if (/robot|hút bụi/i.test(name)) {
    return [
      'Định vị LDS/Laser lập bản đồ chính xác.',
      'Hút mạnh + lau nhà đa năng.',
      'Điều khiển app, hẹn giờ dọn dẹp.',
      'Tự sạc khi hết pin, vượt chướng ngại vật thông minh.',
      `${brandLabel} — giải pháp nhà thông minh.`,
    ];
  }
  return [
    `${brandLabel} — sản phẩm chính hãng, bảo hành tại TechPhone.`,
    'Thiết kế hiện đại, tiết kiệm năng lượng.',
    'Vận hành ổn định, dễ sử dụng hàng ngày.',
    'Phù hợp nhu cầu gia đình Việt.',
    'Hỗ trợ lắp đặt và tư vấn tại cửa hàng.',
  ];
}

function inferAccessoryHighlights(name, brand) {
  const mah = extractMah(name);
  const brandLabel = brand || name.split(' ')[0] || 'Thương hiệu';
  if (/sạc|charger/i.test(name)) {
    return [
      'Công nghệ GaN — nhỏ gọn, nhiệt thấp.',
      'Hỗ trợ PD/PPS sạc nhanh laptop và điện thoại.',
      'Nhiều cổng sạc đồng thời.',
      `${brandLabel} — thương hiệu phụ kiện uy tín quốc tế.`,
      'An toàn điện, bảo vệ quá dòng / quá áp.',
    ];
  }
  if (/chuột|mouse/i.test(name)) {
    return [
      'Cảm biến độ chính xác cao, phù hợp làm việc lâu.',
      'Kết nối Bluetooth + USB receiver.',
      'Ergonomic — giảm mỏi cổ tay.',
      `${brandLabel} — dòng MX dành cho dân văn phòng chuyên nghiệp.`,
      'Pin sạc USB-C, tương thích đa hệ điều hành.',
    ];
  }
  if (/bàn phím|keyboard/i.test(name)) {
    return [
      'Switch cơ tactile/linear — gõ sướng tay.',
      'Kết nối Bluetooth và cáp USB-C.',
      'Layout compact, dễ mang theo.',
      `${brandLabel} — tương thích macOS/Windows.`,
      'Đèn nền RGB / white backlight (tuỳ model).',
    ];
  }
  if (/tai nghe|headphone|earphone/i.test(name)) {
    return [
      'Chống ồn chủ động ANC — tập trung tốt hơn.',
      'Âm thanh cân bằng, bass rõ ràng.',
      'Pin lâu, sạc nhanh qua USB-C.',
      'Đeo thoải mái nhiều giờ liên tục.',
      `${brandLabel} chính hãng.`,
    ];
  }
  if (mah) {
    return [
      `Dung lượng ${mah} — sạc nhiều lần cho điện thoại.`,
      'Hỗ trợ sạc nhanh PD 18W–30W.',
      'Thiết kế gọn, dễ bỏ túi balo.',
      'An toàn, bảo vệ thiết bị khi sạc.',
      `${brandLabel} — linh kiện chất lượng.`,
    ];
  }
  return [
    `${brandLabel} — phụ kiện chính hãng.`,
    'Tương thích rộng với thiết bị phổ biến.',
    'Thiết kế bền, dùng bền hàng ngày.',
    'Bảo hành đầy đủ tại TechPhone.',
    'Giá tốt so với chất lượng.',
  ];
}

function getCategoryKey(category) {
  if (typeof category === 'string') return category;
  return category?.key || 'phu-kien';
}

function getProfile(product) {
  const legacyId = product.legacyId || product.id;
  if (legacyId && PRODUCT_PROFILES[legacyId]) {
    return PRODUCT_PROFILES[legacyId];
  }

  const name = product.name || 'Sản phẩm';
  const brand = product.brand || '';
  const categoryKey = getCategoryKey(product.category);

  let highlights = [];
  if (categoryKey === 'dien-thoai' || categoryKey === 'may-tinh-bang') {
    highlights =
      categoryKey === 'may-tinh-bang'
        ? inferTabletHighlights(name)
        : inferPhoneHighlights(name, brand);
  } else if (categoryKey === 'laptop') {
    highlights = inferLaptopHighlights(name);
  } else if (categoryKey === 'may-lanh') {
    highlights = inferAcHighlights(name, brand);
  } else if (categoryKey === 'dien-may') {
    highlights = inferApplianceHighlights(name, brand);
  } else {
    highlights = inferAccessoryHighlights(name, brand);
  }

  return {
    highlights,
    sections: [
      {
        title: 'Trải nghiệm sử dụng thực tế',
        body: `${name} được TechPhone nhập khẩu chính hãng, đảm bảo nguồn gốc rõ ràng và chế độ bảo hành theo tiêu chuẩn nhà sản xuất. Sản phẩm phù hợp nhu cầu sử dụng hàng ngày của người dùng Việt, từ học tập, làm việc đến giải trí.`,
      },
    ],
  };
}

function renderHtml(product, profile) {
  const name = escapeHtml(product.name || 'Sản phẩm');
  const categoryKey = getCategoryKey(product.category);
  const categoryLabelMap = {
    'dien-thoai': 'smartphone',
    'may-tinh-bang': 'máy tính bảng',
    laptop: 'laptop',
    'may-lanh': 'máy lạnh',
    'dien-may': 'thiết bị điện máy gia dụng',
    'phu-kien': 'phụ kiện công nghệ',
  };
  const categoryLabel = categoryLabelMap[categoryKey] || 'sản phẩm công nghệ';

  const highlightsHtml = profile.highlights
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');

  const sectionsHtml = profile.sections
    .map(
      (section) =>
        `<p><strong>${escapeHtml(section.title)}</strong></p><p>${escapeHtml(section.body)}</p>`,
    )
    .join('');

  return `<p><strong>${name}</strong> là ${categoryLabel} chính hãng, được tuyển chọn bởi TechPhone với cam kết nguồn gốc rõ ràng, bảo hành đầy đủ và giá cạnh tranh trên thị trường.</p>
<p>Sản phẩm hướng tới người dùng cần trải nghiệm ổn định, thiết kế gọn gàng và các tính năng thiết thực cho cuộc sống hằng ngày — từ làm việc, học tập, giải trí đến chăm sóc gia đình.</p>
<h3><strong>Điểm nổi bật chính của ${name}</strong></h3>
<ul>${highlightsHtml}</ul>
<h3><strong>Chi tiết sản phẩm</strong></h3>
${sectionsHtml}
<p><strong>Cam kết tại TechPhone</strong></p>
<p>Mua ${name} tại TechPhone, khách hàng được tư vấn miễn phí, hỗ trợ trả góp 0% (tuỳ chương trình), giao hàng toàn quốc và bảo hành chính hãng. Đội ngũ kỹ thuật sẵn sàng hỗ trợ kích hoạt, sao lưu dữ liệu và hướng dẫn sử dụng sau khi mua.</p>
<p class="MsoNormal"><i><strong>Lưu ý:</strong> Thông số kỹ thuật có thể thay đổi theo phiên bản và thị trường. Vui lòng xem tem nhãn trên hộp sản phẩm và tài liệu hướng dẫn kèm theo để biết thông tin chính xác nhất.</i></p>`;
}

/**
 * @param {{ name: string, brand?: string, category?: { key: string } | string, legacyId?: number, id?: number, description?: string }} product
 * @param {{ force?: boolean }} [options]
 */
export function buildProductDescription(product, options = {}) {
  const { force = false } = options;
  const existing = (product.description || '').trim();

  if (!force && existing && existing !== PLACEHOLDER && existing.length > 400 && looksLikeHtml(existing)) {
    return existing;
  }

  const profile = getProfile(product);
  return renderHtml(product, profile);
}

function looksLikeHtml(text) {
  return /<[a-z][\s\S]*>/i.test(text);
}

export function isPlaceholderDescription(description = '') {
  const trimmed = description.trim();
  return !trimmed || trimmed === PLACEHOLDER || trimmed.length < 80;
}

export { PLACEHOLDER };
