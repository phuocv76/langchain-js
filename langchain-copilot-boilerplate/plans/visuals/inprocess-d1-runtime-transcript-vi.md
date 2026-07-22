# Transcript thuyết trình — Agent Runtime v2: In-Process + D1

> Đi kèm deck `inprocess-d1-runtime-slides.html` · 19 slide · ~12–15 phút.
> Thuật ngữ kỹ thuật giữ nguyên tiếng Anh như khi trao đổi hằng ngày.

---

## Slide 1 — Title: "One process, one database"

Chào mọi người. Hôm nay mình trình bày bản nâng cấp lớn của agent runtime — gọi tắt là v2.

Toàn bộ thay đổi tóm gọn trong đúng một câu trên màn hình: **một process, một database**. Trước đây graph chạy trong một server riêng kèm Postgres và Redis; giờ nó chạy ngay trong process Hono của chúng ta, và mọi dữ liệu bền — checkpoint, transcript, semantic recall — đều nằm trong một chỗ duy nhất là Cloudflare D1.

Điều quan trọng cần nói ngay từ đầu: **sản phẩm không đổi gì cả**. UI vẫn vậy, tools vẫn vậy, auth vẫn vậy. Cái thay đổi là phòng máy phía sau.

---

## Slide 2 — Vì sao phải đổi

v1 chạy được, nhưng nó cõng theo nguyên một platform thứ hai.

Muốn chat được ở local phải bật **năm process**: web, agent, LangGraph server, Postgres, Redis — ba cái cuối trong Docker. Khó chịu nhất là graph code bị **bake vào Docker image**: sửa một dòng middleware là phải rebuild image, không có chuyện hot reload.

State thì bị **chẻ đôi giữa hai engine**: checkpoint nằm trong Postgres, transcript nằm trong D1. Xoá một conversation phải đuổi theo cả hai nơi.

Về bảo mật, LangGraph server ở port 2024 là **một trust boundary phải canh riêng** — nó tin header định danh, nên bất kỳ ai chạm được vào nó là giả danh được bất kỳ user nào.

Và cuối cùng: checkpoint chỉ bền ngang cái Docker volume trên máy — mất volume là mất trí nhớ của toàn bộ hội thoại.

---

## Slide 3 — Giải pháp trong một dòng

Giải pháp: **chạy graph trong chính process của mình, và đưa từng byte state về D1**.

Ba khối trên slide:

- **Bỏ LangGraph server.** Lý do phải bỏ chứ không phải thích bỏ: checkpointer của server đó không thay được — muốn dùng D1 làm checkpoint là bắt buộc rời nó. Dockerfile, compose, Postgres, Redis, langgraph.json — xoá sạch, âm khoảng một nghìn bốn trăm dòng.
- **Thêm AG-UI bridge** — khoảng ba trăm rưỡi dòng, chạy compiled graph ngay trong Hono và nói chuyện trực tiếp bằng event protocol AG-UI của CopilotKit.
- **Checkpoint về D1** — một checkpoint saver tự viết, port từ saver SQLite chính thức của LangChain, ghi state qua memory worker — nằm cạnh transcript mà worker này vốn đã quản.

---

## Slide 4 — Divider: Architecture

Phần một: kiến trúc.

---

## Slide 5 — Request path v2

Nhìn diagram: browser gửi request kèm Firebase ID token vào agent. Auth middleware verify, và từ đó trở đi chỉ còn identity đã được làm sạch — dạng header `x-agent-*`.

Điểm khác biệt lớn nhất so với v1: từ CopilotKit runtime đến graph giờ là **một function call, không phải một network hop**. Không còn khối `:2024` nào trên hình nữa.

Graph gọi OpenAI, gọi product API bằng service token cộng acting-user header như cũ, và đọc/ghi **cả checkpoint lẫn transcript** vào memory worker.

Trust boundary duy nhất còn lại chính là memory worker — trên production nó nằm sau Cloudflare Access, chỉ agent có service token mới gọi được.

---

## Slide 6 — Before / After

So sánh trực diện:

- Năm process xuống **ba** — và không còn Docker.
- Hai state engine xuống **một** — D1 giữ tất.
- Sửa graph: rebuild image → **tsx hot reload**.
- Identity: trước phải forward qua HTTP để server copy vào config; giờ verify một lần rồi inject thẳng vào run config trong cùng process.
- Checkpoint giờ **sống qua restart, redeploy, đổi máy**.
- Và một cải tiến bảo mật đi kèm miễn phí: mỗi row checkpoint gắn `user_id` — user A có đoán được UUID thread của user B thì query cũng trả về rỗng. Ở v1 checkpoint không hề được scope theo user.

