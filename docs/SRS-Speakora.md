# PHÂN TÍCH YÊU CẦU VÀ CHỨC NĂNG HỆ THỐNG SPEAKORA

## 1. Giới thiệu

### 1.1. Tên hệ thống

Speakora – Adaptive AI-powered English Speaking Practice System

### 1.2. Mô tả tổng quan

Speakora là hệ thống hỗ trợ luyện nói tiếng Anh ứng dụng trí tuệ nhân tạo, hướng tới việc xây dựng trải nghiệm học tập thích ứng theo từng người học.

Khác với các hệ thống chỉ cung cấp chủ đề luyện nói và phản hồi sau mỗi lần thực hành, Speakora duy trì một hồ sơ năng lực người học – Learner Model được cập nhật liên tục từ kết quả luyện tập.

Dữ liệu về năng lực, lỗi lặp lại, mục tiêu học tập và lịch sử luyện tập được sử dụng để:

- xác định điểm mạnh và điểm yếu của người học;
- đề xuất nội dung luyện tập phù hợp;
- xây dựng lộ trình học cá nhân hóa;
- tạo bài ôn tập dựa trên lỗi thực tế;
- điều chỉnh độ khó của bài luyện;
- theo dõi sự tiến bộ theo từng kỹ năng nói.

Hệ thống hỗ trợ ba hình thức luyện nói chính:

1. IELTS Speaking;
2. General English Speaking;
3. AI Role-play Conversation.

### 1.3. Định hướng của hệ thống

Speakora được xây dựng theo mô hình vòng lặp học tập:

Assess → Model → Plan → Practice → Analyze → Diagnose → Review → Adapt

Trong đó:

- Assess: đánh giá năng lực ban đầu;
- Model: xây dựng hồ sơ năng lực;
- Plan: tạo lộ trình và kế hoạch học;
- Practice: thực hiện bài luyện nói;
- Analyze: phân tích audio và transcript;
- Diagnose: phát hiện điểm yếu và lỗi;
- Review: tạo nội dung luyện tập lại;
- Adapt: cập nhật và điều chỉnh lộ trình.

Mục tiêu của hệ thống không chỉ là đưa ra feedback sau một bài nói mà còn sử dụng kết quả đó làm dữ liệu đầu vào cho lần học tiếp theo.

## 2. Bài toán của hệ thống

Các hệ thống luyện nói đơn giản thường hoạt động theo mô hình:

Chọn chủ đề → ghi âm → chuyển thành văn bản → AI đánh giá → hiển thị feedback.

Cách tiếp cận này tồn tại một số hạn chế:

- kết quả của các buổi luyện tập gần như độc lập với nhau;
- hệ thống chưa xây dựng được mô hình năng lực dài hạn của người học;
- người học vẫn phải tự quyết định nên luyện nội dung nào tiếp theo;
- feedback sau bài nói chưa được chuyển hóa thành bài luyện mới;
- việc đánh giá chủ yếu dựa trên transcript nên khó đánh giá chính xác pronunciation và spoken fluency;
- XP và streak phản ánh mức độ hoạt động nhưng chưa phản ánh trực tiếp sự cải thiện năng lực;
- thông tin profile và learning goal chưa được sử dụng sâu để cá nhân hóa nội dung học.

Speakora giải quyết vấn đề này bằng cách xây dựng một closed learning loop, trong đó dữ liệu sinh ra từ mỗi lần luyện tập được tái sử dụng để cập nhật hồ sơ năng lực và điều chỉnh nội dung luyện tập tiếp theo.

## 3. Mục tiêu hệ thống

Hệ thống hướng tới các mục tiêu sau:

1. Đánh giá được năng lực nói ban đầu của người học thay vì chỉ dựa vào trình độ người dùng tự khai báo.
2. Xây dựng và duy trì hồ sơ năng lực nói theo từng kỹ năng.
3. Phân tích cả transcript và dữ liệu audio để cung cấp đánh giá đầy đủ hơn.
4. Cá nhân hóa lộ trình học dựa trên:
    - mục tiêu;
    - trình độ;
    - lịch sử luyện tập;
    - điểm yếu;
    - lỗi lặp lại;
    - mức độ thành thạo kỹ năng.
5. Chuyển các lỗi trong quá trình luyện nói thành bài luyện tập tiếp theo.
6. Hỗ trợ nhiều ngữ cảnh luyện nói gồm IELTS, General English và hội thoại tình huống.
7. Theo dõi sự tiến bộ thực tế theo từng kỹ năng thay vì chỉ dựa trên XP hoặc số buổi học.
8. Cung cấp khả năng giải thích recommendation để người học biết vì sao hệ thống đề xuất một bài luyện cụ thể.

## 4. Phạm vi chức năng hệ thống

Speakora được tổ chức theo các nhóm chức năng dưới đây và các module tại mục 30.

Tài liệu mô tả cả thiết kế mục tiêu và chức năng đã triển khai. Các mục bổ sung về Vocabulary Practice, Word Pronunciation Practice, phục hồi phiên, khôi phục tài khoản và giao diện nêu rõ phạm vi hiện tại; việc tích hợp chúng vào Learner Model, Daily Plan, roadmap hoặc XP không được mặc định là đã triển khai.

### 4.1. Account and Learner Profile

Quản lý thông tin tài khoản và thông tin phục vụ cá nhân hóa quá trình học.

Các chức năng bao gồm:

- đăng ký tài khoản;
- đăng nhập;
- đăng xuất;
- xem và cập nhật hồ sơ;
- thiết lập trình độ hiện tại;
- thiết lập mục tiêu học tiếng Anh;
- thiết lập IELTS target band;
- lựa chọn chủ đề quan tâm;
- thiết lập thời lượng hoặc mục tiêu luyện tập;
- cập nhật learning preferences.

Thông tin này là một trong các nguồn dữ liệu đầu vào của recommendation engine.

### 4.2. Account Recovery và Appearance Preferences

Các chức năng đã có trong hệ thống hiện tại:

- yêu cầu email khôi phục mật khẩu;
- xử lý callback xác thực và cho phép đặt mật khẩu mới trong luồng khôi phục;
- chuyển đổi giao diện sáng/tối;
- khi chưa có lựa chọn được lưu, dùng tùy chọn giao diện của hệ điều hành; lưu lựa chọn sáng/tối trên trình duyệt.

