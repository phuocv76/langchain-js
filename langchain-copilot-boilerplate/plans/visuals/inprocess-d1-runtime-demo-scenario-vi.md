# Kịch bản demo — chứng minh runtime v2 (in-process + D1) hoạt động tốt

> Chạy sau phần slide, ~10–12 phút. Mọi bước dưới đây đều đã được verify E2E trước — demo lại đúng các bước đó, không có bước "hy vọng nó chạy".

## Chuẩn bị trước demo (5 phút, làm trước khi họp)

1. Ba terminal:
   ```bash
   pnpm --filter @repo/memory-worker dev    # :8788 — bật TRƯỚC để agent thấy D1
   pnpm dev:agent                            # :4000
   pnpm dev:web                              # :3000
   ```
2. TablePlus mở sẵn file D1 local (SQLite):
   `apps/memory-worker/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite`
   — mở sẵn 2 tab query (SQL ở cuối file này).
3. Terminal thứ tư đứng sẵn ở `apps/memory-worker`, paste sẵn **lệnh decode checkpoint** (cuối file) — chỉ chờ Enter.
4. Browser :3000, đăng nhập sẵn. Xoá các thread test cũ cho sidebar sạch.

**Điểm nhấn mở màn:** chỉ vào 3 terminal — *"Trước đây chỗ này là 5 process, 3 cái trong Docker. Giờ là 3 process Node thuần, sửa code là hot reload."*

---

## Màn 1 — Chat + tool + nhìn thấy data (≈2')

| Bước | Làm gì | Kỳ vọng |
|---|---|---|
| 1.1 | New chat, gõ: **"Xin chào! Màu yêu thích của tôi là teal và số may mắn là 42. Nhớ giúp mình nhé."** | Reply stream mượt từng token |
| 1.2 | Gõ: **"show my profile"** | Tool card "📄 Employee profile" render trong panel (product API tắt thì tool trả lỗi lịch sự — nói luôn: *"tool degrade có kiểm soát, chat không chết"*) |
| 1.3 | Sang TablePlus, chạy **Query A** | `memory_turns` có 4 dòng mới kèm `message_id` |

**Câu chốt màn 1:** *"Transcript — cái user nhìn thấy — là row trong D1. Giờ xem thứ engine nhìn thấy."*

## Màn 2 — MỞ HỘP ĐEN: checkpoint đang chạy thật (≈3')

Màn này chứng minh trực tiếp cơ chế checkpoint, không phải suy diễn.

| Bước | Làm gì | Kỳ vọng |
|---|---|---|
| 2.1 | TablePlus: chạy **Query B (đếm checkpoint)** | Con số hiện tại, ví dụ `9` — *"một lượt chat = nhiều super-step, mỗi step engine ghi một checkpoint"* |
| 2.2 | Quay lại chat, gõ: **"Tôi thích màu gì nhỉ?"** | Trả lời đúng **teal** |
| 2.3 | Chạy lại **Query B** ngay | Con số **tăng lên** (vd 9 → 14) — checkpoint đang được ghi realtime theo từng bước của graph |
| 2.4 | Terminal 4: **Enter** lệnh decode đã paste sẵn | In ra **nội dung engine state thật**: danh sách message đang nằm trong checkpoint mới nhất — thấy đúng câu "teal/42", câu hỏi, câu trả lời |
| 2.5 | (Nói kèm, chỉ vào TablePlus `checkpoints`) | Cột `parent_checkpoint_id` = chuỗi lịch sử nối nhau; `metadata` là JSON đọc được (`step`, `source`); cột `user_id` trên từng row |

**Câu chốt màn 2:** *"Đây chính là 'trí nhớ ngắn hạn' của agent — không phải magic, là những row này. Và vì nó là row trong D1 chứ không phải RAM hay volume Docker, nên màn tiếp theo mới làm được."*

## Màn 3 — KHOẢNH KHẮC CHÍNH: giết agent, trí nhớ vẫn sống (≈3')

| Bước | Làm gì | Kỳ vọng |
|---|---|---|
| 3.1 | Nói: *"Giờ tôi giết hẳn agent — process đang giữ toàn bộ engine."* → **Ctrl+C terminal agent** | Agent chết |
| 3.2 | (Tuỳ, thêm kịch tính) Reload luôn trang web | Sidebar còn, khung chat trống |
| 3.3 | `pnpm dev:agent` lại | Agent lên trong ~2 giây |
| 3.4 | Click lại thread vừa chat trên sidebar | **Toàn bộ hội thoại hiện lại đầy đủ, không đúp, không dòng summary nào** |
| 3.5 | Gõ: **"Nhắc lại giúp tôi: màu và số của tôi là gì?"** | Bot trả lời **teal + 42** — engine resume từ đúng những checkpoint vừa xem ở màn 2 |

**Câu chốt màn 3:** *"Process mới toanh, RAM trống trơn — agent đọc lại chính các row checkpoint mọi người vừa thấy và tiếp tục như chưa hề có cuộc chia ly. Restart, redeploy, đổi máy: chat không mất gì."*

## Màn 4 — Xoá là sạch tuyệt đối (≈1.5')

