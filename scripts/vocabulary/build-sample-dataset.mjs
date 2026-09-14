import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const out = path.join(root, "raw_data/vocabulary/mapped-accepted.jsonl");

/** Curated MVP sample (~150 senses) mapped to existing General topic slugs. */
const DATASETS = {
  work: {
    level: "INTERMEDIATE",
    items: [
      ["deadline", "hạn chót", "/ˈded.laɪn/", "We have a tight deadline for this project."],
      ["workload", "khối lượng công việc", "/ˈwɜːk.ləʊd/", "My workload increased after the promotion."],
      ["collaborate", "hợp tác", "/kəˈlæb.ə.reɪt/", "We collaborate with the design team every week."],
      ["colleague", "đồng nghiệp", "/ˈkɒl.iːɡ/", "Ask a colleague if you need help."],
      ["meeting", "cuộc họp", "/ˈmiː.tɪŋ/", "The meeting starts at nine."],
      ["promotion", "sự thăng chức", "/prəˈməʊ.ʃən/", "She received a promotion last month."],
      ["overtime", "làm thêm giờ", "/ˈəʊ.və.taɪm/", "He worked overtime to finish the report."],
      ["resume", "sơ yếu lý lịch", "/ˈrez.jʊ.meɪ/", "Please update your resume before applying."],
      ["interview", "phỏng vấn", "/ˈɪn.tə.vjuː/", "I have a job interview tomorrow."],
      ["salary", "mức lương", "/ˈsæl.ər.i/", "They offered a competitive salary."],
    ],
  },
  technology: {
    level: "INTERMEDIATE",
    items: [
      ["application", "ứng dụng phần mềm", "/ˌæp.lɪˈkeɪ.ʃən/", "Open the application on your phone."],
      ["device", "thiết bị", "/dɪˈvaɪs/", "This device needs a software update."],
      ["software", "phần mềm", "/ˈsɒft.weə/", "The software is easy to install."],
      ["password", "mật khẩu", "/ˈpɑːs.wɜːd/", "Never share your password with anyone."],
      ["download", "tải xuống", "/ˈdaʊn.ləʊd/", "Download the file before the meeting."],
      ["upload", "tải lên", "/ˈʌp.ləʊd/", "Please upload your documents tonight."],
      ["browser", "trình duyệt", "/ˈbraʊ.zə/", "Try opening the site in another browser."],
      ["network", "mạng", "/ˈnet.wɜːk/", "The office network is temporarily down."],
      ["update", "cập nhật", "/ˈʌp.deɪt/", "Install the latest update for security."],
      ["interface", "giao diện", "/ˈɪn.tə.feɪs/", "The new interface is clearer than before."],
    ],
  },
  travel: {
    level: "BEGINNER",
    items: [
      ["itinerary", "lịch trình chuyến đi", "/aɪˈtɪn.ər.ər.i/", "Our itinerary includes two museum visits."],
      ["accommodation", "chỗ ở", "/əˌkɒm.əˈdeɪ.ʃən/", "We booked accommodation near the station."],
      ["passport", "hộ chiếu", "/ˈpɑːs.pɔːt/", "Do not forget your passport at home."],
      ["luggage", "hành lý", "/ˈlʌɡ.ɪdʒ/", "Her luggage was waiting at the carousel."],
      ["airport", "sân bay", "/ˈeə.pɔːt/", "We arrived at the airport early."],
      ["ticket", "vé", "/ˈtɪk.ɪt/", "I bought a return ticket online."],
      ["souvenir", "quà lưu niệm", "/ˌsuː.vənˈɪə/", "She bought a souvenir for her sister."],
      ["tourist", "du khách", "/ˈtʊə.rɪst/", "Many tourists visit this city in summer."],
      ["journey", "hành trình", "/ˈdʒɜː.ni/", "The train journey took four hours."],
      ["destination", "điểm đến", "/ˌdes.tɪˈneɪ.ʃən/", "Paris was our final destination."],
    ],
  },
  "food-and-cooking": {
    level: "BEGINNER",
    items: [
      ["ingredient", "nguyên liệu", "/ɪnˈɡriː.di.ənt/", "Fresh ingredients make the dish better."],
      ["recipe", "công thức nấu ăn", "/ˈres.ɪ.pi/", "I followed a simple pasta recipe."],
      ["homemade", "tự làm ở nhà", "/ˌhəʊmˈmeɪd/", "She brought homemade cookies."],
      ["seasoning", "gia vị", "/ˈsiː.zən.ɪŋ/", "Add seasoning before serving."],
      ["boil", "đun sôi", "/bɔɪl/", "Boil the water for three minutes."],
      ["fry", "chiên", "/fraɪ/", "Fry the onions until golden."],
      ["bake", "nướng", "/beɪk/", "Bake the cake for thirty minutes."],
      ["spicy", "cay", "/ˈspaɪ.si/", "This soup is too spicy for me."],
      ["dessert", "món tráng miệng", "/dɪˈzɜːt/", "Ice cream is my favorite dessert."],
      ["appetite", "cảm giác thèm ăn", "/ˈæp.ɪ.taɪt/", "Walking outside improved my appetite."],
    ],
  },
  "health-and-fitness": {
    level: "INTERMEDIATE",
    items: [
      ["exercise", "tập thể dục", "/ˈek.sə.saɪz/", "I exercise three times a week."],
      ["balanced", "cân bằng", "/ˈbæl.ənst/", "A balanced diet supports good health."],
      ["workout", "buổi tập", "/ˈwɜːk.aʊt/", "Her morning workout lasts forty minutes."],
      ["wellbeing", "sức khỏe tổng thể", "/ˌwelˈbiː.ɪŋ/", "Sleep is important for wellbeing."],
      ["energy", "năng lượng", "/ˈen.ə.dʒi/", "Healthy food gives me more energy."],
      ["stretch", "giãn cơ", "/stretʃ/", "Stretch before you start running."],
      ["hydration", "bù nước", "/haɪˈdreɪ.ʃən/", "Hydration matters during long runs."],
      ["recovery", "hồi phục", "/rɪˈkʌv.ər.i/", "Rest is part of muscle recovery."],
      ["habit", "thói quen", "/ˈhæb.ɪt/", "Drinking water is a healthy habit."],
      ["strength", "sức mạnh", "/streŋθ/", "Lifting weights builds strength."],
    ],
  },
  study: {
    level: "INTERMEDIATE",
    items: [
      ["assignment", "bài tập được giao", "/əˈsaɪn.mənt/", "The assignment is due on Friday."],
      ["revise", "ôn tập", "/rɪˈvaɪz/", "I need to revise before the exam."],
      ["progress", "tiến bộ", "/ˈprəʊ.ɡres/", "She is making steady progress."],
      ["lecture", "bài giảng", "/ˈlek.tʃə/", "The lecture explained the main theory."],
      ["deadline", "hạn nộp bài", "/ˈded.laɪn/", "Do not miss the essay deadline."],
      ["research", "nghiên cứu", "/rɪˈsɜːtʃ/", "His research focuses on climate change."],
      ["notebook", "sổ ghi chép", "/ˈnəʊt.bʊk/", "Write key points in your notebook."],
      ["concentrate", "tập trung", "/ˈkɒn.sən.treɪt/", "It is hard to concentrate in a noisy room."],
      ["exam", "kỳ thi", "/ɪɡˈzæm/", "The final exam is next Monday."],
      ["scholarship", "học bổng", "/ˈskɒl.ə.ʃɪp/", "She won a scholarship to study abroad."],
    ],
  },
  hobbies: {
    level: "BEGINNER",
    items: [
      ["hobby", "sở thích", "/ˈhɒb.i/", "Reading is my favorite hobby."],
      ["leisure", "thời gian rảnh", "/ˈleʒ.ə/", "I paint in my leisure time."],
      ["collect", "sưu tầm", "/kəˈlekt/", "He collects vintage stamps."],
      ["outdoors", "ngoài trời", "/ˌaʊtˈdɔːz/", "We enjoy outdoors activities on weekends."],
      ["gardening", "làm vườn", "/ˈɡɑː.dən.ɪŋ/", "Gardening helps her relax."],
      ["photography", "nhiếp ảnh", "/fəˈtɒɡ.rə.fi/", "Photography is a rewarding hobby."],
      ["craft", "thủ công", "/krɑːft/", "She learned a new craft last year."],
      ["instrument", "nhạc cụ", "/ˈɪn.strə.mənt/", "He plays three musical instruments."],
      ["club", "câu lạc bộ", "/klʌb/", "Join a club to meet people."],
      ["volunteer", "tình nguyện", "/ˌvɒl.ənˈtɪə/", "They volunteer at the local library."],
    ],
  },
  shopping: {
    level: "BEGINNER",
    items: [
      ["bargain", "món hời", "/ˈbɑː.ɡɪn/", "This jacket was a real bargain."],
      ["discount", "giảm giá", "/ˈdɪs.kaʊnt/", "Students get a ten percent discount."],
      ["receipt", "hóa đơn", "/rɪˈsiːt/", "Keep the receipt in case you return it."],
      ["refund", "hoàn tiền", "/ˈriː.fʌnd/", "They offered a full refund."],
      ["cashier", "thu ngân", "/kæʃˈɪə/", "Pay at the cashier near the exit."],
      ["cart", "xe đẩy hàng", "/kɑːt/", "She filled the cart with groceries."],
      ["brand", "thương hiệu", "/brænd/", "I prefer this brand of shampoo."],
      ["expensive", "đắt", "/ɪkˈspen.sɪv/", "That watch is too expensive."],
      ["affordable", "vừa túi tiền", "/əˈfɔː.də.bəl/", "They sell affordable everyday clothes."],
      ["browse", "xem hàng", "/braʊz/", "We browse the shops without buying."],
    ],
  },
  transportation: {
    level: "BEGINNER",
    items: [
      ["commute", "đi làm hằng ngày", "/kəˈmjuːt/", "My commute takes about thirty minutes."],
      ["traffic", "giao thông đông đúc", "/ˈtræf.ɪk/", "Traffic is heavy during rush hour."],
      ["subway", "tàu điện ngầm", "/ˈsʌb.weɪ/", "Take the subway to the city center."],
      ["fare", "tiền vé", "/feə/", "The bus fare is cheaper with a card."],
      ["delay", "sự chậm trễ", "/dɪˈleɪ/", "There was a delay on the morning train."],
      ["route", "tuyến đường", "/ruːt/", "Choose a quieter route to school."],
      ["passenger", "hành khách", "/ˈpæs.ən.dʒə/", "Passengers must wear seat belts."],
      ["pedestrian", "người đi bộ", "/pəˈdes.tri.ən/", "Pedestrians wait for the green light."],
      ["vehicle", "xe cộ", "/ˈvɪə.kəl/", "Electric vehicles are becoming common."],
      ["transfer", "chuyển tuyến", "/ˈtræns.fɜː/", "You need to transfer at the next station."],
    ],
  },
  "daily-routine": {
    level: "BEGINNER",
    items: [
      ["routine", "thói quen hằng ngày", "/ruːˈtiːn/", "Exercise is part of my morning routine."],
      ["alarm", "báo thức", "/əˈlɑːm/", "My alarm rings at six thirty."],
      ["breakfast", "bữa sáng", "/ˈbrek.fəst/", "I eat breakfast before leaving home."],
      ["commute", "đi lại hằng ngày", "/kəˈmjuːt/", "I commute by bike when the weather is good."],
      ["schedule", "lịch trình", "/ˈʃed.juːl/", "My schedule is busy on Mondays."],
      ["chores", "việc nhà", "/tʃɔːz/", "I finish household chores after dinner."],
      ["nap", "giấc ngủ ngắn", "/næp/", "A short nap helps me feel refreshed."],
      ["wind", "thư giãn trước khi ngủ", "/wɪnd/", "I wind down by reading before bed."],
      ["punctual", "đúng giờ", "/ˈpʌŋk.tʃu.əl/", "She is always punctual for class."],
      ["habit", "thói quen", "/ˈhæb.ɪt/", "Brushing teeth is a daily habit."],
    ],
  },
  "family-and-friends": {
    level: "BEGINNER",
    items: [
      ["relative", "họ hàng", "/ˈrel.ə.tɪv/", "We visit relatives during the holiday."],
      ["supportive", "hay hỗ trợ", "/səˈpɔː.tɪv/", "My parents are very supportive."],
      ["sibling", "anh chị em", "/ˈsɪb.lɪŋ/", "I have two siblings."],
      ["close", "thân thiết", "/kləʊs/", "We have been close friends for years."],
      ["trust", "tin tưởng", "/trʌst/", "Trust is important in any friendship."],
      ["gathering", "buổi họp mặt", "/ˈɡæð.ər.ɪŋ/", "There is a family gathering this weekend."],
      ["neighbor", "hàng xóm", "/ˈneɪ.bə/", "Our neighbor watered the plants."],
      ["childhood", "thời thơ ấu", "/ˈtʃaɪld.hʊd/", "We met in childhood."],
      ["celebrate", "ăn mừng", "/ˈsel.ə.breɪt/", "We celebrate birthdays together."],
      ["advice", "lời khuyên", "/ədˈvaɪs/", "She gave me useful advice."],
    ],
  },
  "home-and-neighborhood": {
    level: "BEGINNER",
    items: [
      ["apartment", "căn hộ", "/əˈpɑːt.mənt/", "They rented a small apartment downtown."],
      ["neighborhood", "khu phố", "/ˈneɪ.bə.hʊd/", "This neighborhood is quiet at night."],
      ["furniture", "đồ nội thất", "/ˈfɜː.nɪ.tʃə/", "We bought new furniture last week."],
      ["balcony", "ban công", "/ˈbæl.kə.ni/", "Plants grow well on the balcony."],
      ["rent", "tiền thuê nhà", "/rent/", "The rent includes water and electricity."],
      ["suburb", "ngoại ô", "/ˈsʌb.ɜːb/", "They moved to a quieter suburb."],
      ["local", "địa phương", "/ˈləʊ.kəl/", "I shop at the local market."],
      ["convenient", "thuận tiện", "/kənˈviː.ni.ənt/", "The location is convenient for work."],
      ["spacious", "rộng rãi", "/ˈspeɪ.ʃəs/", "The living room feels spacious."],
      ["amenities", "tiện ích", "/əˈmiː.nə.tiz/", "The building has good amenities."],
    ],
  },
  "movies-and-music": {
    level: "INTERMEDIATE",
    items: [
      ["soundtrack", "nhạc phim", "/ˈsaʊnd.træk/", "The soundtrack stayed in my head."],
      ["performance", "phần trình diễn", "/pəˈfɔː.məns/", "Her performance received loud applause."],
      ["audience", "khán giả", "/ˈɔː.di.əns/", "The audience stood up at the end."],
      ["lyrics", "lời bài hát", "/ˈlɪr.ɪks/", "I love the lyrics of this song."],
      ["genre", "thể loại", "/ˈʒɒn.rə/", "What music genre do you prefer?"],
      ["scene", "cảnh phim", "/siːn/", "That scene was surprisingly funny."],
      ["director", "đạo diễn", "/daɪˈrek.tə/", "The director won an award."],
      ["concert", "buổi hòa nhạc", "/ˈkɒn.sət/", "We bought tickets for the concert."],
      ["melody", "giai điệu", "/ˈmel.ə.di/", "The melody is soft and memorable."],
      ["review", "bài đánh giá", "/rɪˈvjuː/", "I read a positive review before watching."],
    ],
  },
  "social-situations": {
    level: "INTERMEDIATE",
    items: [
      ["introduce", "giới thiệu", "/ˌɪn.trəˈdjuːs/", "Let me introduce you to my coworker."],
      ["invitation", "lời mời", "/ˌɪn.vɪˈteɪ.ʃən/", "Thank you for the dinner invitation."],
      ["polite", "lịch sự", "/pəˈlaɪt/", "Please be polite when you refuse."],
      ["conversation", "cuộc trò chuyện", "/ˌkɒn.vəˈseɪ.ʃən/", "We had a long conversation after class."],
      ["host", "người chủ trì", "/həʊst/", "The host welcomed everyone warmly."],
      ["guest", "khách", "/ɡest/", "Each guest brought a small gift."],
      ["apology", "lời xin lỗi", "/əˈpɒl.ə.dʒi/", "A sincere apology can repair trust."],
      ["compliment", "lời khen", "/ˈkɒm.plɪ.mənt/", "She gave him a kind compliment."],
      ["awkward", "ngượng nghịu", "/ˈɔː.kwəd/", "There was an awkward silence."],
      ["smalltalk", "tán gẫu", "/ˈsmɔːl.tɔːk/", "Smalltalk helps break the ice."],
    ],
  },
  "future-plans": {
    level: "INTERMEDIATE",
    items: [
      ["ambition", "hoài bão", "/æmˈbɪʃ.ən/", "Her ambition is to become a doctor."],
      ["goal", "mục tiêu", "/ɡəʊl/", "Set a clear goal for next year."],
      ["intend", "dự định", "/ɪnˈtend/", "I intend to study abroad."],
      ["plan", "kế hoạch", "/plæn/", "We plan to move next spring."],
      ["opportunity", "cơ hội", "/ˌɒp.əˈtjuː.nə.ti/", "This internship is a great opportunity."],
      ["career", "sự nghiệp", "/kəˈrɪə/", "He wants a career in design."],
      ["dream", "ước mơ", "/driːm/", "Follow your dream with patience."],
      ["prepare", "chuẩn bị", "/prɪˈpeə/", "Prepare early for the interview."],
      ["decision", "quyết định", "/dɪˈsɪʒ.ən/", "Choosing a university is a big decision."],
      ["longterm", "dài hạn", "/ˌlɒŋˈtɜːm/", "Saving money is a longterm plan."],
    ],
  },
  community: {
    level: "INTERMEDIATE",
    items: [
      ["community", "cộng đồng", "/kəˈmjuː.nə.ti/", "Our community organizes weekend cleanups."],
      ["volunteer", "tình nguyện viên", "/ˌvɒl.ənˈtɪə/", "Volunteers help at the food bank."],
      ["neighbor", "hàng xóm", "/ˈneɪ.bə/", "Be kind to your neighbors."],
      ["event", "sự kiện", "/ɪˈvent/", "The charity event raised a lot of money."],
      ["local", "địa phương", "/ˈləʊ.kəl/", "Support local businesses when you can."],
      ["donation", "khoản quyên góp", "/dəʊˈneɪ.ʃən/", "Every donation makes a difference."],
      ["public", "công cộng", "/ˈpʌb.lɪk/", "Keep public spaces clean."],
      ["belong", "thuộc về", "/bɪˈlɒŋ/", "I feel I belong in this group."],
      ["share", "chia sẻ", "/ʃeə/", "Neighbors share tools and advice."],
      ["improve", "cải thiện", "/ɪmˈpruːv/", "We want to improve the park together."],
    ],
  },
};

function main() {
  const rows = [];
  for (const [slug, group] of Object.entries(DATASETS)) {
    group.items.forEach(([word, meaning_vi, pronunciation_ipa, example_sentence], index) => {
      const cleaned = word.trim().toLowerCase();
      rows.push({
        source: "mvp-sample",
        source_ref: `${slug}:${cleaned}:${index + 1}`,
        source_sense_id: `${slug}:${cleaned}:${index + 1}`,
        word: cleaned,
        meaning_vi,
        definition_en: null,
        example_sentence,
        pronunciation_ipa,
        topic_slug: slug,
        level: group.level,
        status: "ACTIVE",
        score: 1,
        margin: 1,
      });
    });
  }
  return rows;
}

const rows = main();
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, rows.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");
console.log(`Wrote ${rows.length} sample vocabulary items to ${out}`);