Tùy chọn giao diện là cấu hình hiển thị cục bộ, không phải learning preference dùng để cá nhân hóa bài học.

## 5. Initial Speaking Assessment

### 5.1. Mục đích

Initial Speaking Assessment được thực hiện khi người dùng mới bắt đầu sử dụng hệ thống hoặc khi cần đánh giá lại năng lực.

Thay vì chỉ yêu cầu người dùng chọn:

- Beginner;
- Intermediate;
- Advanced;

hệ thống sử dụng một bài nói ngắn để thu thập dữ liệu thực tế.

### 5.2. Luồng xử lý

Bước 1: Hệ thống cung cấp một tập câu hỏi speaking assessment.

Bước 2: Người học trả lời bằng giọng nói.

Bước 3: Hệ thống lưu audio.

Bước 4: Speech-to-Text chuyển audio thành transcript.

Bước 5: Speech Analysis phân tích pronunciation và fluency.

Bước 6: AI Assessment phân tích grammar, vocabulary và coherence.

Bước 7: Hệ thống tạo baseline skill profile.

Các kỹ năng chính gồm:

- Pronunciation;
- Fluency;
- Grammar;
- Vocabulary;
- Coherence.

### 5.3. Kết quả

Ví dụ:

| Skill | Baseline |
|---|---:|
| Pronunciation | 55 |
| Fluency | 48 |
| Grammar | 63 |
| Vocabulary | 59 |
| Coherence | 61 |

Kết quả này được sử dụng để khởi tạo Learner Model.

## 6. Continuous Learner Model

### 6.1. Khái niệm

Learner Model là mô hình dữ liệu mô tả trạng thái năng lực hiện tại của từng người học.

Đây là thành phần trung tâm của chức năng personalization.

Learner Model không chỉ lưu một trường level, mà bao gồm nhiều loại dữ liệu.

### 6.2. Thành phần Learner Model

#### Skill profile

- Pronunciation;
- Fluency;
- Grammar;
- Vocabulary;
- Coherence.

#### Learning goal

Ví dụ:

- IELTS Speaking 6.5;
- improve everyday communication;
- improve workplace English;
- prepare for presentation;
- improve fluency.

#### Weakness

Ví dụ:

- Past Simple;
- article usage;
- weak linking expressions;
- excessive hesitation;
- /θ/ pronunciation.

#### Mistake history

Lưu các lỗi được phát hiện qua nhiều practice session.

#### Mastery

Thể hiện mức độ thành thạo một kỹ năng hoặc learning item.

Ví dụ:

Past Simple mastery: 48%

#### Practice history

Theo dõi:

- loại bài;
- thời gian;
- kết quả;
- kỹ năng được luyện;
- mistake;
- improvement.

## 7. Personalized Learning Roadmap

### 7.1. Mục tiêu

Personalized Roadmap trả lời câu hỏi:

Người học nên luyện gì tiếp theo?

Roadmap được xây dựng từ:

- learner goal;
- initial assessment;
- skill profile;
- weakness;
- mistake history;
- recent performance;
- practice history;
- user preference.

### 7.2. Ví dụ roadmap

Người dùng có mục tiêu:

IELTS Speaking 6.5

và hệ thống phát hiện:

- Fluency thấp;
- Past Tense thường xuyên sai;
- Vocabulary ở mức trung bình;
- Pronunciation ổn định.

Roadmap có thể ưu tiên:

**Week 1**

- Fluency foundations;
- Past tense storytelling;
- IELTS Part 1 practice.

**Week 2**

- Linking expressions;
- topic vocabulary;
- IELTS Part 2 storytelling.

**Week 3**

- extended answers;
- opinion development;
- IELTS Part 3.

## 8. Daily Learning Plan

Thay vì để người dùng luôn tự chọn bài học từ danh sách topic, Speakora có thể tạo kế hoạch học trong ngày.

Ví dụ:

**Today's Plan**

1. Smart Review – Past Simple – 4 phút
2. Pronunciation Practice – 3 phút
3. IELTS Part 2 – 8 phút
4. AI Role-play – 10 phút

Daily Plan được cập nhật dựa trên learner model.

Người dùng vẫn có thể lựa chọn practice ngoài roadmap nếu muốn.

## 9. Explainable Recommendation – Learning Evidence

Một recommendation không chỉ hiển thị:

**Recommended for you**

mà cần giải thích lý do.

Ví dụ:

Today's recommended lesson: Past Tense Storytelling

**Why this lesson?**

- Bạn mắc lỗi Past Simple 7 lần trong 3 session gần nhất.
- Grammar mastery của nội dung này hiện tại là 48%.
- Đây là kỹ năng ảnh hưởng đến mục tiêu IELTS Speaking 6.5 của bạn.

Sau khi hoàn thành bài:

Past Simple mastery: 48% → 61%

Nhờ đó, quá trình personalization có bằng chứng rõ ràng thay vì recommendation dạng hộp đen.

## 10. Speaking Practice

Hệ thống hỗ trợ ba nhóm practice chính.

### 10.1. IELTS Speaking Practice

Hỗ trợ:

- IELTS Speaking Part 1;
- IELTS Speaking Part 2;
- IELTS Speaking Part 3.

Một practice session bao gồm:

1. chọn hoặc nhận đề;
2. xem câu hỏi;
3. chuẩn bị nếu cần;
4. ghi âm câu trả lời;
5. xử lý audio;
6. tạo transcript;
7. đánh giá;
8. hiển thị feedback;
9. lưu kết quả;
10. cập nhật learner model.

IELTS assessment hướng tới bốn nhóm tiêu chí:

- Fluency and Coherence;
- Lexical Resource;
- Grammatical Range and Accuracy;
- Pronunciation.

### 10.2. General English Speaking

Cho phép người học luyện nói theo chủ đề thông thường.

Ví dụ:

- Travel;
- Education;
- Technology;
- Food;
- Work;
- Entertainment;
- Daily life.

Người dùng có thể:

- chọn topic được hệ thống cung cấp;
- nhận topic được recommendation engine đề xuất;
- nhập topic tùy chọn.

Hệ thống có thể sinh câu hỏi phù hợp với:

- level;
- goal;
- interest;
- weakness;
- learning history.

### 10.3. AI Role-play Conversation

AI Role-play cho phép người học luyện hội thoại nhiều lượt thay vì chỉ trả lời những câu hỏi độc lập.

Ví dụ scenario:

