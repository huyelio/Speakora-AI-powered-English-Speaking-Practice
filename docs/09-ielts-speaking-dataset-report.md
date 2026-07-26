# Báo cáo dataset IELTS Speaking

**Dataset:** `raw_data/IELTS Test.csv`  
**Ngày kiểm tra:** 26/07/2026  
**Phạm vi:** cấu trúc dữ liệu, độ phủ Part/chủ đề, tính hợp lệ khi import và khả năng truy xuất nguồn.

## 1. Kết luận điều hành

Dataset gồm **122 câu hỏi IELTS Speaking**, được chia thành **5 bộ test** (`T01`–`T05`) và có đủ ba phần của bài thi Speaking:

| Phần | Số bản ghi | Tỷ lệ |
| --- | ---: | ---: |
| Part 1 — Introduction and Interview | 67 | 54,9% |
| Part 2 — Individual Long Turn/Cue Card | 5 | 4,1% |
| Part 3 — Discussion | 50 | 41,0% |
| **Tổng** | **122** | **100%** |

Dataset có cấu trúc tốt để làm dữ liệu demo:

- 122/122 dòng vượt qua công cụ kiểm tra import;
- không thiếu trường bắt buộc;
- không trùng `code` hoặc nội dung `prompt`;
- cả 122 câu đều ở trạng thái `ACTIVE`;
- mỗi bộ test có đủ Part 1, Part 2 và Part 3;
- chủ đề Part 2 và Part 3 trong từng bộ có quan hệ hợp lý.

Tuy nhiên, **chưa thể xác nhận đây là dataset lấy từ nguồn IELTS chính thức**. File không chứa `source_name`, `source_url`, tác giả, giấy phép hoặc bằng chứng đối chiếu từng câu. Kết luận đúng hiện tại là:

> Dataset tự xây dựng hoặc chưa rõ nguồn, có cấu trúc mô phỏng đúng IELTS Speaking; không phải dataset chính thức đã được xác minh.

## 2. Nguồn tham chiếu chính thống

Các nguồn dưới đây được dùng để kiểm tra format, không phải để chứng minh nguồn gốc từng câu trong CSV:

1. [IELTS — Speaking test format](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking)  
   Xác nhận bài Speaking kéo dài 11–14 phút, có ba phần; Part 1 hỏi chủ đề quen thuộc, Part 2 là lượt nói dài với một phút chuẩn bị, Part 3 thảo luận vấn đề liên quan ở mức khái quát và trừu tượng hơn.