---

## Slide 7 — Divider: The bridge

Phần hai: bridge — cách một run chạy khi không còn graph server.

---

## Slide 8 — Workflow một message

Đi theo năm bước trên slide:

1. **Verify + mint** — middleware auth verify Firebase token, xoá token, ghi đè header `x-agent-*` bằng identity đã verify. Client có tự gửi header giả cũng bị ghi đè.
2. **Per-request agent** — CopilotKit v2 cho phép agents factory theo từng request; factory đọc các header đó và tạo một BuiltInAgent đóng gói đúng user của request này.
3. **New turn only** — bridge chỉ gửi vào graph những message **sau lượt assistant cuối cùng**. Lịch sử cũ đã nằm trong checkpoint rồi; gửi lại là phá công cost-saving của summarization.
4. **Stream + translate** — `graph.streamEvents` bắn event, bridge dịch sang AG-UI. Có một filter theo tên node: chỉ text từ node model chính được lên màn hình — LLM call của summarization middleware bị chặn lại, user không bao giờ thấy nội dung tóm tắt nội bộ.
5. **Snapshot + persist** — run kết thúc bằng một MESSAGES_SNAPSHOT từ engine state; lúc đó checkpoint và cả hai lượt hội thoại đã nằm trong D1.

---

## Slide 9 — Code bridge

Bridge có đúng ba việc, nhìn code:

- **Input**: chuyển transcript AG-UI thành message LangChain của lượt mới, cộng state `copilotkit` chứa frontend tools và context — đúng shape mà adapter cũ tạo, nên **toàn bộ middleware trong graph không đổi một dòng**.
- **Events**: chỉ bắn chunk event. Pipeline AG-UI tự mở/đóng span khi id đổi — bridge không phải giữ state span nào, ít bug hơn hẳn.
- **Identity**: claims đã verify đi vào run config dưới đúng key `x-agent-*` cũ — resolver trust context cũ đọc được luôn.

---

## Slide 10 — Bài toán "một message, hai id"

Đây là cái gotcha thú vị nhất của migration, và nó chỉ lộ ra khi test E2E thật.

Khi đang stream, một câu trả lời mang **id tạm** dạng `run-…`. Nhưng engine state cuối cùng gán cho nó **id thật** dạng `resp-…` — và transcript trong D1 ghi id thật. Hai id cho cùng một message.

Hậu quả nếu không xử lý: mở lại thread là thấy **bubble bị đúp** — một bản từ stream, một bản từ hydration.

Xử lý hai đầu:
- **Server**: mỗi run kết thúc bằng MESSAGES_SNAPSHOT dựng từ engine state — lọc summary và system message, id lúc này khớp với D1. Đây cũng chính là lý do adapter chính thức của LangGraph làm y hệt — giờ mình hiểu tại sao.
- **Client**: thread hydrator nhớ mọi message từng thấy, bù lại bất kỳ cái nào snapshot làm rơi, và coi "cùng role cùng nội dung nhưng id mới" là **đổi tên**, không phải message mới.

Kết quả đã chứng minh qua E2E: màn hình đủ lịch sử, engine giữ state gọn, **không một bubble đúp nào**, kể cả qua restart.

---

## Slide 11 — Divider: Persistence

Phần ba: persistence.

---

## Slide 12 — Ba lớp trí nhớ, một database

Vẫn là mô hình ba lớp như v1, nhưng giờ chung một nhà:

- **Checkpoint** — trí nhớ của engine, full graph state theo thread. Đây là dữ liệu correctness-critical: ghi fail là run fail, không bao giờ âm thầm chẻ nhánh hội thoại.
- **Transcript** — sổ cái sản phẩm: từng lượt chat kèm engine message id. Sidebar, đặt tên, xoá, semantic recall đều từ đây. Best-effort: worker sập thì chat vẫn chạy.
- **UI replay** — cache RAM của CopilotKit cho re-render tức thì. Mất cũng chẳng sao — hydrator dựng lại màn hình từ transcript.

