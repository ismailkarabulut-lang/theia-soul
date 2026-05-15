# CLAUDE.md — Theia Projesi · Oturum Bağlamı
> Son güncelleme: 2026.05.16 · Soul API v0.2.0

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

### 3. `theia-electron.service` — Electron Masaüstü Uygulaması (Kullanıcı Oturumu)
- **Çalıştıran:** `systemd --user` → `/usr/bin/npm start --prefix /home/ismail/theia-electron`
- **Konum:** `~/.config/systemd/user/theia-electron.service`
- **Başlangıç:** Kullanıcı oturumu açıldığında otomatik
- **Not:** Wake word pasif dinlemesi sayfa yüklendiğinde başlar

---

## Dizin Yapısı

~/theia-soul/ ← Soul API ana dizini (bu reponun kaynağı)
├── CLAUDE.md ← Bu dosya
├── main.py ← FastAPI app, router kayıtları, static mount
├── persona_engine.py ← Read-only analiz motoru (theia.db okur)
├── obsidian_bridge.py ← Obsidian → Soul DB senkronizasyon scripti (cron, 15dk)
├── soul.db ← SQLite: gorevler tablosu burada
├── .env ← API anahtarları (git'e girmiyor)
│
├── core/
│ ├── config.py ← .env okur, tüm sabitleri tanımlar
│ ├── db.py ← SQLite async bağlantı, memory/session/message CRUD
│ ├── base_model.py ← BaseModel abstract sınıf, GenerateRequest, Message
│ └── theia_soul.py ← Theia sistem promptu (build_system fonksiyonu)
│
├── models/
│ ├── factory.py ← get_model("claude"|"deepseek"|"kimi"|"ollama") → singleton
│ ├── claude_model.py ← Anthropic Claude (varsayılan)
│ ├── deepseek_model.py ← DeepSeek API
│ ├── kimi_model.py ← Moonshot/Kimi API
│ └── ollama_model.py ← Yerel Ollama (llama3 varsayılan)
│
├── api/
│ ├── routes.py ← Tüm ana endpoint'ler + WebSocket STT (/api/ws/stt) + YouTube endpoint'i
│ ├── persona.py ← GET /api/persona/snapshot endpoint'i
│ └── schemas.py ← Pydantic modeller
│
├── vosk-models/ ← Offline STT modelleri (git'e girmiyor)
│ └── vosk-model-small-tr-0.3/ ← 36MB Türkçe Vosk modeli
│
├── memory/
│ └── theia.db ← SQLite: memory + messages + sessions tabloları
│
└── static/ ← Web arayüzü (Soul HUD) — FastAPI'den statik servis edilir
├── index.html ← ANA KAYNAK — tek sayfa uygulama (Wake Word motoru içerir)
├── index.html.bak ← Wake Word ekleme öncesi yedek
├── persona.html ← Persona analiz sayfası (/persona endpoint'i)
├── hud.html ← HUD görünümü
└── modules/
├── vault.js ← Vault modülü JS
├── persona.js ← Persona modülü JS
├── saglik.js ← Sağlık modülü JS
├── gorev.js ← Görev modülü JS
└── team.js ← Team modülü JS

~/theia-mobile/ ← APK build ortamı (yeni, eski ~/theia-app/ silinmiştir)
├── capacitor.config.json ← server.url: http://100.115.79.121:8000
├── www/ ← ~/theia-soul/static/* buraya kopyalanır
└── android/
└── app/src/main/
├── AndroidManifest.xml ← cleartextTraffic + networkSecurityConfig eklenmiş
└── res/xml/
└── network_security_config.xml ← 100.115.79.121 için HTTP izni

~/theia-electron/ ← Electron masaüstü uygulaması (ayrı dizin)
├── main.js ← Electron ana prosesi (mikrofon izni, PipeWire, no-sandbox)
└── package.json ← electron . --no-sandbox

~/theia/ ← Telegram botu (ayrı proje)
~/TheiaMemory/ ← Obsidian vault
└── System/ ← Bridge'in okuma hedefi (15dk'da bir Soul DB'ye yazılır)
text


---

## Wake Word Sistemi (Yeni)

| Özellik | Değer |
|---|---|
| Wake Word | "Hey Theia" (küçük harf duyarsız) |
| Geri Bildirim | "Kaptan Theia seni dinliyor" (Edge TTS ile sesli) |
| Pasif Durum Göstergesi | Sol alt köşe yeşil yazı |
| Aktif Durum Göstergesi | Sarı arka plan |
| Otomatik Uyku | 30 saniye sessizlik sonrası pasife dönüş |
| Uygulama | `static/index.html` içinde ayrı `<script>` bloğu |
| WebSocket | `ws://localhost:8000/api/ws/stt` (pasif dinleme için ayrı bağlantı) |

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
| GET | `/api/health` | Tüm modellerin sağlık durumu |
| POST | `/api/chat` | Senkron chat |
| POST | `/api/chat/stream` | SSE stream chat |
| GET | `/api/sessions` | Oturum listesi |
| GET | `/api/sessions/{id}/messages` | Oturum mesajları |
| DELETE | `/api/sessions/{id}` | Oturum sil |
| GET | `/api/memory` | Tüm global hafıza kayıtları |
| PUT | `/api/memory/{key}` | Hafıza yaz/güncelle |
| DELETE | `/api/memory/{key}` | Hafıza kaydı sil |
| GET | `/api/scout/report` | Scout raporu |
| GET | `/api/scout/summary` | Scout özet istatistik |
| PATCH | `/api/scout/status/{key}` | Manuel status güncelle |
| POST | `/api/soul/daily` | Günlük özet yaz |
| POST | `/api/speak` | Edge TTS — Türkçe/İngilizce ses (MP3 stream) |
| GET | `/api/speak/voices` | Kullanılabilir sesler |
| WS | `/api/ws/stt` | Vosk offline STT (PCM16/16kHz binary → JSON transcript) |
| GET | `/api/gorev` | Görev listesi |
| POST | `/api/gorev` | Görev oluştur |
| PATCH | `/api/gorev/{id}/done` | Görevi tamamla |
| DELETE | `/api/gorev/{id}` | Görevi sil |
| GET | `/api/persona/snapshot` | Persona analizi |
| POST | `/api/youtube/search` | 🆕 YouTube arama & tarayıcıda aç |
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

---

## APK Build Akışı (Güncel — 2026.05.16)

### ⚠️ Kritik: SOUL_API Sabiti Güncelleme
APK build etmeden önce `static/` içindeki JS dosyalarında `SOUL_API` sabitinin
doğru IP'yi gösterdiğinden emin olun. Şu komutla kontrol edin:
```bash
grep -rn "SOUL_API\|soul_api\|localhost:8000\|127.0.0.1" ~/theia-soul/static/ | grep -v ".bak"

Eğer localhost veya yanlış IP görürseniz, 100.115.79.121:8000 ile değiştirin.
Build Adımları
bash

# 1. Mobil dizine geç
cd ~/theia-mobile

# 2. www klasörünü temizle ve statik dosyaları kopyala
rm -rf www/*
cp -r ~/theia-soul/static/* www/

# 3. Android'i senkronize et
npx cap sync android

# 4. APK'yı build et
cd android && ./gradlew assembleDebug --no-daemon

# 5. Masaüstüne kopyala
cp app/build/outputs/apk/debug/app-debug.apk ~/Masaüstü/theia-soul.apk

APK Yapılandırma Dosyaları (zaten oluşturuldu, tekrar gerekmez)

    capacitor.config.json: server.url: "http://100.115.79.121:8000"

    AndroidManifest.xml: usesCleartextTraffic="true" + networkSecurityConfig

    network_security_config.xml: 100.115.79.121 domain için HTTP izni

Telefon Gereksinimleri

    Tailscale açık ve theia-core cihazına bağlı olmalı

    "Bilinmeyen kaynaklardan yükleme" izni açık olmalı

Modül Durumu (2026.05.16)
Modül	Durum	Not
CHAT	✅ Aktif	Web'den çalışıyor
VAULT	✅ Aktif	
PERSONA	✅ Aktif	/api/persona/snapshot
GATEKEEPER	✅ Aktif	v2.3
SAĞLIK	✅ Aktif	
GÖREV	✅ Aktif	soul.db bağlı
TTS (ses çıkış)	✅ Aktif	Edge TTS → /api/speak
STT (ses giriş)	✅ Aktif	Vosk offline Türkçe → /api/ws/stt
WAKE WORD	✅ Aktif	"Hey Theia" → pasif dinleme → otomatik komut modu
ELECTRON	✅ Aktif	systemd --user ile otomatik başlatma
YOUTUBE	✅ Aktif	/api/youtube/search endpoint'i eklendi
APK (Android)	⚠️ Hata	"Soul API erişilemiyor" — SOUL_API sabiti kontrol edilecek
WHATSAPP	⏳ Planlandı	Sesli komutla mesaj gönderme
HAVA DURUMU	⏳ Planlandı	Açılış konuşması
GÖRÜNTÜ	⏳ Planlandı	Screenshot → Claude analizi
TAKVİM	⏳ Planlandı	Google Calendar entegrasyonu
TEAM	⏳ Rafta	Başka bir uygulamaya kayabilir
Geliştirme Notları

    ANA KAYNAK: ~/theia-soul/static/index.html — her zaman buraya yaz

    GitHub'a manuel commit atılıyor (~/theia-soul/ → git push)

    .env dosyası git'e girmiyor (API anahtarları)

    bridge.log, nohup.out, vosk-models/ gitignore'da

    Soul API reload modunda çalışıyor (kod değişince otomatik restart)

    Servis restart: sudo systemctl restart theia-soul

    Bot restart: sudo systemctl restart theia

    Electron restart: systemctl --user restart theia-electron

    APK build dizini: ~/theia-mobile/ (eski ~/theia-app/ geçersizdir)

graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:

    Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md

    If graphify-out/wiki/index.md exists, navigate it instead of reading raw files

    For cross-module questions, prefer graphify query "<question>", graphify path "<A>" "<B>", or graphify explain "<concept>"

    After modifying code files in this session, run graphify update . to keep the graph current