- Job Interview;
- Ordering Food;
- Airport Check-in;
- Project Presentation;
- Meeting with Client;
- Asking for Directions.

Flow:

Choose Scenario → Start Conversation → AI Response → User Response → AI Response → ... → End Conversation → Assessment

Sau conversation, hệ thống tổng hợp:

- key mistakes;
- pronunciation issues;
- vocabulary suggestions;
- fluency;
- useful expressions;
- priority weakness.

### 10.4. Vocabulary Practice

Vocabulary Practice là chế độ flashcard đã triển khai, yêu cầu đăng nhập và sử dụng ngân hàng từ vựng theo chủ đề General English.

Người học có thể:

- chọn chủ đề, level và số lượng từ từ 1 đến 20;
- xem flashcard từ vựng, nghĩa tiếng Việt, ví dụ và IPA khi dữ liệu có sẵn;
- nghe cách đọc từ bằng TTS;
- tự đánh dấu Remembered hoặc Not Remembered;
- hoàn thành và tải lại phiên đã lưu.

Mỗi phiên lưu snapshot nội dung và thứ tự từ để việc chỉnh sửa ngân hàng không làm thay đổi bài đang học. Review là tự đánh giá của người học, không phải kết quả AI, STT hoặc mastery. Chế độ này không yêu cầu nhập đáp án hay ghi âm và không sử dụng worker luyện nói.

Trong thiết kế mục tiêu, Vocabulary Practice có thể trở thành activity của Daily Plan và roadmap. Hiện chưa có tích hợp tự động với mistake history, mastery, spaced repetition hoặc XP/streak.

### 10.5. Word Pronunciation Practice

Word Pronunciation Practice là chế độ luyện phát âm từng từ đã triển khai, độc lập với đánh giá phát âm bổ sung của General Speaking.

Luồng hiện tại:

1. Người học đăng nhập, chọn chủ đề, level và 1–20 từ; mặc định 10 từ.
2. Hệ thống tạo phiên với snapshot từ, IPA, nghĩa tiếng Việt và level. Chỉ chọn từ đang hoạt động và có IPA.
3. Người học nghe TTS, ghi âm, nghe lại hoặc ghi lại trước khi gửi. Ghi âm tự dừng ở 60 giây.
4. Hệ thống lưu audio riêng tư và gửi từ snapshot làm reference text cho dịch vụ phân tích phát âm.
5. Giao diện hiển thị kết quả đã chuẩn hóa: accuracy, phản hồi âm tiết, IPA kỳ vọng/phát hiện khi có và dấu hiệu thiếu/thừa âm tiết.
6. Sau khi mọi từ có ít nhất một attempt thành công, hệ thống hiển thị tổng kết và cho phép tạo phiên luyện lại từ yếu.

Một từ được chọn để luyện lại khi overall accuracy dưới 80, có âm tiết accuracy dưới 70 hoặc có âm tiết thiếu/thừa. Quy tắc này khác nhãn WEAK của điểm overall, vốn áp dụng khi điểm dưới 70.

Một từ có thể có nhiều attempts. Kết quả sử dụng attempt thành công mới nhất; attempt thất bại sau đó không thay thế kết quả thành công. Khi tải lại phiên, người học tiếp tục từ từ đầu tiên chưa có kết quả thành công.

Kết quả và điểm của chế độ này không được xem là IELTS band hoặc mastery dài hạn. Hiện chưa tự cập nhật Learner Model, Daily Plan, roadmap hay XP/streak. Phần xem trước phát âm ở màn hình thiết lập chỉ là minh họa, không phải assessment của người học.

### 10.6. Session Recovery và Processing Retry

Hệ thống hiện hỗ trợ các cơ chế phục hồi sau:

- Speaking: giữ bản ghi và idempotency key khi upload thất bại để gửi lại; phiên IELTS dùng guest token và dữ liệu trong sessionStorage để phục hồi khi refresh.
- Speaking: theo dõi trạng thái xử lý và cho phép requeue job thất bại bằng audio đã lưu, không yêu cầu ghi âm lại. STT và assessment dùng durable jobs trong database, có retry với backoff và giới hạn attempts.
- Word Pronunciation: giữ bản ghi khi upload lỗi; người học chủ động retry attempt thất bại hoặc processing quá hạn ít nhất 5 phút bằng audio đã lưu. Không tự động gọi lại dịch vụ phân tích.
- AI Role-play: tải lại hội thoại qua URL chứa session ID; retry generation dùng transcript đã lưu, retry STT dùng audio đã lưu. Request bị gián đoạn có thể phải chờ lease tối đa 3 phút trước khi retry.

Idempotency phải ngăn việc gửi lại cùng một yêu cầu tạo bản ghi trùng. Dữ liệu phục hồi phải tuân theo quyền sở hữu tài khoản hoặc guest token; audio được lưu trong Storage riêng tư và chỉ truy cập qua luồng được ủy quyền.

Retry xử lý lỗi kỹ thuật không đồng nghĩa với ghi câu trả lời mới để cải thiện kỹ năng. Bản ghi cục bộ chưa gửi không được bảo đảm khôi phục sau khi rời trang. Role-play hiện xử lý đồng bộ trong request, không dùng durable worker jobs như Speaking.

## 11. Custom Scenario

Người dùng có thể mô tả ngữ cảnh mình muốn luyện.

Ví dụ:

“Tôi cần bảo vệ đồ án công nghệ thông tin bằng tiếng Anh.”

Hệ thống có thể tạo scenario:

Graduation Project Defense

Nội dung gồm:

- introduce the project;
- explain architecture;
- explain technical decisions;
- answer examiner questions;
- handle clarification;
- defend design decisions.

Custom scenario có thể được sử dụng như:

- một practice session;
- input để tạo nhiều bài luyện;
- input cho personalized roadmap.

## 12. Speech Processing và AI Assessment

### 12.1. Nguyên tắc

Speakora không đánh giá speaking chỉ từ transcript.

Audio và transcript được xử lý theo hai nhánh.

**Audio branch**

Phân tích các thông tin như:

- pronunciation;
- speech rate;
- pause;
- hesitation;
- continuity;
- repetition;
- speaking duration.

**Transcript branch**

Phân tích:

- grammar;
- vocabulary;
- content;
- coherence;
- word choice;
- sentence structure.

Sau đó dữ liệu được tổng hợp thành Speaking Assessment Result.

### 12.2. Pipeline

