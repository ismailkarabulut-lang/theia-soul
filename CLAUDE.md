# CLAUDE.md — Theia Projesi · Oturum Bağlamı
> Son güncelleme: 2026.05.15 · Soul API v0.1.0

Bu dosya yeni bir AI oturumu açıldığında projeyi sıfırdan anlamak için yazılmıştır.
Tahmin veya yorum yoktur — her satır çalışan koddan türetilmiştir.

---

## Sistem Özeti

**Theia**, Kaptan İsmail Karabulut'un kişisel sunucusunda (hostname: `theia-core`, Debian 13)
çalışan kişisel AI ekosistemidir. İki ayrı servis, bir SQLite veritabanı ve bir Obsidian
vault üzerine kuruludur.

---

## Fiziksel Altyapı

| Bileşen | Değer |
|---|---|
| Sunucu | `theia-core` · Debian 13 |
| Tailscale IP | `100.115.79.121` |
| Soul API portu | `8000` |
| Ağ erişimi | Tailscale VPN üzerinden (dışarıdan doğrudan erişim yok) |
| Kritik not | Laptop bataryası yok — fiş çekilirse `/tmp` sıfırlanır |

---

## Servisler

### 1. `theia-soul.service` — Soul API (Ana Çekirdek)
- **Çalıştıran:** `systemd` → `/home/ismail/theia-soul/venv/bin/python main.py`
- **Kaynak dizin:** `~/theia-soul/`
- **Başlangıç:** 2026-05-12 (3+ gündür kesintisiz çalışıyor)
- **Framework:** FastAPI + uvicorn (multiprocessing modu)
- **Bellek:** ~138 MB

