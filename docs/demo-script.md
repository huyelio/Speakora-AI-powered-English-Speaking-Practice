# Kịch bản demo Speakora

Thời lượng khoảng 15 phút. Bắt đầu từ `http://localhost:3000/onboarding`.

Mỗi phần gồm **Giới thiệu** (nói trước, cho biết đây là chức năng gì và bạn sắp làm gì), **Thao tác** (làm trên màn hình) và **Lời dẫn** (nói trong hoặc sau khi thao tác).

## Chuẩn bị trước khi demo

- [ ] Chạy cả hai tiến trình: `npm run dev` và `npm run worker`. Nếu thiếu worker, phần chấm bài nói sẽ đứng ở trạng thái chờ.
- [ ] Tạo sẵn **tài khoản A** mới, chưa onboarding, và đăng nhập sẵn. `/onboarding` chỉ có ý nghĩa với tài khoản chưa hoàn tất thiết lập.
- [ ] Chuẩn bị **tài khoản B** đã học vài phiên, để dùng cho phần hồ sơ, lịch sử và bảng xếp hạng, và để dự phòng nếu mạng lỗi.
- [ ] Cho phép trình duyệt dùng micro, kiểm tra loa.
- [ ] Mở sẵn các tab `/onboarding`, và `/profile` của tài khoản B trong cửa sổ ẩn danh.
- [ ] Làm thử một phiên luyện nói để biết thời gian chấm, và chuẩn bị sẵn câu trả lời tiếng Anh.

**Nên tránh khi demo:** kết quả C1/C2 ở phần kiểm tra nhanh, vì hiện chưa đủ câu hỏi nâng cao nên trang chủ sẽ không có gợi ý chủ đề. Hãy nói ở mức B1 tự nhiên, hoặc chọn sẵn B1.

## 1. Mở đầu (30 giây)

**Thao tác:** Đứng ở màn `/onboarding`, chưa bấm gì.

**Lời dẫn:**

> Người Việt học tiếng Anh nhiều năm nhưng vẫn ngại nói, vì thiếu môi trường luyện tập và thiếu người nhận xét. Speakora là ứng dụng luyện nói tiếng Anh bằng AI: người học nói thật, hệ thống nghe và phản hồi ngay. Hôm nay em sẽ demo theo đúng hành trình của một người dùng mới, từ lúc thiết lập tài khoản đến khi học và theo dõi tiến bộ.

## 2. Onboarding: cá nhân hóa từ đầu (2 phút)

**Giới thiệu:**

> Đây là màn thiết lập ban đầu, phần đầu tiên người dùng mới nhìn thấy sau khi đăng ký. Nó giúp Speakora biết người học là ai và cần gì. Bây giờ em sẽ đóng vai một người dùng mới và điền lần lượt ba bước thông tin.

**Thao tác:**

1. **Bước 1, Về bạn:** nhập tên, chọn B1, hoặc "Tôi chưa biết trình độ".
2. **Bước 2, Mục tiêu:** chọn "Giao tiếp hằng ngày" và "Du lịch".
3. **Bước 3, Nhịp học:** chọn 10 phút mỗi ngày và vài chủ đề yêu thích, ví dụ Travel.
4. Bấm **Tiếp tục** để sang bước 4.

**Lời dẫn:**

> Trình độ dùng chuẩn CEFR từ A1 đến C2. Nếu người học chưa biết mình ở đâu, họ chọn "chưa biết" và hệ thống sẽ đánh giá giúp. Mục tiêu, thời lượng và chủ đề yêu thích sẽ quyết định những gì ứng dụng gợi ý sau này.

## 3. Quick Speaking Check: đánh giá bằng giọng nói (2 phút)

**Giới thiệu:**

> Tiếp theo là Quick Speaking Check, bài kiểm tra nói nhanh để xác định điểm bắt đầu của người học. Bây giờ em sẽ trả lời 3 câu hỏi bằng giọng nói thật, sau đó xem hệ thống đánh giá trình độ ra sao.

**Thao tác:** Bấm **Kiểm tra nhanh**, trả lời 3 câu bằng giọng nói, chờ màn **Điểm bắt đầu của bạn**.

**Lời dẫn:**

> Thay vì bài trắc nghiệm, người học chỉ nói 3 câu với độ khó tăng dần. Giọng nói được chuyển thành văn bản, rồi AI ước tính trình độ CEFR, kèm một nhận xét và một gợi ý. Đây là ước tính ban đầu từ 3 câu, không phải chứng chỉ, và ứng dụng ghi rõ điều đó trên màn hình.