Audio

→ Speech-to-Text
→ Transcript

đồng thời:

Audio

→ Pronunciation Analysis
→ Spoken Fluency Analysis

Sau đó:

Transcript + Speech Features

→ AI Assessment
→ Structured Feedback.

## 13. Feedback

Feedback sau mỗi bài luyện gồm nhiều mức.

### 13.1. Overall result

Ví dụ:

- overall score;
- estimated IELTS band;
- skill scores.

### 13.2. Skill feedback

Ví dụ:

**Fluency**

- speech rate;
- hesitation;
- pause;
- repetition.

**Pronunciation**

- pronunciation score;
- problematic sounds hoặc words.

**Grammar**

- identified errors;
- corrected form.

**Vocabulary**

- vocabulary range;
- unsuitable word choice;
- suggested expressions.

**Coherence**

- answer organization;
- linking;
- idea development.

### 13.3. Priority feedback

Hệ thống chọn một hoặc một số vấn đề có giá trị luyện tập cao nhất.

Ví dụ:

Priority improvement: Past tense consistency

Không bắt buộc người dùng phải xử lý tất cả lỗi cùng lúc.

## 14. Smart Review và Mistake-to-Practice Loop

### 14.1. Mục tiêu

Một lỗi sau khi được phát hiện không kết thúc ở feedback.

Nó trở thành dữ liệu học tập.

Luồng:

Detect mistake

→ Store mistake
→ Compare with mistake history
→ Detect recurring mistake
→ Increase weakness priority
→ Generate targeted exercise
→ Practice again
→ Re-evaluate
→ Update mastery

### 14.2. Ví dụ

Session 18:

Past Simple errors: 3

Session 21:

Past Simple errors: 2

Session 23:

Past Simple errors: 2

Hệ thống xác định đây là recurring weakness.

Smart Review tạo bài:

“Tell me what you did yesterday.”

Sau bài luyện lại:

Past Simple mastery: 48% → 61%

Lỗi này tiếp tục được theo dõi ở các session sau.

## 15. Adaptive Difficulty

Hệ thống có thể điều chỉnh mức độ khó dựa trên performance.

**Trường hợp performance thấp**

Hệ thống có thể:

- giảm độ phức tạp câu hỏi;
- cung cấp prompt hỗ trợ;
- đưa bài remedial;
- luyện kỹ năng nền trước.

**Trường hợp performance ổn định**

Giữ difficulty hiện tại.

**Trường hợp performance tốt**

Hệ thống có thể:

- tăng độ khó;
- yêu cầu câu trả lời dài hơn;
- đưa topic trừu tượng hơn;
- giảm support;
- chuyển sang scenario khó hơn.

Adaptive Difficulty có thể được xem là bước mở rộng sau khi Learner Model và Smart Review đã hoạt động ổn định.

## 16. Learning Progress

Progress cần phản ánh năng lực nói thay vì chỉ phản ánh số lần sử dụng hệ thống.

Dashboard có thể hiển thị:

- current level;
- overall speaking ability;
- Pronunciation progress;
- Fluency progress;
- Grammar progress;
- Vocabulary progress;
- Coherence progress;
- IELTS estimated band history;
- total practice time;
- completed sessions;
- recurring weaknesses;
- mastered skills;
- recent activities.

Ví dụ:

| Skill | Previous | Current |
|---|---:|---:|
| Pronunciation | 48 | 67 |
| Fluency | 55 | 71 |
| Grammar | 64 | 76 |
| Vocabulary | 59 | 73 |
| Coherence | 61 | 74 |

## 17. Gamification

Gamification đóng vai trò hỗ trợ engagement, không thay thế learning progress.

Các chức năng gồm:

- XP;
- level;
- streak;
- daily goal;
- practice completion;
- learning milestones.

Ví dụ:

**Today's Goal: 20/30 minutes**

- Smart Review ✓
- Pronunciation ✓
- IELTS Part 2 ○
- Role-play ○

Hoàn thành activity sẽ cập nhật XP và streak.

Tuy nhiên recommendation của hệ thống được ưu tiên dựa trên learning need thay vì XP.

## 18. Actor của hệ thống

### 18.1. Learner

Learner là actor chính.

Learner có thể:

- quản lý tài khoản;
- thiết lập profile;
- thực hiện initial assessment;
- xem learner profile;
- xem roadmap;
- thực hiện bài luyện;
- ghi âm;
- xem feedback;
- thực hiện smart review;
- theo dõi progress.

### 18.2. AI/Speech Service

Là actor hỗ trợ bên ngoài hoặc subsystem tùy cách triển khai.

Có nhiệm vụ:

- Speech-to-Text;
- pronunciation analysis;
- speech feature extraction;
- AI evaluation;
- feedback generation;
- question/scenario generation.

## 19. Danh sách Use Case

### Nhóm A – Account & Profile

| ID | Use Case |
|---|---|
| UC01 | Register Account |
| UC02 | Login |
| UC03 | Logout |
| UC04 | Manage Learner Profile |
| UC05 | Configure Learning Goals and Preferences |

### Nhóm B – Assessment & Learner Model

| ID | Use Case |
|---|---|
| UC06 | Take Initial Speaking Assessment |
| UC07 | View Speaking Skill Profile |
| UC08 | Update Learner Model |

### Nhóm C – Personalized Learning

| ID | Use Case |
|---|---|
| UC09 | View Personalized Roadmap |
| UC10 | View Daily Learning Plan |
| UC11 | Get Recommended Practice |
| UC12 | View Recommendation Explanation |

### Nhóm D – Speaking Practice

| ID | Use Case |
|---|---|
| UC13 | Practice IELTS Speaking |
| UC14 | Practice General Speaking |
| UC15 | Practice AI Role-play |
| UC16 | Create Custom Practice Scenario |
| UC17 | Record Speaking Response |

### Nhóm E – Speaking Assessment

| ID | Use Case |
|---|---|
| UC18 | Convert Speech to Transcript |
| UC19 | Analyze Pronunciation |
| UC20 | Analyze Spoken Fluency |
| UC21 | Evaluate Speaking Response |
| UC22 | View Detailed Feedback |

### Nhóm F – Smart Review

| ID | Use Case |
|---|---|
| UC23 | View Priority Weakness |
| UC24 | Perform Mistake-based Practice |
| UC25 | Retry Speaking Response |
| UC26 | Update Skill Mastery |