| Bước | Làm gì | Kỳ vọng |
|---|---|---|
| 4.1 | TablePlus: chạy **Query C** trước khi xoá | Thấy turns / checkpoints / writes > 0 |
| 4.2 | Sidebar → nút 🗑 trên thread (bấm 2 lần — xác nhận) | Thread biến khỏi sidebar |
| 4.3 | Chạy lại **Query C** | **0 / 0 / 0** — transcript, checkpoint, pending writes sạch trong một lần xoá |

**Câu chốt màn 4:** *"v1 phải xoá ở hai hệ khác nhau và phần Postgres là best-effort. Giờ một nơi, một transaction."*

## Backup cho Q&A (không demo live, trả lời khi bị hỏi)

- **"User khác đoán được thread UUID thì sao?"** → chỉ cột `user_id` trong `checkpoints`: mọi query scope theo user — sai user là 0 rows. (Đã test bằng curl trực tiếp vào worker.)
- **"Compaction hoạt động không, có mất lịch sử không?"** → chat qua 16 message thì engine tự tóm tắt; lúc đó chạy lại lệnh decode sẽ thấy engine chỉ còn summary + vài message cuối, trong khi `memory_turns` và UI vẫn đủ 100%. (Số message trong decode < số dòng transcript = compaction đang chạy.)
- **"Sao checkpoint không tăng mãi?"** → prune giữ 20 checkpoint mới nhất mỗi thread, chạy ngay trong lệnh put, không cần cron — nếu Query B đứng ở 20 thì đó là feature.
- **"Latency D1 có chậm không?"** → local ~4ms/round-trip; production ước 100–200ms/lượt nhưng ẩn sau thời gian model stream; sẽ đo thật khi deploy worker.

---

## SQL + lệnh dùng trong demo

Lấy nhanh thread id đang demo (hoặc dùng biến `latest` như các query dưới):

```sql
SELECT thread_id FROM memory_turns ORDER BY created_at DESC LIMIT 1;
```

```sql
-- Query A — transcript vừa sinh ra (tự lấy thread mới nhất)
SELECT role, substr(content, 1, 60) AS content, message_id, created_at
FROM memory_turns
WHERE thread_id = (SELECT thread_id FROM memory_turns ORDER BY created_at DESC LIMIT 1)
ORDER BY created_at;
```

```sql
-- Query B — đếm checkpoint của thread đang demo (chạy trước/sau mỗi message)
SELECT COUNT(*) AS checkpoints
FROM checkpoints
WHERE thread_id = (SELECT thread_id FROM memory_turns ORDER BY created_at DESC LIMIT 1);
```

```sql
-- Query C — trước/sau khi xoá thread (thay <THREAD_ID> trước màn 4,
-- vì sau khi xoá thì subquery "thread mới nhất" sẽ trỏ sang thread khác)
SELECT
  (SELECT COUNT(*) FROM memory_turns      WHERE thread_id = '<THREAD_ID>') AS turns,
  (SELECT COUNT(*) FROM checkpoints       WHERE thread_id = '<THREAD_ID>') AS checkpoints,
  (SELECT COUNT(*) FROM checkpoint_writes WHERE thread_id = '<THREAD_ID>') AS writes;
```

**Lệnh decode checkpoint** (terminal 4, chạy từ `apps/memory-worker` — tự chọn thread mới nhất, in danh sách message trong engine state):

```bash
pnpm exec wrangler d1 execute MEMORY_DB --local --env offline --json --command \
"SELECT checkpoint FROM checkpoints WHERE thread_id = (SELECT thread_id FROM memory_turns ORDER BY created_at DESC LIMIT 1) ORDER BY checkpoint_id DESC LIMIT 1" \
| python3 -c "
import sys, json, base64
cp = json.loads(base64.b64decode(json.load(sys.stdin)[0]['results'][0]['checkpoint']))
msgs = cp['channel_values'].get('messages', [])
print(f'=== ENGINE STATE — {len(msgs)} messages trong checkpoint moi nhat ===')
for m in msgs:
    kind = m.get('id', ['?'])[-1] if isinstance(m.get('id'), list) else '?'
    content = m.get('kwargs', m).get('content', '')
    text = content if isinstance(content, str) else str(content)
    print(f'- [{kind}] {text[:80]!r}')
"
```

## Những cái bẫy cần tránh

- **Bật worker trước agent** — agent thiếu `MEMORY_WORKER_URL` sống được sẽ fallback in-memory và màn 3 mất tác dụng (nếu log agent có warning `using in-memory checkpoints` thì dừng lại kiểm tra `.env`).
- Đừng sửa data từ TablePlus khi wrangler đang chạy — chỉ đọc.
- Lệnh decode chạy được cả khi wrangler dev đang mở (dùng chung file SQLite local, chỉ đọc).
- Query C phải điền `<THREAD_ID>` cứng **trước** màn 4 — sau khi xoá, subquery "thread mới nhất" trỏ sang thread khác.
- Nếu quên xoá thread test cũ, sidebar sẽ có mấy thread "show my profile" từ trước — không sao, nhưng sạch vẫn đẹp hơn.
