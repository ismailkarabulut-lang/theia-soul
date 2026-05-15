"""
Theia Persona Engine — read-only analiz motoru.
messages tablosundan kullanıcı/asistan davranış örüntülerini çıkarır.
DB bağlantısı 'mode=ro' URI ile açılır; hiçbir yazma operasyonu yoktur.
"""

import sqlite3
import json
import re
from datetime import datetime, timedelta
from collections import Counter
from pathlib import Path

DB_PATH = Path(__file__).parent / "memory" / "theia.db"

STOPWORDS = {
    # Türkçe
    "ve", "veya", "ama", "bu", "şu", "o", "bir", "çok", "daha", "en",
    "için", "ile", "gibi", "ne", "ki", "da", "de", "mi", "mı", "mu",
    "mü", "ya", "evet", "hayır", "var", "yok", "oldu", "olur", "olan",
    "ben", "sen", "biz", "siz", "onlar", "kim", "nasıl", "nerede", "niye",
    "neden", "hangi", "hep", "her", "bazı", "kadar", "sonra", "önce",
    "şimdi", "yine", "tekrar", "ise", "eğer", "çünkü", "ancak", "fakat",
    "lakin",
    # İngilizce
    "the", "a", "an", "and", "or", "but", "if", "then", "of", "to", "in",
    "on", "at", "for", "with", "by", "is", "are", "was", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "can", "could", "you", "i", "we", "they", "it", "this",
    "that", "what", "which", "who", "how", "why",
    # Teknik gürültü — kendi adını sıralamasın
    "theia", "soul", "claude",
}

# Emoji unicode aralıkları
_EMOJI_RE = re.compile(
    r"[\U0001F300-\U0001FAFF\U00002600-\U000027BF]", flags=re.UNICODE
)


def _connect() -> sqlite3.Connection:
    uri = f"file:{DB_PATH}?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def _clean_text(s: str) -> str:
    s = re.sub(r"```[\s\S]*?```", " ", s)
    s = re.sub(r"`[^`]*`", " ", s)
    s = re.sub(r"^#{1,6}\s+", " ", s, flags=re.MULTILINE)
    s = re.sub(r"\*\*|__", " ", s)
    s = re.sub(r"\*|_", " ", s)
    s = re.sub(r"^[-=]{3,}", " ", s, flags=re.MULTILINE)
    s = re.sub(r"\[([^\]]+)\]\([^\)]*\)", r"\1", s)
    s = re.sub(r"https?://\S+", " ", s)
    s = _EMOJI_RE.sub(" ", s)
    s = re.sub(r"[^\w\s]", " ", s, flags=re.UNICODE)
    return s.lower()


def _tokenize_tr(s: str) -> list:
    tokens = [t for t in s.split() if len(t) > 2]
    return [t for t in tokens if t not in STOPWORDS]


def _date_filter(window: str) -> str:
    if window == "7d":
        cutoff = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S")
        return f"created_at >= '{cutoff}'"
    if window == "30d":
        cutoff = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%S")
        return f"created_at >= '{cutoff}'"
    # "all" — 2026-05-05 öncesi keşif gürültüsünü çıkar
    return "created_at >= '2026-05-06'"