2. [IELTS — Official sample test questions](https://ielts.org/take-a-test/preparation-resources/sample-test-questions)  
   Đây là trang tập hợp câu hỏi và tài liệu luyện tập chính thức của IELTS.

3. [IELTS — Academic sample test questions](https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test)  
   Xác nhận Speaking của IELTS Academic và General Training có cùng format.

4. [IELTS — Copyright and trade mark statement](https://ielts.org/legal/ielts-copyright-and-trade-mark-statement)  
   Nội dung trên IELTS.org thuộc hoặc được cấp phép cho IELTS Partners. Việc tái sử dụng, sửa đổi hoặc xuất bản lại ngoài phạm vi cá nhân/phi thương mại có thể cần sự cho phép bằng văn bản.

### Đánh giá provenance

CSV hiện chỉ có các cột:

```text
code, mode, type, topic, prompt, bullets, difficulty, status
```

Không có:

- `source_name`;
- `source_url`;
- `author_name`;
- `license`;
- `is_official`;
- `review_status`;
- ngày truy cập hoặc phiên bản nguồn.

Công cụ import sẽ tự gán `source_name = manual-csv-import` khi CSV không cung cấp nguồn. Giá trị này chỉ mô tả phương thức import, không chứng minh nguồn nội dung.

## 3. Cấu trúc dataset

### 3.1. IELTS Speaking Part 1

Part 1 có **67 câu**, thuộc **15 chủ đề** quen thuộc:

| Chủ đề | Số câu |
| --- | ---: |
| work-or-studies | 6 |
| learning-english | 5 |
| holidays | 5 |
| hometown | 5 |
| mobile-phones | 5 |
| parks | 5 |
| teachers | 4 |
| daily-routine | 4 |
| messages | 4 |
| plans | 4 |
| public-transport | 4 |
| recycling | 4 |
| social-media | 4 |
| weather | 4 |
| working-with-others | 4 |

Nội dung chủ yếu hỏi về bản thân, thói quen, trải nghiệm và sở thích. Điều này phù hợp mục tiêu Part 1 theo mô tả chính thức: trả lời câu hỏi về các chủ đề quen thuộc và trải nghiệm thông thường.

### 3.2. IELTS Speaking Part 2

Part 2 có **5 cue card**, tương ứng năm chủ đề:

| Bộ test | Chủ đề | Nội dung chính |
| --- | --- | --- |
| T01 | learning-skills | Một kỹ năng học từ người khác |
| T02 | travel-places | Một nơi đã đến và muốn quay lại |
| T03 | useful-technology | Một thiết bị/công nghệ hữu ích |
| T04 | natural-places | Một địa điểm thiên nhiên đã ghé thăm |
| T05 | goals-and-ambition | Một mục tiêu muốn đạt được |

Mỗi cue card có **5 bullet gợi ý**. Tất cả đều có cấu trúc mô tả đối tượng/trải nghiệm, cung cấp chi tiết và giải thích lý do hoặc cảm nhận. Cấu trúc này phù hợp dạng long turn của Part 2.

Cấu hình import mặc định cho loại `IELTS_PART_2_CUE_CARD` là:

- chuẩn bị: 60 giây;
- trả lời: 120 giây;
- instruction: `You should say:`.

Các giá trị này phù hợp với format chính thức: một phút chuẩn bị và nói tối đa khoảng hai phút.

### 3.3. IELTS Speaking Part 3

Part 3 có **50 câu**, chia đều thành **10 chủ đề**, mỗi chủ đề 5 câu:

| Chủ đề | Số câu |
| --- | ---: |
| practical-skills | 5 |
| teachers-and-technology | 5 |
| reasons-for-travelling | 5 |
| tourism-development | 5 |
| communication | 5 |
| technology-in-daily-life | 5 |
| environmental-protection | 5 |
| nature-and-city-life | 5 |
| goals-and-motivation | 5 |
| success-in-society | 5 |

Các câu hỏi chủ yếu yêu cầu giải thích, so sánh, phân tích tác động hoặc đưa ra quan điểm xã hội. Mức độ này phù hợp Part 3, nơi thí sinh thảo luận chủ đề của Part 2 theo hướng tổng quát và trừu tượng hơn.

## 4. Cấu trúc năm bộ test

| Bộ test | Part 1 | Part 2 | Part 3 | Tổng |
| --- | ---: | ---: | ---: | ---: |
| T01 | 15 | 1 | 10 | 26 |
| T02 | 14 | 1 | 10 | 25 |
| T03 | 13 | 1 | 10 | 24 |
| T04 | 13 | 1 | 10 | 24 |
| T05 | 12 | 1 | 10 | 23 |
| **Tổng** | **67** | **5** | **50** | **122** |

### Quan hệ chủ đề Part 2 → Part 3

| Bộ | Part 2 | Hai cụm Part 3 | Đánh giá |
| --- | --- | --- | --- |
| T01 | learning-skills | practical-skills; teachers-and-technology | Liên quan rõ |
| T02 | travel-places | reasons-for-travelling; tourism-development | Liên quan rõ |
| T03 | useful-technology | communication; technology-in-daily-life | Liên quan rõ |
| T04 | natural-places | environmental-protection; nature-and-city-life | Liên quan rõ |
| T05 | goals-and-ambition | goals-and-motivation; success-in-society | Liên quan rõ |

Thiết kế này phù hợp logic IELTS: Part 3 phát triển từ chủ đề Part 2 sang thảo luận rộng và trừu tượng hơn.

Part 1 không bắt buộc phải liên quan trực tiếp đến Part 2/3. Các nhóm Part 1 trong dataset vẫn tạo được một phần mở đầu với các chủ đề quen thuộc.

## 5. Độ khó và trạng thái

| Độ khó | Số câu | Tỷ lệ |
| --- | ---: | ---: |
| INTERMEDIATE | 72 | 59,0% |
| ADVANCED | 50 | 41,0% |

- Tất cả Part 1 và Part 2 được gắn `INTERMEDIATE`.
- Tất cả Part 3 được gắn `ADVANCED`.
- Không có câu `BEGINNER`.
- 122/122 câu có trạng thái `ACTIVE`.

Việc Part 3 khó hơn Part 1/2 là hợp lý về mặt thực hành. Tuy nhiên, đây là nhãn nội bộ của sản phẩm, không phải cấp độ chính thức do IELTS công bố cho từng câu.

## 6. Kiểm tra chất lượng dữ liệu

### Kết quả đạt

| Kiểm tra | Kết quả |
| --- | --- |
| Tổng số bản ghi | 122 |
| Thiếu `code`, `mode`, `type`, `topic`, `prompt` | 0 |
| Thiếu `difficulty`, `status` | 0 |
| Trùng `code` | 0 |
| Trùng `prompt` | 0 |
| Cue card thiếu bullet | 0/5 |
| Dry-run import | Thành công 122/122 |

117 dòng không có `bullets` là đúng kỳ vọng vì chỉ 5 cue card Part 2 cần trường này.

### Hạn chế

1. **Không có provenance:** không xác định được câu nào là nguyên bản, phỏng theo nguồn nào hoặc được ai biên soạn.
2. **Không có giấy phép:** chưa đủ cơ sở pháp lý để phát hành như nội dung IELTS chính thức.
3. **Part 2 còn ít:** chỉ có 5 cue card, nên người dùng lặp lại câu khá nhanh.
4. **Phân bố theo test không đều:** T01 có 26 câu, T05 có 23 câu, chủ yếu do số lượng Part 1 khác nhau.
5. **Thiếu instruction trong CSV:** tool tự bổ sung `You should say:` cho Part 2; dữ liệu gốc chưa tự mô tả đầy đủ cách trình bày.
6. **Thiếu metadata vận hành:** chưa có `author`, `reviewer`, `review_status`, `created_at`, `source_url` và version nội dung.
7. **Chưa có đáp án mẫu hoặc rubric mapping:** dataset chỉ chứa câu hỏi, chưa có sample answer, từ vựng mục tiêu hoặc tiêu chí feedback theo câu.

## 7. Khuyến nghị trước khi sử dụng production

### Ưu tiên 1 — Gắn nguồn và quyền sử dụng

Bổ sung tối thiểu các cột:

```csv
source_name,source_url,author_name,license,is_official,review_status
```

Quy ước đề xuất:

- câu do nhóm tự viết: `source_name=Speakora Original`, `is_official=false`;
- câu phỏng theo format IELTS: ghi `inspired_by_url`, không ghi là câu IELTS chính thức;
- câu lấy nguyên văn: chỉ sử dụng khi có điều khoản hoặc giấy phép phù hợp và lưu bằng chứng;
- mọi câu phải qua `review_status=APPROVED` trước khi mở `ACTIVE`.

### Ưu tiên 2 — Tăng độ phủ

- tăng Part 2 từ 5 lên ít nhất 20–30 cue card;
- tạo 2–3 nhóm Part 3 cho mỗi cue card;
- bổ sung Part 1 để mỗi topic có khoảng 5–8 câu;
- tránh dùng một câu hỏi quá thường xuyên bằng lịch sử phân phối hoặc random có trọng số.

### Ưu tiên 3 — Hỗ trợ phiên luyện

Thêm trường liên kết để backend tạo phiên có chủ đích:

```text
test_set_code, sequence_no, parent_question_id, topic_family, question_role
```

Trong đó `question_role` có thể là:

```text
WARM_UP, CORE, FOLLOW_UP, CHALLENGE
```

Những trường này giúp tạo phiên 3–5 câu cùng chủ đề thay vì gọi random từng câu độc lập.

## 8. Kết luận

Dataset hiện tại **đủ tốt để làm dữ liệu demo và kiểm thử pipeline IELTS Speaking**. Nội dung có đủ ba Part, tổ chức thành năm bộ test hợp lý, Part 2–3 có liên kết chủ đề rõ và toàn bộ file vượt qua validator.

Dataset **chưa đủ điều kiện để được giới thiệu là “nguồn IELTS chính thống”** vì không có metadata nguồn và quyền sử dụng. Cách mô tả an toàn là:

> Bộ câu hỏi luyện tập do Speakora quản lý, được thiết kế theo format IELTS Speaking chính thức.

Trước khi dùng production hoặc công bố rộng rãi, cần hoàn thiện provenance, quy trình review nội dung và kiểm tra quyền sử dụng.