### 2. `theia.service` — Telegram Botu (Theia Guard)
- **Çalıştıran:** `systemd` → `/usr/bin/python3 /home/ismail/theia/main.py`
- **Kaynak dizin:** `~/theia/` (theia-soul'dan AYRI repo/dizin)
- **Durum:** Aktif, polling modunda, dakikada bir `minute_job` çalışıyor
- **Not:** Eski CLAUDE.md'de "kapatılacak" yazıyordu — bu yanlıştı. Bot aktif ve kullanımda.

---

## Dizin Yapısı

```
~/theia-soul/               ← Soul API ana dizini (bu reponun kaynağı)
├── main.py                 ← FastAPI app, router kayıtları, static mount
├── persona_engine.py       ← Read-only analiz motoru (theia.db okur)
├── obsidian_bridge.py      ← Obsidian → Soul DB senkronizasyon scripti (cron, 15dk)
├── soul.db                 ← SQLite: gorevler tablosu burada
├── .env                    ← API anahtarları (git'e girmiyor)
│
├── core/
│   ├── config.py           ← .env okur, tüm sabitleri tanımlar
│   ├── db.py               ← SQLite async bağlantı, memory/session/message CRUD
│   ├── base_model.py       ← BaseModel abstract sınıf, GenerateRequest, Message
│   └── theia_soul.py       ← Theia sistem promptu (build_system fonksiyonu)
│
├── models/
│   ├── factory.py          ← get_model("claude"|"deepseek"|"kimi"|"ollama") → singleton
│   ├── claude_model.py     ← Anthropic Claude (varsayılan)
│   ├── deepseek_model.py   ← DeepSeek API
│   ├── kimi_model.py       ← Moonshot/Kimi API
│   └── ollama_model.py     ← Yerel Ollama (llama3 varsayılan)
│
├── api/
│   ├── routes.py           ← Tüm ana endpoint'ler (health/chat/memory/scout/gorev/speak)
│   ├── persona.py          ← GET /api/persona/snapshot endpoint'i
│   └── schemas.py          ← Pydantic modeller
│
├── memory/
│   └── theia.db            ← SQLite: memory + messages + sessions tabloları
│
└── static/                 ← Web arayüzü (Soul HUD) — FastAPI'den statik servis edilir
    ├── index.html          ← ANA KAYNAK — tek sayfa uygulama (tüm modüller burada)
    ├── persona.html        ← Persona analiz sayfası (/persona endpoint'i)
    ├── hud.html            ← HUD görünümü
    ├── theia_mimari_v3_1.html ← Mimari görsel dokümantasyon
    └── modules/
        ├── vault.js        ← Vault modülü JS
        ├── persona.js      ← Persona modülü JS
        ├── saglik.js       ← Sağlık modülü JS
        ├── gorev.js        ← Görev modülü JS
        └── team.js         ← Team modülü JS

~/theia/                    ← Telegram botu (ayrı proje)
~/TheiaMemory/              ← Obsidian vault
└── System/                 ← Bridge'in okuma hedefi (15dk'da bir Soul DB'ye yazılır)
```

---

## Veritabanları

### `memory/theia.db` — Ana hafıza (Soul API okur/yazar)
| Tablo | İçerik |
|---|---|
| `memory` | key-value hafıza kayıtları · entry_type: core/daily_summary/memory · Scout decay yönetir |
| `messages` | Tüm konuşma mesajları (role/content/session_id/meta) |
| `sessions` | Oturum kayıtları |

Scout decay kuralları: 30 gün sessiz → `passive`, 90 gün sessiz → `archived`

### `soul.db` — Görev veritabanı (routes.py doğrudan açar)
| Tablo | İçerik |
|---|---|
| `gorevler` | id/baslik/tarih/saat/hat/tekrar/kat/tur/done/done_at/created |

---

## Soul API Endpoint'leri

**Base URL:** `http://100.115.79.121:8000`

| Method | Path | Açıklama |
|---|---|---|
| GET | `/api/health` | Tüm modellerin sağlık durumu (claude/deepseek/kimi/ollama) |
| POST | `/api/chat` | Senkron chat (model seçilebilir) |
| POST | `/api/chat/stream` | SSE stream chat |
| GET | `/api/sessions` | Oturum listesi |
| GET | `/api/sessions/{id}/messages` | Oturum mesajları |
| DELETE | `/api/sessions/{id}` | Oturum sil |
| GET | `/api/memory` | Tüm global hafıza kayıtları |
| PUT | `/api/memory/{key}` | Hafıza yaz/güncelle |
| DELETE | `/api/memory/{key}` | Hafıza kaydı sil |
| GET | `/api/scout/report` | Scout raporu (status filtreli) |
| GET | `/api/scout/summary` | Scout özet istatistik |
| PATCH | `/api/scout/status/{key}` | Manuel status güncelle |
| POST | `/api/soul/daily` | Günlük özet yaz (theia-brief) |
| POST | `/api/speak` | Edge TTS — Türkçe/İngilizce ses üret |
| GET | `/api/speak/voices` | Kullanılabilir sesler |
| GET | `/api/gorev` | Görev listesi |
| POST | `/api/gorev` | Görev oluştur |
| PATCH | `/api/gorev/{id}/done` | Görevi tamamla |
| DELETE | `/api/gorev/{id}` | Görevi sil |
| GET | `/api/persona/snapshot` | Persona analizi (window: all/7d/30d) |
| GET | `/persona` | Persona HTML sayfası |
| GET | `/` | Soul HUD (index.html) |

---

## Çoklu Model Fabrikası

`models/factory.py` → `get_model(name)` → singleton döner

| İsim | Model | API Key |
|---|---|---|
| `claude` | claude-sonnet-4-6 (varsayılan) | ANTHROPIC_API_KEY |
| `deepseek` | deepseek-chat | DEEPSEEK_API_KEY |
| `kimi` | moonshot-v1-8k | KIMI_API_KEY |
| `ollama` | llama3 | — (yerel) |

Varsayılan model: `claude` (`.env`'den `DEFAULT_MODEL` ile değiştirilebilir)

---

## Sistem Promptu

`core/theia_soul.py` → `build_system()` fonksiyonu

`_build_system()` (routes.py içinde) şöyle çalışır:
1. `req.system` varsa onu kullan (override)
2. Yoksa `db.list_memory()` → tüm hafıza kayıtlarını çek → `build_system(user_memory=...)` çağır

`build_system()` parametreleri:
- `web=True` → web arama suffix'i ekler
- `vault_context` → vault içeriği
- `web_context` → web arama sonucu
- `user_memory` → DB'den gelen hafıza kayıtları

---

## Obsidian Bridge

**Script:** `~/theia-soul/obsidian_bridge.py`
**Çalışma:** Cron ile 15 dakikada bir
**Kaynak:** `~/TheiaMemory/System/*.md`
**Hedef:** Soul API → `PUT /api/memory/{key}`
**Scout:** Aynı script decay kontrolü de yapar (30/90 gün kuralı)

---

## Modül Durumu (2026.05.15)

| Modül | Durum | Not |
|---|---|---|
| CHAT | ✅ Aktif | Web'den çalışıyor |
| VAULT | ✅ Aktif | |
| PERSONA | ✅ Aktif | /api/persona/snapshot |
| GATEKEEPER | ✅ Aktif | v2.3 |
| SAĞLIK | ✅ Aktif | |
| GÖREV | ✅ Aktif | soul.db bağlı |
| SES (TTS) | ✅ Aktif | Edge TTS, tr/tr-m/en |
| GÖRÜNTÜ | ⏳ Planlandı | Screenshot → Claude analizi |
| WHATSAPP | ⏳ Planlandı | Sesli komutla mesaj gönderme |
| YOUTUBE | ⏳ Planlandı | Kanal istatistikleri + şarkı açma |
| TAKVİM | ⏳ Planlandı | Google Calendar entegrasyonu |
| APK (Android) | ⚠️ Sorunlu | Failed to fetch — APK'daki IP/adres yanlış |

---

## APK Build Akışı

```bash
export ANDROID_HOME=~/Android/Sdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH

cp ~/theia-soul/static/index.html ~/theia-app/www/index.html
cd ~/theia-app && npx cap sync android
cd android && ./gradlew assembleDebug --no-daemon
cp ~/theia-app/android/app/build/outputs/apk/debug/app-debug.apk ~/Masaüstü/theia-portal.apk
```

**Not:** Debug build. Release için keystore gerekir. APK'daki `SOUL_API` sabiti ve
`capacitor.config.ts`'deki `allowNavigation` IP'si güncellenmeli.

---

## Geliştirme Notları

- **ANA KAYNAK:** `~/theia-soul/static/index.html` — her zaman buraya yaz
- GitHub'a manuel commit atılıyor (`~/theia-soul/` → `git push`)
- `.env` dosyası git'e girmiyor (API anahtarları)
- `bridge.log` ve `nohup.out` gitignore'da
- Soul API reload modunda çalışıyor (kod değişince otomatik restart)
- Servis restart: `sudo systemctl restart theia-soul`
- Bot restart: `sudo systemctl restart theia`

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
