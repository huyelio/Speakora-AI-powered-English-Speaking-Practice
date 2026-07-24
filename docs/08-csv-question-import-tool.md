# Import câu hỏi từ CSV

## CSV tối thiểu

```csv
code,mode,type,topic,prompt
IELTS_T01_P1_001,IELTS,IELTS_PART_1,work-or-studies,Do you work or are you a student?
```

- `code`: mã câu hỏi duy nhất.
- `mode`: `IELTS`, `TOEIC` hoặc `GENERAL`.
- `type`: mã loại câu hỏi đã có trong DB.
- `topic`: slug của chủ đề, ví dụ `work-or-studies`.
- `prompt`: nội dung câu hỏi.

Có thể thêm `bullets`, `difficulty`, `status`; trong đó các bullet ngăn cách bằng `|`.

## Import một file

Chạy tại thư mục gốc dự án:

```powershell
npm run questions:import -- "raw_data/IELTS Test.csv"
```

Tool tự kiểm tra dữ liệu, tạo topic chưa tồn tại và upsert câu hỏi theo `code`. Chạy lại cùng file sẽ cập nhật câu hỏi cũ, không tạo bản sao.

## Question thuộc topic nào?

CSV `topic=work-or-studies` được đối chiếu với `topics.slug`. Sau đó tool lưu `topics.id` vào `questions.topic_id`:

```text
questions.topic_id -> topics.id
```

Muốn xem tên topic trong Supabase, join `questions.topic_id` với `topics.id` và đọc `topics.name` hoặc `topics.slug`.