**Điểm kỹ thuật nếu được hỏi:** kết quả AI được kiểm tra theo schema trước khi lưu. Bài chấm từ văn bản không đánh giá phát âm.

## 4. Trang chủ: biết hôm nay nên học gì (1 phút)

**Giới thiệu:**

> Đây là trang chủ, nơi người học quay lại mỗi ngày. Trang này tổng hợp việc nên học hôm nay và các chủ đề được gợi ý. Em sẽ đi qua các khu vực chính trên màn hình này.

**Thao tác:** Bấm tiếp tục để vào `/dashboard`. Chỉ vào thẻ bài học tiếp theo, mục **Luyện thêm** và **Chủ đề gợi ý**.

**Lời dẫn:**

> Sau khi thiết lập, người học không phải tự nghĩ hôm nay học gì. Ứng dụng đưa ra một bài học tiếp theo rõ ràng và các chủ đề hợp với trình độ. Bốn kỹ năng chính nằm trên thanh điều hướng: Từ vựng, Luyện nói, Hội thoại AI và Luyện thi IELTS.

## 5. Từ vựng: học theo 5 bước (3 phút)

**Giới thiệu:**

> Đây là chức năng Từ vựng, nơi người học học từ theo chủ đề, gồm cả nghĩa, cách dùng và phát âm. Bây giờ em sẽ chọn chủ đề Travel và học thử một phiên từ đầu đến cuối.

**Thao tác:**

1. Vào **Từ vựng**, chọn chủ đề Travel.
2. Chỉ vào danh sách từ và huy hiệu CEFR của từng từ.
3. Bắt đầu phiên học, đi qua **Làm quen**, **Phát âm**, **Nhớ từ**, **Ngữ cảnh**, **Tổng kết**.
4. Ở bước Phát âm, đọc một từ rồi cho xem kết quả.

**Lời dẫn:**

> Mỗi chủ đề đều có cả từ dễ và từ khó, nên độ khó được gắn cho từng từ chứ không phải cả chủ đề. Một phiên có 6 từ, trộn từ mới với từ cần ôn. Người học nghe từ, tự đọc, gõ lại từ theo nghĩa, rồi điền từ vào câu. Ở bước phát âm, Azure Speech chấm đến từng âm tiết, nên người học biết chính xác mình sai ở đâu.

**Lưu ý:** đừng nói app đã tự trộn từ khó dần theo tiến độ, vì phần này chưa làm. Có thể giới thiệu đây là hướng phát triển.

## 6. Luyện nói theo chủ đề (2,5 phút)

**Giới thiệu:**

> Đây là chức năng Luyện nói, nơi người học trả lời các câu hỏi theo chủ đề và được AI nhận xét bài nói. Bây giờ em sẽ chọn một chủ đề, trả lời thử một câu, rồi cho xem một kết quả đã chấm.

**Thao tác:**

1. Vào **Luyện nói**, chỉ vào ô tìm kiếm và bộ lọc trình độ.
2. Chọn một chủ đề, chọn mức B1–B2, bấm bắt đầu.
3. Trả lời một câu, rồi mở một phiên đã chấm xong ở tài khoản B nếu không muốn chờ cả 5 câu.
4. Cho xem kết quả: **Phát âm**, **Độ trôi chảy**, **Nhịp nói**, **Ưu tiên lần tới**, **Điểm mạnh**, **Cần cải thiện**.

**Lời dẫn:**

> Người học trả lời 5 câu hỏi theo chủ đề. Bài nói được xử lý ở một worker chạy nền, nên nếu trình duyệt đóng thì kết quả vẫn không mất. Phản hồi không chỉ là một con số: ứng dụng nêu một việc ưu tiên cho lần sau, điểm mạnh, điểm cần cải thiện và một cách diễn đạt nên dùng. Sau mỗi phiên, người học nhận XP và duy trì chuỗi ngày học.

## 7. Hội thoại AI: nhập vai tình huống thật (2,5 phút)

**Giới thiệu:**

> Đây là chức năng Hội thoại AI, nơi người học nhập vai và trò chuyện với AI trong một tình huống thật. Bây giờ em sẽ thử tình huống gọi đồ ở quán café, nói vài lượt, rồi xem phần nhận xét sau hội thoại.

**Thao tác:**

1. Vào **Hội thoại AI**, chọn "Ordering at a café".
2. Nói ít nhất 3 lượt, nghe AI trả lời bằng giọng nói.
3. Chỉ vào các mục tiêu được đánh dấu hoàn thành khi hội thoại diễn ra.
4. Kết thúc hội thoại và cho xem nhận xét theo 4 tiêu chí.

