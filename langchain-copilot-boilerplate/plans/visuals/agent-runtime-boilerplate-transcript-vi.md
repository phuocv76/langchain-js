# Transcript thuyết trình — LangChain Agent Runtime (tiếng Việt)

> Kịch bản nói theo từng slide của `agent-runtime-boilerplate-slides.html` (20 slides).
> Thời lượng gợi ý: 15–20 phút. Chữ nghiêng = gợi ý chuyển slide.

---

**Slide 1 — Title.**
Chào mọi người. Hôm nay mình sẽ giới thiệu boilerplate LangChain Agent Runtime — nền tảng đứng sau chatbot nội bộ của chúng ta. Mình sẽ đi qua kiến trúc, cách một tin nhắn chạy từ đầu đến cuối, và cấu trúc codebase để mọi người có thể bắt tay vào làm ngay.

**Slide 2 — Bối cảnh.**
Trước đây sản phẩm là một web app Next.js gọi thẳng REST API. Bây giờ trải nghiệm chính là **chat toàn màn hình** — AI assistant chính là giao diện, có lịch sử hội thoại và panel hiển thị kết quả tool. Monorepo này chứa trọn bộ: web UI, agent runtime, và memory worker. Riêng `dev-space-api` — nguồn dữ liệu công ty — vẫn nằm ở repo riêng của nó.

**Slide 3 — Giải pháp một dòng.**
Toàn bộ hệ thống tóm gọn trong ba khối: Chat UI ở `apps/web` đăng nhập bằng Firebase; Agent runtime ở `apps/agent` xác thực user, chạy agent, stream kết quả; và `dev-space-api` là nơi giữ dữ liệu thật. Điểm quan trọng: agent runtime **không sở hữu dữ liệu nghiệp vụ nào** — nó chỉ là tầng suy luận ở giữa.

**Slide 4 — Divider.**
*Phần một: kiến trúc — từng hop, từng ranh giới tin cậy.*

**Slide 5 — Request path (diagram chính).**
Đây là slide quan trọng nhất. Đi từ trái sang: browser gửi request kèm Firebase ID token. Hono runtime ở cổng 4000 **xác thực token và kiểm tra domain email công ty** — đây là ranh giới tin cậy. Từ đây trở vào trong, credentials bị xóa, chỉ còn các header `x-agent-*` đã được làm sạch. CopilotKit runtime chuyển run sang LangGraph server cổng 2024 — chạy trong Docker, hoàn toàn private. Graph `workspaceAgent` resume từ **checkpoint trong Postgres**, gọi OpenAI, ghi transcript sang **memory-worker với D1**, và gọi `dev-space-api` bằng service token kèm danh tính user đang thao tác. Nhớ hai điều: token dừng ở cửa, và mỗi loại dữ liệu có đúng một nơi lưu.

**Slide 6 — Tech stack.**
Nguyên tắc chọn stack: chỗ nào có chuẩn thì dùng đồ chuẩn. LangChain + LangGraph cho vòng lặp agent, CopilotKit v2 cho streaming protocol, Hono cho HTTP, Firebase cho identity, Next.js 15 cho UI. Tầng lưu trữ: Postgres cho checkpoint, D1 + Vectorize cho transcript và semantic recall. Version đều được pin — lý do sẽ nói ở phần gotchas.

**Slide 7 — Divider.**
*Phần hai: cấu trúc — mọi thứ nằm ở đâu và vì sao.*

**Slide 8 — Codebase (slide chi tiết).**
Monorepo pnpm có ba app. `apps/web`: components chia theo domain — auth, chat, history, preview; file `agent-api.ts` là client duy nhất gọi REST của agent. `apps/agent`: trái tim là `agents/workspace-agent/graph.ts` — dùng `createAgent` với middleware; ba middleware quan trọng nhất là xác thực user, durable memory, và workspace tools. Docker file + compose ở đây luôn để chạy LangGraph server production-parity. `apps/memory-worker`: Cloudflare Worker với schema D1. Bên phải là các convention: env validate bằng Zod lúc boot, middleware compile thành node thật của graph, và tools **không bao giờ** lấy danh tính từ tham số model đưa.

**Slide 9 — Extension points.**
Muốn mở rộng thì có bốn điểm cắm: thêm tool mới chỉ là một file + đăng ký; thêm agent mới là một thư mục + hai dòng đăng ký; muốn tool hiển thị đẹp thì thêm một `useRenderTool` ở FE; và memory bật tắt bằng đúng một biến env.

