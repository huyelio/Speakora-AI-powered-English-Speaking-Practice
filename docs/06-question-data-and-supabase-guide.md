# Speakora — Question Data and Supabase Implementation Guide

## 1. Mục tiêu và phạm vi

Tài liệu này là kế hoạch thực thi cho giai đoạn Question Bank:

1. xác định nguồn dữ liệu hợp pháp cho IELTS Speaking, TOEIC Speaking và General English;
2. thu thập, kiểm duyệt và chuẩn hóa câu hỏi;
3. import dữ liệu vào Supabase;
4. xây API lấy câu hỏi ngẫu nhiên từ dữ liệu thật;
5. chuẩn bị dữ liệu và phân quyền cho trang quản trị sau này.

Thiết kế bảng nghiệp vụ chi tiết tiếp tục tuân theo
[`05-database-design.md`](./05-database-design.md). Tài liệu này bổ sung quy trình nguồn gốc,
giấy phép và triển khai thực tế.

> Đây là hướng dẫn kỹ thuật quản trị nội dung, không phải tư vấn pháp lý. Khi sản phẩm được
> phát hành công khai hoặc thương mại, cần người có thẩm quyền rà soát giấy phép và nhãn hiệu.

## 2. Chiến lược nguồn dữ liệu hợp pháp

### 2.1. Nguyên tắc mặc định

Nguồn an toàn nhất cho Question Bank là **câu hỏi do nhóm dự án tự biên soạn**, dựa trên cấu
trúc và năng lực cần đánh giá được công bố công khai, nhưng không sao chép hoặc diễn đạt lại
gần với câu hỏi có bản quyền. Mỗi câu phải có người viết, ngày tạo, người duyệt và hồ sơ nguồn.

Không scrape website, PDF, sách luyện thi, ứng dụng hoặc bộ đề trên Internet chỉ vì chúng có thể
truy cập miễn phí. “Miễn phí để xem/luyện tập” không đồng nghĩa với quyền sao chép, sửa đổi và
phân phối trong ứng dụng.

### 2.2. IELTS Speaking