Lưu ý dòng cuối: summarization giới hạn prompt ở mức mười sáu message, giữ tám — nhưng transcript giữ **tất cả**. UI không bao giờ mất lịch sử vì compaction.

---

## Slide 13 — D1 checkpoint saver

Saver mới không phải sáng tác: nó là **port từ saver SQLite chính thức** của LangChain — cùng schema, cùng write semantics — cộng thêm cột `user_id` trên mọi bảng.

Ba điểm đáng nhớ:
- Serialization nằm nguyên phía agent — revive đúng instance `HumanMessage`/`AIMessage`; worker chỉ giữ base64, không bao giờ giải mã.
- Mọi write atomic qua `db.batch()`, và mỗi lần put sẽ **tự prune giữ hai mươi checkpoint mới nhất** mỗi thread — không cron, không phình.
- Chưa cấu hình worker? Fallback về in-memory checkpoint kèm warning — boilerplate vẫn chạy ngay cho người mới clone.

---

## Slide 14 — Hai triết lý fail

Cách handle lỗi được thiết kế có chủ đích, hai store hai triết lý:

- **Checkpoint fail to** — nuốt lỗi ở đây là mất hoặc chẻ nhánh hội thoại một cách âm thầm, nên lỗi saver làm fail run và user nhìn thấy.
- **Transcript fail êm** — retrieval trả rỗng, write rơi kèm warning; một lượt chat không bao giờ chết vì cái sổ cái hắt hơi.

Identity thì **server đúc từ đầu đến cuối**: verify → ghi đè header → closure theo request → run config → scope của saver và header của tools. Model không bao giờ được chọn nó đang đụng vào dữ liệu của ai.

Và cánh cửa human-in-the-loop vẫn mở: bridge chạy trên chuẩn interrupt của AG-UI — làm approval flow sau này là cắm thêm, không phải viết lại.

---

## Slide 15 — Divider: Structure & workflow

Phần bốn: cấu trúc code và cách làm việc hằng ngày.

---

## Slide 16 — Cấu trúc

Trên disk thay đổi gọn: agent thêm hai file lõi — `agui-bridge.ts` và `d1-checkpoint-saver.ts`; worker thêm module `checkpoints.ts` với migration mới; web viết lại một file hydrator. Gạch ngang là những gì đã xoá: toàn bộ Docker stack và đường REST `/chat` chết.

Thêm agent mới giờ đơn giản hơn: graph như cũ, một bridge nhỏ, đăng ký registry — **không còn langgraph.json, không image, không deploy service thứ hai**.

Ba mươi tư test xanh, và quan trọng hơn là đã E2E bằng browser thật: streaming, tools, compaction, restart, delete.

---

## Slide 17 — Workflow hằng ngày

Ba terminal, không Docker. Điều dev sẽ cảm nhận rõ nhất: **sửa middleware, save, chat luôn** — graph hot-reload cùng agent.

D1 local chỉ là một file SQLite dưới wrangler — muốn soi checkpoint thì một lệnh `d1 execute` là xong.

Và cứ thoải mái restart bất cứ thứ gì: thread resume từ D1, UI tự refill từ transcript.

---

## Slide 18 — Đã chứng minh + bước tiếp

Cột trái là những gì đã verify end-to-end — mình nhấn hai dòng: **restart agent xong mở lại thread vẫn đủ lịch sử và bot vẫn nhớ dữ kiện** — điều v1 không đảm bảo nổi khi mất volume; và engine không bao giờ bị bơm ngược lịch sử từ UI — sáu message trong engine trong khi màn hình hiển thị mười hai.

Cột phải là việc tiếp theo: deploy worker và đo latency D1 thật — ước tính khoảng một, hai trăm mili giây mỗi lượt nhưng ẩn sau thời gian model stream; sau đó là `resumeAgent` với human-in-the-loop — nền móng interrupt và durable checkpoint đã sẵn; rồi `adminAgent`, semantic recall trên production, và scale thì vẫn stateless như cũ.

---

## Slide 19 — Questions

Tài liệu chi tiết nằm trong repo: README, README của agent, và `docs/trusted-agent-context.md`. Code trên branch `feat/agent-runtime-durable-memory`.

Mình sẵn sàng trả lời câu hỏi — phần dễ bị hỏi xoáy nhất chắc là bài toán hai id ở slide mười, ai muốn đào sâu thì mình demo luôn bằng D1 local. Cảm ơn mọi người.