def analyze(window: str = "all") -> dict:
    conn = _connect()
    try:
        where = _date_filter(window)
        rows = conn.execute(
            f"SELECT role, content, created_at, meta FROM messages WHERE {where} ORDER BY created_at"
        ).fetchall()

        if not rows:
            return {"window": window, "error": "Veri bulunamadı"}

        user_rows = [r for r in rows if r["role"] == "user"]
        asst_rows = [r for r in rows if r["role"] == "assistant"]
        dates = [r["created_at"] for r in rows]

        # ── Frekans ──────────────────────────────────────────────────────────
        user_text = " ".join(_clean_text(r["content"]) for r in user_rows)
        tokens = _tokenize_tr(user_text)

        unigrams = Counter(tokens).most_common(30)

        bigrams: Counter = Counter()
        for i in range(len(tokens) - 1):
            bigrams[(tokens[i], tokens[i + 1])] += 1
        top_bigrams = [
            {"term": f"{a} {b}", "count": c} for (a, b), c in bigrams.most_common(20)
        ]

        trigrams: Counter = Counter()
        for i in range(len(tokens) - 2):
            trigrams[(tokens[i], tokens[i + 1], tokens[i + 2])] += 1
        top_trigrams = [
            {"term": f"{a} {b} {c}", "count": n}
            for (a, b, c), n in trigrams.most_common(15)
        ]

        # ── Zaman örüntüsü ───────────────────────────────────────────────────
        by_hour = [0] * 24
        by_weekday = [0] * 7
        heatmap = [[0] * 24 for _ in range(7)]

        for r in rows:
            try:
                dt = datetime.fromisoformat(r["created_at"])
                h, wd = dt.hour, dt.weekday()
                by_hour[h] += 1
                by_weekday[wd] += 1
                heatmap[wd][h] += 1
            except Exception:
                pass

        peak_hour = by_hour.index(max(by_hour))
        peak_weekday = by_weekday.index(max(by_weekday))

        # ── Uzunluk örüntüsü ─────────────────────────────────────────────────
        user_lens = [len(r["content"]) for r in user_rows]
        asst_lens = [len(r["content"]) for r in asst_rows]
        user_avg = sum(user_lens) / len(user_lens) if user_lens else 0.0
        asst_avg = sum(asst_lens) / len(asst_lens) if asst_lens else 0.0
        ratio = round(user_avg / asst_avg, 3) if asst_avg else 0.0

        bhu_buckets: list = [[] for _ in range(24)]
        bha_buckets: list = [[] for _ in range(24)]
        for r in rows:
            try:
                h = datetime.fromisoformat(r["created_at"]).hour
                if r["role"] == "user":
                    bhu_buckets[h].append(len(r["content"]))
                else:
                    bha_buckets[h].append(len(r["content"]))
            except Exception:
                pass

        bhu = [round(sum(v) / len(v), 1) if v else 0.0 for v in bhu_buckets]
        bha = [round(sum(v) / len(v), 1) if v else 0.0 for v in bha_buckets]

        # ── Oturum örüntüsü ──────────────────────────────────────────────────
        sid_rows = conn.execute(
            f"SELECT DISTINCT session_id FROM messages WHERE {where}"
        ).fetchall()

        session_counts = []
        for sid_row in sid_rows:
            cnt = conn.execute(
                f"SELECT COUNT(*) FROM messages WHERE session_id = ? AND {where}",
                (sid_row["session_id"],),
            ).fetchone()[0]
            session_counts.append(cnt)

        total_sessions = len(session_counts)
        avg_per_session = (
            round(sum(session_counts) / total_sessions, 2) if total_sessions else 0.0
        )
        longest = max(session_counts) if session_counts else 0
        single = sum(1 for c in session_counts if c == 1)
        deep = sum(1 for c in session_counts if c > 10)

        # ── Token sarfiyatı ───────────────────────────────────────────────────
        total_output = 0
        total_input = 0
        by_hour_output = [0] * 24

        for r in asst_rows:
            try:
                meta = json.loads(r["meta"]) if r["meta"] else {}
                out_tok = int(meta.get("output_tokens") or 0)
                in_tok = int(meta.get("input_tokens") or 0)
                total_output += out_tok
                total_input += in_tok
                h = datetime.fromisoformat(r["created_at"]).hour
                by_hour_output[h] += out_tok
            except Exception:
                pass

        avg_output = round(total_output / len(asst_rows), 1) if asst_rows else 0.0

        return {
            "window": window,
            "generated_at": datetime.now().isoformat(),
            "total_messages": len(rows),
            "user_messages": len(user_rows),
            "assistant_messages": len(asst_rows),
            "date_range": {"start": dates[0], "end": dates[-1]},
            "frequency": {
                "top_unigrams": [{"term": t, "count": c} for t, c in unigrams],
                "top_bigrams": top_bigrams,
                "top_trigrams": top_trigrams,
            },
            "time_pattern": {
                "by_hour": by_hour,
                "by_weekday": by_weekday,
                "heatmap": heatmap,
                "peak_hour": peak_hour,
                "peak_weekday": peak_weekday,
            },
            "length_pattern": {
                "user_avg_chars": round(user_avg, 1),
                "assistant_avg_chars": round(asst_avg, 1),
                "user_assistant_ratio": ratio,
                "by_hour_user": bhu,
                "by_hour_assistant": bha,
            },
            "session_pattern": {
                "total_sessions": total_sessions,
                "avg_messages_per_session": avg_per_session,
                "longest_session": longest,
                "single_message_sessions": single,
                "deep_sessions": deep,
            },
            "token_usage": {
                "total_output_tokens": total_output,
                "total_input_tokens": total_input,
                "by_hour_output": by_hour_output,
                "avg_output_per_msg": avg_output,
            },
        }
    finally:
        conn.close()