**Lời dẫn:**

> Đây là phần gần với giao tiếp thật nhất. AI đóng vai nhân viên quán, trả lời theo những gì người học vừa nói và điều chỉnh ngôn ngữ theo trình độ CEFR của họ. Sau hội thoại, người học được nhận xét về độ trôi chảy, từ vựng, ngữ pháp và khả năng tương tác, kèm câu viết lại tự nhiên hơn và các cụm từ nên dùng.

## 8. Luyện thi IELTS (1 phút)

**Giới thiệu:**

> Đây là chức năng Luyện thi IELTS, dành cho người cần ôn phần thi Speaking. Em sẽ giới thiệu màn bắt đầu, rồi mở một bài đã chấm để xem kết quả.

**Thao tác:** Vào **Luyện thi IELTS**, giới thiệu màn bắt đầu. Mở một kết quả IELTS có sẵn ở tài khoản B để xem band.

**Lời dẫn:**

> Với người cần thi chứng chỉ, Speakora mô phỏng đủ phần thi Speaking và ước tính band. Band này là ước tính của AI dựa trên transcript, không phải điểm chính thức, nên ứng dụng ghi rõ điều đó. Chế độ tiếng Anh giao tiếp thì không hiển thị band.

## 9. Hồ sơ, tiến độ và động lực (1 phút)

**Giới thiệu:**

> Phần cuối là Hồ sơ, Lịch sử và Bảng xếp hạng, nơi người học theo dõi tiến bộ của mình. Vì tài khoản mới chưa có dữ liệu, em sẽ chuyển sang một tài khoản đã học vài phiên để minh họa.

**Thao tác:** Chuyển sang tài khoản B, mở `/profile`, rồi `/history`, rồi `/leaderboard`.

**Lời dẫn:**

> Hồ sơ cho thấy chuỗi ngày học, XP và trình độ theo từng kỹ năng. Kỹ năng chưa được đánh giá sẽ hiện là chưa đánh giá, ứng dụng không tự suy đoán. Lịch sử lưu lại mọi phiên luyện, còn bảng xếp hạng tuần tạo thêm động lực, và người học có thể chọn không hiển thị. Ứng dụng cũng có tiếng Anh, đổi được trong phần Cài đặt.

## 10. Kết thúc (30 giây)

**Lời dẫn:**

> Tóm lại, từ lúc người học mở ứng dụng, Speakora xác định trình độ bằng chính giọng nói của họ, rồi đưa họ vào vòng lặp: học từ, nói, nhận phản hồi và theo dõi tiến bộ. Hướng phát triển tiếp theo là tự điều chỉnh độ khó từ vựng theo tiến độ và mở rộng ngân hàng nội dung nâng cao. Em xin cảm ơn, mọi người có thể đặt câu hỏi.

## Xử lý sự cố

| Sự cố | Cách xử lý |
|---|---|
| Kết quả chấm bị chờ lâu | Kiểm tra `npm run worker`, chuyển sang phiên đã chấm ở tài khoản B |
| Micro không thu được | Kiểm tra quyền micro của trình duyệt. Ở Hội thoại AI có thể nhập văn bản thay vì nói |
| Mạng hoặc OpenAI lỗi | Dùng dữ liệu có sẵn ở tài khoản B và trình bày kết quả đã lưu |
| Quick Check ra C1/C2 | Vào `/profile` đổi trình độ về B1, hoặc dùng tài khoản dự phòng |
| Trang chủ không có gợi ý | Vào thẳng **Luyện nói** và chọn chủ đề |

## Câu hỏi có thể gặp

- **Vì sao tách worker?** Chấm bài mất thời gian, nên job được lưu bền trong database và xử lý nền. Trình duyệt đóng hay mạng chập chờn vẫn không mất bài.
- **Làm sao tránh cộng XP hai lần?** Mỗi lần nộp có khóa idempotency và sự kiện XP được khử trùng lặp. Gửi lại chỉ trả về bản ghi đã có.
- **AI có chấm sai không?** Có thể. Vì vậy kết quả được kiểm tra theo schema, ví dụ câu trích dẫn phải có trong bài nói, và luôn ghi rõ là ước tính.
- **Nhãn CEFR của từ vựng lấy từ đâu?** Do AI ước lượng, chưa đối chiếu với danh sách chính thức. Bộ từ B2–C2 hiện là dữ liệu mẫu.
- **Dữ liệu giọng nói có an toàn không?** File ghi âm nằm trong bucket riêng tư, và server kiểm tra quyền sở hữu ở mọi lần đọc.