### Nhóm G – Progress & Gamification

| ID | Use Case |
|---|---|
| UC27 | View Learning Progress |
| UC28 | View Practice History |
| UC29 | View Practice Session Detail |
| UC30 | View Skill Progress |
| UC31 | View IELTS Progress |
| UC32 | Earn Experience Points |
| UC33 | Maintain Learning Streak |

### Nhóm H – Vocabulary & Word Pronunciation

| ID | Use Case |
|---|---|
| UC34 | Practice Vocabulary Flashcards |
| UC35 | Listen to Word Pronunciation |
| UC36 | Submit Vocabulary Self-review |
| UC37 | Practice Word Pronunciation |
| UC38 | View Syllable Pronunciation Feedback |
| UC39 | Practice Weak Pronunciation Words |

### Nhóm I – Recovery & Appearance

| ID | Use Case |
|---|---|
| UC40 | Recover Account Password |
| UC41 | Resume Saved Practice Session |
| UC42 | Retry Failed Upload or Processing |
| UC43 | Configure Light/Dark Appearance |

## 20. Quan hệ giữa các Use Case

### 20.1. IELTS Speaking

Practice IELTS Speaking

`<<include>> Record Speaking Response`

`<<include>> Convert Speech to Transcript`

`<<include>> Analyze Pronunciation`

`<<include>> Analyze Spoken Fluency`

`<<include>> Evaluate Speaking Response`

`<<include>> Update Learner Model`

### 20.2. General Speaking

Practice General Speaking

`<<include>> Record Speaking Response`

`<<include>> Convert Speech to Transcript`

`<<include>> Analyze Pronunciation`

`<<include>> Analyze Spoken Fluency`

`<<include>> Evaluate Speaking Response`

`<<include>> Update Learner Model`

### 20.3. AI Role-play

Practice AI Role-play

`<<include>> Evaluate Speaking Response`

`<<include>> Update Learner Model`

Có thể:

`<<extend>> Create Custom Practice Scenario`

### 20.4. Smart Review

Perform Mistake-based Practice

`<<include>> View Priority Weakness`

`<<include>> Evaluate Speaking Response`

`<<include>> Update Skill Mastery`

`<<include>> Update Learner Model`

### 20.5. Vocabulary Practice

Practice Vocabulary Flashcards `<<include>> Submit Vocabulary Self-review`.

Listen to Word Pronunciation là chức năng tùy chọn của flashcard. Self-review không bao gồm AI Speaking Assessment hoặc Update Skill Mastery trong implementation hiện tại.

### 20.6. Word Pronunciation Practice

Practice Word Pronunciation bao gồm Record Speaking Response, Analyze Pronunciation và View Syllable Pronunciation Feedback. Listen to Word Pronunciation là tùy chọn.

Practice Weak Pronunciation Words tạo phiên mới từ các từ yếu của một phiên nguồn thuộc người học và đã hoàn thành. Việc này chưa bao gồm Update Learner Model hoặc Update Skill Mastery.

### 20.7. Recovery

Resume Saved Practice Session và Retry Failed Upload or Processing mở rộng các luồng luyện tập tương ứng khi có phiên đã lưu hoặc lỗi có thể phục hồi. Chúng không thay thế Perform Mistake-based Practice.

## 21. Main Business Flow

### 21.1. End-to-End Learning Flow

Start

→ Register / Login
→ Configure Profile
→ Configure Goal
→ Initial Speaking Assessment
→ Analyze Speech
→ Initialize Learner Model
→ Generate Personalized Roadmap
→ Generate Daily Plan
→ Select Practice
→ Perform Speaking Practice
→ Analyze Audio and Transcript
→ Generate Assessment
→ Store Learning Evidence
→ Detect Weakness
→ Update Learner Model
→ Generate Smart Review
→ Update Skill Mastery
→ Adapt Roadmap
→ Recommend Next Practice
→ Repeat.

## 22. Flow 1 – Onboarding & Initial Assessment

1. Người dùng đăng ký tài khoản.
2. Người dùng đăng nhập.
3. Hệ thống yêu cầu thiết lập learner profile.
4. Người dùng thiết lập mục tiêu học.
5. Người dùng thiết lập IELTS target nếu có.
6. Người dùng lựa chọn interest.
7. Hệ thống yêu cầu thực hiện initial speaking assessment.
8. Người dùng trả lời các câu hỏi bằng giọng nói.
9. Hệ thống thu audio.
10. Audio được chuyển thành transcript.
11. Audio được phân tích pronunciation và fluency.
12. Transcript được phân tích grammar, vocabulary và coherence.
13. Hệ thống tạo baseline.
14. Hệ thống khởi tạo Learner Model.
15. Personalized Roadmap được tạo.
16. Người dùng được chuyển đến Dashboard.

## 23. Flow 2 – Personalized Daily Learning

1. Người dùng mở Dashboard.
2. Hệ thống tải Learner Model.
3. Hệ thống lấy learning goal.
4. Hệ thống lấy recent practice history.
5. Hệ thống lấy weakness và mistake history.
6. Hệ thống xác định priority skill.
7. Hệ thống lựa chọn hoặc tạo activity phù hợp.
8. Daily Plan được hiển thị.
9. Người dùng có thể xem lý do recommendation.
10. Người dùng lựa chọn bài và bắt đầu practice.

## 24. Flow 3 – Speaking Practice & Assessment

1. Người dùng lựa chọn IELTS, General hoặc Role-play.
2. Hệ thống tải question/scenario.
3. Người dùng bắt đầu trả lời.
4. Hệ thống ghi audio.
5. Audio được lưu.
6. Speech-to-Text sinh transcript.
7. Speech Analysis phân tích pronunciation.
8. Speech Analysis phân tích fluency.
9. AI phân tích transcript.
10. Assessment Engine tổng hợp kết quả.
11. Feedback được tạo.
12. Hệ thống hiển thị result.
13. Practice Session được lưu.
14. Learning Evidence được tạo.
15. Learner Model được cập nhật.
16. XP và streak được cập nhật.

## 25. Flow 4 – Mistake-to-Practice