**Slide 10 — Divider.**
*Phần ba: ba flow chính — auth, chat, và tools.*

**Slide 11 — Auth flow.**
Năm bước: đăng nhập Google → mỗi request mang Bearer token → firebase-admin verify trên server → kiểm tra domain công ty, sai thì 403 → cuối cùng **xóa token**, chỉ giữ lại request-id, user-id, email, roles. Sau bước năm, không còn credential nào tồn tại trong hệ thống agent.

**Slide 12 — Chat flow.**
Một tin nhắn đi qua năm bước: POST vào runtime → runtime resolve agent và forward header → graph resume từ checkpoint Postgres, memory middleware bơm ngữ cảnh liên quan từ D1 và Vectorize vào prompt → vòng lặp model–tools chạy với danh tính user đã xác thực → và cuối cùng stream token về UI, đồng thời ghi cả hai chiều hội thoại vào D1 và checkpoint mới vào Postgres.

**Slide 13 — Ba lớp memory.**
Câu hỏi hay gặp nhất: hội thoại được lưu ở đâu? Có ba lớp, mỗi lớp một chủ sở hữu. **Checkpoint** trong Postgres là trí nhớ của engine — để agent resume đúng ngữ cảnh, code chính chủ LangGraph quản. **Transcript** trong D1 là sổ cái của sản phẩm — mình sở hữu hoàn toàn: sidebar, đổi tên, xóa vĩnh viễn, semantic recall xuyên thread. **UI replay** trong RAM chỉ là cache — mất khi restart và điều đó không sao, vì khi mở lại thread cũ, UI tự hydrate ngay lập tức từ checkpoint qua một proxy có xác thực. Xóa hội thoại là xóa cả D1 lẫn checkpoint. Memory sập thì chat vẫn chạy.

**Slide 14 — Gọi API an toàn.**
Đoạn code này là quy tắc quan trọng nhất của cả hệ thống: danh tính lấy từ **trusted context**, không bao giờ từ model. Model có thể bịa tham số, nhưng không thể chọn dữ liệu của ai bị đụng vào. API client tự gắn service token, acting-user headers và timeout cho mọi call.

**Slide 15 — Divider.**
*Phần bốn: các quyết định thiết kế và những chỗ dễ vấp.*

**Slide 16 — Quyết định.**
Bốn quyết định lớn, đều đã cân nhắc kỹ. Một: **tự sở hữu dữ liệu chat** — bỏ CopilotKit Intelligence trả phí, transcript nằm trong D1 của công ty, dữ liệu nhân sự không rời hạ tầng. Hai: **chỉ dùng code persistence chính chủ** — checkpoint qua image LangGraph server, không tự viết saver. Ba: **memory là best-effort** — worker sập không làm gãy chat. Bốn: **danh tính do server cấp** — model không bao giờ chọn được nó đang là ai.

**Slide 17 — Gotchas.**
Ba cái bẫy đã được trả học phí hộ mọi người: dependency phải pin đúng version, không LangGraph báo lỗi "Channel already exists"; cổng 2024 tuyệt đối không được public — ai chạm được nó là giả danh được bất kỳ ai; và build Docker trong monorepo phải dùng `Dockerfile.langgraph` của mình vì CLI chính chủ không hiểu `workspace:*`.

**Slide 18 — Getting started.**
Chạy local mất khoảng hai phút: install, copy hai file env, điền OpenAI key và Firebase, rồi ba lệnh — `pnpm dev` cho graph và API, `dev:web` cho UI, và worker chạy chế độ offline hoàn toàn local, không cần tài khoản Cloudflare. Muốn giống production thì `pnpm dev:server` bật Docker với Postgres. Gates: typecheck, lint, 24 tests — đều xanh.

**Slide 19 — Next steps.**
Tiếp theo: `resumeAgent` với human-in-the-loop dùng StateGraph và interrupts — lúc đó mới cần viết node tay; `adminAgent` cho thao tác ghi; deploy worker lên Cloudflare và LangGraph image lên môi trường thật; semantic recall tự bật khi deploy. Kiến trúc đã stateless nên scale ngang chỉ là thêm instance.

**Slide 20 — Q&A.**
Tài liệu chi tiết nằm trong README của từng app và `docs/trusted-agent-context.md`. Mình sẵn sàng nhận câu hỏi. Cảm ơn mọi người!