- Dùng [IELTS sample test questions](https://ielts.org/take-a-test/preparation-resources/sample-test-questions)
  để hiểu cấu trúc Part 1, 2, 3 và dạng task, không import nguyên văn câu hỏi vào database.
- [Thông báo bản quyền IELTS](https://ielts.org/legal/ielts-copyright-and-trade-mark-statement)
  giới hạn tài liệu website cho mục đích cá nhân, phi thương mại; việc tái bản, sửa đổi hoặc dùng
  cho mục đích khác cần chấp thuận bằng văn bản.
- Luồng khuyến nghị: giáo viên/content writer tự viết bộ câu hỏi mới theo format, kiểm tra độ
  tương đồng, và gắn nhãn `ORIGINAL`. Nếu muốn dùng nguyên văn tài liệu IELTS, chỉ import sau
  khi có văn bản cấp phép và lưu phạm vi, thời hạn, lãnh thổ của giấy phép.
- Không dùng logo hoặc cách trình bày khiến người dùng hiểu Speakora được IELTS Partners bảo trợ.

### 2.3. TOEIC Speaking

- Dùng [tài liệu chuẩn bị TOEIC chính thức](https://www.ets.org/toeic/test-takers/prepare.html)
  để nghiên cứu các dạng task và trải nghiệm thi, không xem đó là giấy phép tái sử dụng.
- [Chính sách cấp phép ETS](https://www.ets.org/legal/permissions/licensing.html) yêu cầu xin phép
  khi sao chép nội dung có bản quyền. Chính sách cũng nêu ETS không cấp phép đăng tài liệu TOEIC
  lên website bên thứ ba không bảo mật.
- Luồng khuyến nghị: tự biên soạn nội dung theo các kỹ năng giao tiếp nơi làm việc (đọc đoạn văn
  mới, mô tả ảnh tự sở hữu, trả lời tình huống, dùng lịch biểu tự tạo, nêu ý kiến). Không sao chép
  câu hỏi, ảnh, audio, screenshot hoặc đáp án mẫu của ETS.
- Nếu dùng tên TOEIC trong sản phẩm/thông tin quảng bá, rà soát riêng quy định nhãn hiệu và yêu
  cầu phê duyệt của ETS.

### 2.4. General English

- Tự biên soạn câu hỏi theo các miền cá nhân, công cộng, giáo dục và nghề nghiệp; gắn mức A1–C2
  bằng [CEFR descriptors](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors).
  CEFR là khung tham chiếu để thiết kế mục tiêu năng lực, không phải ngân hàng câu hỏi sẵn để copy.
- Có thể dùng nội dung bên ngoài chỉ khi từng tài nguyên có giấy phép rõ ràng, ví dụ CC0 hoặc
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Với CC BY phải lưu tác giả, URL nguồn,
  URL giấy phép và ghi rõ nội dung đã được sửa đổi hay chưa.
- Nội dung “free” nhưng không có license minh thị được coi là `ALL_RIGHTS_RESERVED` và không
  được import nếu chưa có văn bản cho phép.
- Ảnh, audio và văn bản tham chiếu phải được kiểm tra giấy phép độc lập; giấy phép cho câu hỏi
  không tự động bao phủ asset đi kèm.

### 2.5. Danh sách chấp nhận nguồn

| Loại nguồn | Có thể import? | Điều kiện |
| --- | --- | --- |
| Nhóm dự án tự viết | Có | Có cam kết tác giả, review và kiểm tra trùng lặp |
| CC0 / public domain | Có | Lưu bằng chứng trạng thái và URL nguồn |
| CC BY | Có | Attribution đầy đủ, cho phép loại hình sử dụng dự kiến |
| CC BY-SA | Cân nhắc | Rà soát nghĩa vụ ShareAlike với database/sản phẩm |
| CC BY-NC | Không cho sản phẩm thương mại | Chỉ dùng khi phạm vi dự án chắc chắn phi thương mại |
| Website/PDF “free” không có license | Không | Phải có chấp thuận bằng văn bản |
| Đề thi thật/rò rỉ/sách scan | Không | Loại bỏ và ghi nhận lý do |
| Nội dung IELTS/ETS nguyên văn | Không mặc định | Chỉ dùng theo giấy phép riêng còn hiệu lực |

## 3. Hồ sơ nguồn và quyền sử dụng

Thiết kế hiện tại cần bổ sung bảng `content_sources` để không mất provenance khi import:

```sql
create table public.content_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_url text,
  author_name text,
  license_code text not null,
  license_url text,
  permission_reference text,
  attribution_text text,
  commercial_use_allowed boolean not null default false,
  adaptation_allowed boolean not null default false,
  permission_expires_at timestamptz,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.questions
  add column source_id uuid references public.content_sources(id),
  add column author_name text,
  add column review_status text not null default 'DRAFT'
    check (review_status in ('DRAFT', 'LEGAL_REVIEW', 'CONTENT_REVIEW', 'APPROVED', 'REJECTED'));
```

Mỗi question/asset phải truy ngược được về một trong ba bằng chứng:

- `ORIGINAL`: người viết và lịch sử review nội bộ;
- giấy phép công khai: URL nguồn + mã/URL license + attribution;
- giấy phép riêng: mã hợp đồng/email phê duyệt, phạm vi và ngày hết hạn.

Không lưu bản scan hợp đồng nhạy cảm trong bảng public. Chỉ lưu mã tham chiếu đến kho tài liệu
nội bộ có kiểm soát quyền.

## 4. Định dạng chuẩn hóa thống nhất

File trung gian nên là JSON Lines (`.jsonl`): mỗi dòng là một record độc lập, dễ validate, diff,
retry và import theo lô. UTF-8, thời gian theo UTC, mã ổn định dùng `UPPER_SNAKE_CASE`.

```json
{
  "schema_version": "1.0",
  "code": "GENERAL_TRAVEL_0001",
  "mode": "GENERAL",
  "question_type": "GENERAL_SITUATIONAL",
  "topic": { "slug": "travel", "name": "Travel" },
  "group": {
    "code": "GENERAL_AIRPORT_CHECKIN_001",
    "type": "SCENARIO",
    "title": "Airport check-in",
    "shared_context": "You are checking in for an international flight."
  },
  "prompt_text": "Ask whether you can change your seat and explain your preference.",
  "instruction_text": "Respond naturally to the airline employee.",
  "prompt_items": [
    { "type": "ROLE_GOAL", "content": "Request a seat change", "sequence_no": 1, "is_required": true }
  ],
  "assets": [],
  "difficulty_level": "INTERMEDIATE",
  "cefr_level": "B1",
  "prep_seconds": 15,
  "answer_seconds": 60,
  "replay_limit": 2,
  "config": { "learner_role": "passenger", "system_role": "airline employee" },
  "source": {
    "license_code": "ORIGINAL",
    "author_name": "Content Team",
    "source_url": null,
    "attribution_text": null
  },
  "review": { "status": "APPROVED", "reviewed_at": "2026-07-22T00:00:00Z" },
  "status": "ACTIVE",
  "version": 1
}
```

Quy tắc validation tối thiểu:

- `mode`, `question_type` và group phải tương thích theo bảng mapping trong thiết kế database;
- `prompt_text` không rỗng; `code` là duy nhất và không đổi sau khi publish;
- `prep_seconds >= 0`, `answer_seconds > 0`, `replay_limit >= 0`;
- IELTS Part 2 phải có bullet; TOEIC Describe Picture phải có asset ảnh hợp lệ;
- mọi asset phải có license/provenance và checksum;
- chỉ record `APPROVED` mới được chuyển thành `ACTIVE`;
- reject nội dung chứa PII, nội dung nguy hiểm hoặc có độ tương đồng cao với nguồn bị hạn chế.

## 5. Cấu hình kết nối Supabase

### 5.1. Biến môi trường

Project đang dùng các biến có sẵn sau:

```dotenv
PROJECT_URL=https://<project-ref>.supabase.co
PUBLISHABLE_KEY=<publishable-key>
SECRET_KEY=<server-secret-key>
```

- `PROJECT_URL` và `PUBLISHABLE_KEY` dùng cho client tuân theo RLS.
- `SECRET_KEY` chỉ dùng ở backend đáng tin cậy, có thể bypass RLS. Không đặt tiền tố
  `NEXT_PUBLIC_`, không gửi xuống browser, không log và không commit.
- `SUPABASE_PASSWORD` chỉ cần cho migration/CLI kết nối trực tiếp PostgreSQL.
- `SUPABASE_API_URL` không được code runtime hiện tại sử dụng; giữ lại nếu là biến của công cụ
  quản trị/migration riêng.

Cấu hình được đặt tại:

- `src/lib/supabase/config.ts`: đọc và validate biến môi trường;
- `src/lib/supabase/server.ts`: tạo public server client và admin client;
- `.env.example`: template không chứa secret.

Ví dụ sử dụng trong Route Handler server-side:

```ts
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const supabase = getSupabaseAdminClient();
const { data, error } = await supabase
  .from("questions")
  .select("id, code, prompt_text")
  .eq("status", "ACTIVE")
  .limit(1);

if (error) throw error;
```

Admin client không thay thế kiểm tra quyền ở API. Endpoint admin phải xác thực user, kiểm tra role
và validate payload trước khi gọi database.

## 6. Quy trình thu thập và import

### Giai đoạn A — Thu thập

1. Content writer tạo nội dung trong sheet/form có đủ trường chuẩn hóa và provenance.
2. Legal reviewer xác nhận loại license, phạm vi dùng và attribution.
3. Academic reviewer kiểm tra format, độ khó, ngôn ngữ và tính phù hợp văn hóa.
4. Export thành UTF-8 JSONL; không import trực tiếp từ dữ liệu chưa duyệt.

### Giai đoạn B — Validate và staging

1. Validate JSON Schema và business rules.
2. Chuẩn hóa whitespace, Unicode, slug, code và enum; không tự động “sửa” wording có bản quyền.
3. Tính checksum cho asset và phát hiện record trùng.
4. Import vào bảng staging với `batch_id`, `row_no`, `validation_errors`.
5. Xuất báo cáo; batch có lỗi không được publish một phần âm thầm.

### Giai đoạn C — Upsert transaction

Trong một transaction/RPC có quyền server:

1. upsert `content_sources`;
2. upsert `topics` và `question_groups` theo stable code;
3. upsert `questions` theo `code + version`;
4. replace có kiểm soát `question_prompt_items` và liên kết asset;
5. chỉ chuyển `status = ACTIVE` khi `review_status = APPROVED`;
6. ghi `import_batch_id`, người import và audit log.

Không dùng `delete + insert` cho câu đã xuất hiện trong session. Tạo version mới để snapshot lịch
sử vẫn đúng.

## 7. API lấy câu hỏi ngẫu nhiên

Endpoint dự kiến:

```http
GET /api/questions/random?mode=IELTS&type=IELTS_PART_1&difficulty=INTERMEDIATE&topic=travel
```

Response chỉ trả dữ liệu cần cho người học, không trả thông tin license nội bộ, prompt chấm điểm,
rubric nội bộ hoặc khóa quản trị:

```json
{
  "data": {
    "id": "uuid",
    "code": "IELTS_TRAVEL_0001",
    "mode": "IELTS",
    "question_type": "IELTS_PART_1",
    "prompt_text": "...",
    "instruction_text": null,
    "prompt_items": [],
    "assets": [],
    "prep_seconds": 0,
    "answer_seconds": 30,
    "replay_limit": 2
  }
}
```

Không dùng `ORDER BY random()` khi bảng lớn. Tạo PostgreSQL RPC lấy mẫu trên các hàng `ACTIVE`
đã lọc, hoặc duy trì `random_key` có index. API phải:

- whitelist enum/filter và giới hạn độ dài input;
- chỉ lấy question/group/type/mode đều đang active;
- tránh lặp bằng danh sách question gần đây của session/user;
- snapshot question version khi gắn vào practice session;
- trả `404` khi không có câu phù hợp và không fallback sang mode khác;
- thêm rate limit, request ID và log metadata không chứa secret.

## 8. Chuẩn bị trang quản trị

Các trạng thái nội dung nên đi theo luồng:

```text
DRAFT -> LEGAL_REVIEW -> CONTENT_REVIEW -> APPROVED -> ACTIVE
  |             |               |
  +----------> REJECTED <-------+
```

Trang quản trị sau này cần:

- lọc/tìm theo mode, type, topic, trạng thái, nguồn và batch import;
- tạo/sửa draft nhưng không sửa trực tiếp version đang được session sử dụng;
- preview cue card, asset và thời gian như learner UI;
- diff giữa các version, approve/reject kèm lý do;
- cảnh báo license hết hạn và tự ngăn publish khi quyền sử dụng không còn hiệu lực;
- audit log bất biến cho create, edit, approve, activate, deactivate và archive;
- phân quyền tối thiểu: writer, content reviewer, legal reviewer, publisher, admin.

## 9. Thứ tự triển khai đề xuất

1. Chốt migration Question Bank và bổ sung provenance/audit.
2. Viết JSON Schema + validator + 10 fixture cho mỗi mode.
3. Tạo staging/import RPC và chạy thử trên project Supabase development.
4. Viết RPC/API random và test filter, empty result, RLS, tránh lặp.
5. Mở rộng lên bộ nội dung đã được duyệt.
6. Xây trang quản trị sau khi workflow versioning và approval ổn định.

## 10. Checklist trước khi publish batch

- [ ] Mỗi câu và asset có nguồn/quyền sử dụng kiểm chứng được.
- [ ] Không chứa câu hỏi thi thật, nội dung rò rỉ hoặc bản scan không được phép.
- [ ] Attribution và nghĩa vụ license được lưu đầy đủ.
- [ ] Mode/type/topic/timer và asset bắt buộc hợp lệ.
- [ ] Academic review và legal review đã hoàn tất.
- [ ] Không có code trùng hoặc update phá lịch sử.
- [ ] Chỉ câu `APPROVED` được đặt `ACTIVE`.
- [ ] API/RLS không trả field nội bộ hoặc secret.
- [ ] Có thể rollback theo `import_batch_id` mà không xóa lịch sử đã dùng.

## 11. Chạy bộ dữ liệu mẫu và API hiện tại

Bộ seed mẫu dùng nội dung tự biên soạn và có thể chạy lại an toàn theo stable code:

```powershell
npm run seed:questions
npm run dev
```

Thử API:

```powershell
Invoke-RestMethod "http://localhost:3000/api/questions/random?mode=IELTS"
Invoke-RestMethod "http://localhost:3000/api/questions/random?mode=TOEIC&type=TOEIC_EXPRESS_OPINION"
Invoke-RestMethod "http://localhost:3000/api/questions/random?mode=GENERAL&topic=travel"
```

Script hiện seed 3 modes, 8 question types, 6 topics và 9 câu hỏi `ACTIVE`. Đây chỉ là fixture
development để kiểm tra pipeline, không phải bộ dữ liệu production đã qua quy trình duyệt đầy đủ.