1. Assessment Engine phát hiện mistake.
2. Mistake được phân loại.
3. Mistake được lưu vào history.
4. Hệ thống so sánh với mistake trước đây.
5. Nếu lỗi xuất hiện lặp lại, recurrence count tăng.
6. Weakness priority được cập nhật.
7. Smart Review Engine tạo targeted exercise.
8. Bài review được thêm vào Daily Plan.
9. Người học thực hiện bài.
10. Hệ thống đánh giá lại.
11. Mastery được cập nhật.
12. Nếu mức mastery đạt yêu cầu, weakness giảm priority.
13. Nếu chưa đạt, nội dung tiếp tục được đưa vào các lần review sau.

## 26. Flow 5 – Adaptive Learning

Sau mỗi Practice Session:

Update Skill Score

→ Update Mistake History
→ Update Mastery
→ Compare against Learning Goal
→ Analyze Recent Performance

Sau đó:

Nếu performance thấp

→ Generate remedial practice.

Nếu performance ổn định

→ Maintain current difficulty.

Nếu performance tốt

→ Increase difficulty.

Cuối cùng:

→ Update Roadmap
→ Update Daily Plan
→ Recommend Next Practice.

## 27. Quy tắc nghiệp vụ

### BR01 – Initial Assessment

Một learner mới nên có baseline assessment trước khi hệ thống đưa ra recommendation có mức cá nhân hóa cao.

### BR02 – Learner Model Update

Learner Model phải được cập nhật sau các practice session có assessment hợp lệ.

### BR03 – Mistake Evidence

Một mistake phải gắn với Practice Session hoặc Practice Answer cụ thể để có thể truy vết nguồn dữ liệu.

### BR04 – Recurring Mistake

Một lỗi xuất hiện nhiều lần trong các session khác nhau có thể được đánh dấu là recurring weakness.

Ngưỡng cụ thể là tham số thiết kế và có thể điều chỉnh.

### BR05 – Mastery

Mastery phải được cập nhật từ evidence của quá trình luyện tập, không chỉ từ số lần người học mở bài.

### BR06 – Recommendation

Recommendation nên xem xét tối thiểu:

- learning goal;
- skill weakness;
- mistake history;
- mastery;
- recent practice history.

### BR07 – Recommendation Evidence

Nếu recommendation được sinh từ weakness hoặc recurring mistake, hệ thống phải có khả năng chỉ ra lý do recommendation.

### BR08 – Audio-aware Assessment

Pronunciation không được suy luận chỉ từ transcript.

### BR09 – IELTS Assessment

IELTS Speaking Assessment phải tách biệt rubric với General Speaking Assessment.

### BR10 – Gamification

XP và streak không được sử dụng thay thế cho skill mastery.

### BR11 – Practice History

Mỗi completed practice session phải được lưu để learner có thể xem lại history và hệ thống có dữ liệu cho personalization.

### BR12 – Smart Review

Một weakness có priority cao có thể tạo Smart Review activity và được thêm vào Daily Plan.

### BR13 – Vocabulary Self-review

Remembered/Not Remembered là phản hồi tự đánh giá, không được tự diễn giải thành mastery hoặc AI skill score.

### BR14 – Pronunciation Retry Selection

Phiên luyện từ yếu phải dựa trên phiên nguồn thuộc learner và đã hoàn thành, sử dụng kết quả thành công mới nhất theo quy tắc tại mục 10.5.

### BR15 – Immutable Practice Content

Nội dung câu hỏi/từ/scenario của phiên phải giữ snapshot để các thay đổi ngân hàng nội dung không làm thay đổi dữ liệu đã dùng để luyện và đánh giá.

### BR16 – Recovery Authorization and Idempotency

Resume và retry phải kiểm tra quyền sở hữu. Gửi lại cùng yêu cầu với cùng idempotency key không được tạo bản ghi trùng; retry xử lý audio đã lưu phải tuân theo trạng thái và thời hạn của chế độ tương ứng.

## 28. Functional Requirements

### FR01 – Authentication

Hệ thống phải cho phép người dùng:

- đăng ký;
- đăng nhập;
- đăng xuất.

### FR02 – Learner Profile

Hệ thống phải cho phép người dùng thiết lập và cập nhật learner profile.

### FR03 – Learning Goal

Hệ thống phải cho phép learner thiết lập mục tiêu học tập.

### FR04 – Initial Assessment

Hệ thống phải cho phép learner thực hiện speaking assessment ban đầu.

### FR05 – Speech Recording

Hệ thống phải hỗ trợ ghi và gửi audio câu trả lời.

### FR06 – Speech-to-Text

Hệ thống phải có khả năng chuyển audio thành transcript.

### FR07 – Speech Analysis

Hệ thống phải có khả năng xử lý dữ liệu audio phục vụ đánh giá pronunciation và spoken fluency.

### FR08 – Speaking Assessment

Hệ thống phải có khả năng đánh giá câu trả lời speaking.

### FR09 – Learner Model

Hệ thống phải duy trì learner model riêng cho từng người dùng.

### FR10 – IELTS Speaking Practice

Hệ thống phải cung cấp practice cho IELTS Speaking Part 1, Part 2 và Part 3.

### FR11 – General Speaking Practice

Hệ thống phải cung cấp speaking practice theo General English topic.

### FR12 – Feedback

Hệ thống phải hiển thị feedback sau practice.

### FR13 – Practice History

Hệ thống phải lưu và hiển thị lịch sử luyện tập.

### FR14 – Mistake Tracking

Hệ thống phải lưu mistake được phát hiện từ các practice session.

### FR15 – Weakness Detection

Hệ thống phải có khả năng xác định recurring weakness từ lịch sử mistake.

### FR16 – Smart Review

Hệ thống phải có khả năng tạo hoặc lựa chọn practice dựa trên weakness.

### FR17 – Skill Mastery

Hệ thống phải lưu và cập nhật mastery của các skill hoặc learning item.

### FR18 – Personalized Recommendation

Hệ thống phải đề xuất practice dựa trên learner model.

### FR19 – Personalized Roadmap

Hệ thống phải có khả năng xây dựng learning roadmap từ learner goal và performance.

### FR20 – Daily Plan

Hệ thống phải hiển thị tập activity được ưu tiên cho người học tại thời điểm hiện tại.

### FR21 – Explainable Recommendation

Hệ thống phải có khả năng hiển thị lý do của các recommendation quan trọng.

### FR22 – Skill Progress

Hệ thống phải cho phép người học xem tiến trình theo từng speaking skill.

### FR23 – IELTS Progress

Hệ thống phải cho phép người học theo dõi kết quả IELTS Speaking theo thời gian.

### FR24 – Gamification

Hệ thống phải hỗ trợ XP và streak.

### FR25 – AI Role-play

Hệ thống nên hỗ trợ AI conversation nhiều lượt trong các scenario thực tế.

### FR26 – Custom Scenario

Hệ thống nên cho phép learner mô tả và tạo scenario luyện nói tùy chỉnh.

### FR27 – Adaptive Difficulty

Hệ thống nên có khả năng điều chỉnh difficulty dựa trên performance.

### FR28 – Vocabulary Practice

Hệ thống phải cung cấp flashcard theo topic và level, cho phép chọn 1–20 từ, nghe TTS, tự đánh dấu nhớ/chưa nhớ và lưu review theo snapshot của phiên.

### FR29 – Word Pronunciation Practice

Hệ thống phải cho phép learner luyện 1–20 từ có IPA trong một phiên thuộc tài khoản, ghi/gửi audio, xem phản hồi âm tiết đã chuẩn hóa và tổng kết kết quả. Raw provider result không được trả về giao diện người học.

### FR30 – Weak-word Practice

Hệ thống phải cho phép tạo phiên luyện lại từ yếu từ phiên pronunciation nguồn đã hoàn thành và thuộc learner, theo quy tắc tại mục 10.5.

### FR31 – Account Recovery

Hệ thống phải cho phép yêu cầu email khôi phục mật khẩu và đặt mật khẩu mới qua luồng xác thực khôi phục tài khoản.

### FR32 – Session Resume

Hệ thống phải cho phép tải lại phiên đã lưu theo cơ chế của từng chế độ tại mục 10.6, đồng thời xác minh quyền sở hữu. Không yêu cầu khôi phục bản ghi cục bộ chưa gửi.

### FR33 – Reliable Submission and Retry

Hệ thống phải hỗ trợ idempotent submission và retry lỗi upload/xử lý theo từng chế độ, giữ audio đã lưu khi có thể sử dụng lại. Speaking phải dùng durable jobs; không áp đặt worker jobs lên Vocabulary, Word Pronunciation hoặc prototype Role-play.

### FR34 – Private Audio Access

Hệ thống phải lưu audio trong Storage riêng tư, kiểm tra quyền sở hữu trước khi đọc/ghi và không đưa credential dịch vụ vào client. Việc có audio đã lưu không tự cấp quyền truy cập trực tiếp cho người dùng khác.

### FR35 – Appearance Preference

Hệ thống nên hỗ trợ giao diện sáng/tối, dùng system preference khi chưa có lựa chọn và lưu lựa chọn tại trình duyệt.

## 29. Phân loại mức độ ưu tiên

### 29.1. Must Have

Các chức năng cần ưu tiên triển khai trong phạm vi chính:

- Authentication;
- Learner Profile;
- Learning Goal;
- Initial Speaking Assessment;
- Continuous Learner Model;
- IELTS Speaking Practice;
- General Speaking Practice;
- Speech-to-Text;
- Audio-aware Assessment;
- Feedback;
- Mistake Tracking;
- Smart Review;
- Personalized Roadmap;
- Daily Learning Plan;
- Practice History;
- Skill Progress;
- XP;
- Streak.

### 29.2. Should Have

Các chức năng tạo khác biệt rõ hơn nhưng có thể triển khai sau phần core:

- AI Role-play Conversation;
- Custom Scenario;
- Explainable Recommendation;
- Adaptive Difficulty;
- advanced recommendation strategy.

### 29.3. Chức năng bổ sung đã triển khai

Các chức năng sau thuộc phạm vi hiện tại và cần được duy trì khi phát triển closed learning loop:

- Vocabulary Practice và Vocabulary Self-review;
- Word Pronunciation Practice và Weak-word Practice;
- Account Recovery;
- Session Resume, idempotent submission và Processing Retry;
- Private Audio Access;
- Light/Dark Appearance.

Danh sách này ghi nhận trạng thái triển khai, không có nghĩa việc tích hợp vào Learner Model, mastery, roadmap, Daily Plan hoặc XP đã hoàn thành. Account Recovery, Session Resume, Reliable Submission và Private Audio Access là yêu cầu nền tảng phải duy trì; flashcard, pronunciation riêng và appearance là chức năng hỗ trợ đã có.

### 29.4. Could Have / Future Work

Các chức năng có thể mở rộng:

- AI avatar;
- leaderboard;
- community challenge;
- Presentation Coach;
- Interview Coach;
- long-term AI conversation memory;
- advanced phoneme visualization;
- accent selection;
- industry-specific curriculum;
- advanced spaced repetition;
- social learning.

## 30. Conceptual Module Architecture

Hệ thống được chia thành các module logic sau:

### Authentication Module

- Register;
- Login;
- authentication state.

### Learner Module

- Profile;
- Learning Goal;
- Preference;
- Learner Model.

### Assessment Module

- Initial Assessment;
- Speech Assessment;
- IELTS Assessment;
- General Assessment.

### Speaking Practice Module

- IELTS Practice;
- General Practice;
- AI Role-play;
- Custom Scenario.

### Speech Processing Module

- Audio Storage;
- Speech-to-Text;
- Pronunciation Analysis;
- Fluency Feature Analysis.

### Personalization Module

- Roadmap;
- Recommendation;
- Daily Plan;
- Adaptive Difficulty.

### Learning Intelligence Module

- Mistake Tracking;
- Weakness Detection;
- Mastery;
- Smart Review.

### Progress Module

- Practice History;
- Skill Progress;
- IELTS Progress.

### Gamification Module

- XP;
- Level;
- Streak.

### Vocabulary Practice Module

- Topic/level-based flashcards;
- Word TTS;
- Vocabulary Self-review;
- Vocabulary Session Resume.

### Word Pronunciation Practice Module

- IPA-ready word selection;
- Word recording và authorized TTS;
- Pronunciation attempts và normalized syllable feedback;
- Session summary và weak-word session creation.

### Recovery và Appearance

Account Recovery thuộc Authentication Module. Session Resume, idempotency và Processing Retry là trách nhiệm của từng practice module và Speech Processing Module. Appearance Preferences thuộc lớp giao diện và được lưu cục bộ.

## 31. Conceptual Data Model

Các entity chính dự kiến gồm:

| Entity | Mô tả |
|---|---|
| User | Thông tin tài khoản. |
| LearnerProfile | Thông tin học tập của người dùng. |
| LearningGoal | Mục tiêu học tập. |
| LearnerSkill | Trạng thái từng speaking skill. |
| LearnerModel | Tổng hợp trạng thái năng lực của learner. |
| PracticeSession | Một phiên luyện tập. |
| PracticeActivity | Activity được thực hiện trong session. |
| SpeakingPrompt | Câu hỏi hoặc prompt. |
| Scenario | Scenario cho AI Role-play. |
| SpeakingAnswer | Câu trả lời của learner. |
| AudioRecord | Thông tin audio. |
| Transcript | Transcript sinh từ audio. |
| AssessmentResult | Kết quả đánh giá. |
| SkillAssessment | Kết quả cho từng skill. |
| Feedback | Feedback cho learner. |
| Mistake | Lỗi được phát hiện. |
| LearnerMistake | Lịch sử một loại mistake của learner. |
| SkillMastery | Mastery của learning item hoặc skill. |
| LearningEvidence | Dữ liệu chứng minh recommendation hoặc improvement. |
| LearningRoadmap | Roadmap của learner. |
| RoadmapItem | Các nội dung nằm trong roadmap. |
| DailyPlan | Kế hoạch học trong ngày. |
| RecommendedActivity | Activity được recommendation engine đề xuất. |
| XPTransaction | Lịch sử cộng XP. |
| Streak | Thông tin streak. |

Các entity bổ sung đã có trong implementation hiện tại:

| Entity | Mô tả |
|---|---|
| VocabularyItem | Ngân hàng từ theo topic/level, nghĩa, ví dụ, IPA và provenance khi có. |
| VocabularySession | Phiên flashcard thuộc tài khoản. |
| VocabularySessionItem | Thứ tự và snapshot từ trong phiên. |
| VocabularyReview | Self-review Remembered/Not Remembered của một item. |
| PronunciationSession | Phiên luyện từ thuộc tài khoản, có thể liên kết phiên nguồn để luyện từ yếu. |
| PronunciationSessionItem | Snapshot từ/IPA/nghĩa/level trong phiên phát âm. |
| PronunciationAttempt | Audio metadata, idempotency, trạng thái xử lý và kết quả phân tích của từng lần thử. |
| ConversationSession | Phiên Role-play, scenario snapshot, mục tiêu và trạng thái hội thoại. |
| ConversationMessage | Lượt user/assistant, transcript, trạng thái xử lý và mục tiêu liên quan. |

Raw pronunciation provider result là dữ liệu server-only; learner-facing DTO chỉ dùng kết quả đã chuẩn hóa. VocabularyReview và PronunciationAttempt không thay thế SkillMastery hoặc LearnerModel. Appearance preference không yêu cầu entity server vì hiện được lưu trên trình duyệt.

## 32. Learning Evidence Loop

Learning Evidence Loop là định hướng quan trọng của Speakora.

Mỗi recommendation có thể truy ngược tới dữ liệu tạo ra recommendation đó.

Ví dụ:

**Recommended Activity**

Past Tense Storytelling

**Evidence**

- Practice Session #18: 3 errors;
- Practice Session #21: 2 errors;
- Practice Session #23: 2 errors;
- Current mastery: 48%;
- Target: IELTS Speaking 6.5.

Sau practice:

- Previous mastery: 48%;
- New mastery: 61%;
- Error rate: 7/10 → 3/10.

Nhờ vậy hệ thống có thể thể hiện cả:

- lý do lựa chọn nội dung;
- dữ liệu nguồn;
- thay đổi sau quá trình luyện.

## 33. Phạm vi demo đề xuất

Luồng demo hoàn chỉnh nên thể hiện:

1. User đăng nhập.
2. User có learning goal.
3. Dashboard hiển thị learner skill profile.
4. Daily Plan đề xuất bài học.
5. User xem “Why this lesson?”.
6. User thực hiện một speaking practice.
7. User ghi âm.
8. Hệ thống tạo transcript.
9. Hệ thống phân tích bài nói.
10. User nhận feedback.
11. Hệ thống phát hiện một mistake.
12. Mistake được cập nhật vào learner model.
13. Smart Review được sinh.
14. User luyện lại.
15. Mastery thay đổi.
16. Dashboard hiển thị progress mới.
17. Recommendation tiếp theo được điều chỉnh.

Đây là luồng thể hiện rõ nhất giá trị của hệ thống.

## 34. Giá trị khác biệt của Speakora

Speakora không được định vị đơn thuần là:

ứng dụng AI chấm bài nói tiếng Anh.

Định hướng phù hợp hơn là:

Speakora là hệ thống luyện nói tiếng Anh ứng dụng AI theo hướng thích ứng, trong đó kết quả luyện nói, điểm yếu và lỗi lặp lại của từng người học được liên tục cập nhật vào hồ sơ năng lực và sử dụng để tự động điều chỉnh lộ trình cũng như nội dung luyện tập tiếp theo.

Điểm khác biệt cốt lõi nằm ở chu trình:

Speaking Performance

→ Learning Evidence
→ Learner Model
→ Personalized Practice
→ New Performance
→ Updated Learner Model

Qua đó, mỗi lần luyện tập không phải là một phiên độc lập mà trở thành một phần của quá trình học liên tục và có khả năng thích ứng.

## 35. Kết luận phạm vi

Phạm vi chính thức của Speakora tập trung vào ba lớp chức năng.

### Lớp 1 – Speaking Experience

Bao gồm:

- IELTS Speaking;
- General Speaking;
- AI Role-play.

### Lớp 2 – AI Assessment

Bao gồm:

- Speech-to-Text;
- pronunciation analysis;
- fluency analysis;
- grammar/vocabulary/coherence assessment;
- feedback.

### Lớp 3 – Adaptive Learning Intelligence

Bao gồm:

- Learner Model;
- Mistake Tracking;
- Mastery;
- Smart Review;
- Personalized Roadmap;
- Recommendation;
- Learning Evidence;
- Adaptive Difficulty.

Trong đó, lớp thứ ba là thành phần tạo ra sự khác biệt chính giữa Speakora và một hệ thống speaking practice chỉ sử dụng AI để chấm câu trả lời.

Toàn bộ thiết kế Use Case, database, sequence diagram, API và giao diện ở các giai đoạn tiếp theo cần tuân theo closed learning loop:

ASSESS → MODEL → PLAN → PRACTICE → ANALYZE → DIAGNOSE → REVIEW → ADAPT.
