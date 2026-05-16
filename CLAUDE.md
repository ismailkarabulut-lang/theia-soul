# CLAUDE.md — Theia Projesi · Oturum Bağlamı
> Son güncelleme: 2026.05.16 · Soul API v0.2.0

Bu dosya yeni bir AI oturumu açıldığında projeyi sıfırdan anlamak için yazılmıştır.
Tahmin veya yorum yoktur — her satır çalışan koddan türetilmiştir.

---

## Sistem Özeti

**Theia**, Kaptan İsmail Karabulut'un kişisel sunucusunda (hostname: `theia-core`, Debian 13)
çalışan kişisel AI ekosistemidir. Üç servis, bir SQLite veritabanı ve bir Obsidian vault
üzerine kuruludur.

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
- **Framework:** FastAPI + uvicorn (reload modu — kod değişince otomatik restart)
- **Restart:** `sudo systemctl restart theia-soul`

### 2. `theia.service` — Telegram Botu (Theia Guard)
- **Çalıştıran:** `systemd` → `/usr/bin/python3 /home/ismail/theia/main.py`
- **Kaynak dizin:** `~/theia/` (theia-soul'dan AYRI repo/dizin)
- **Restart:** `sudo systemctl restart theia`

### 3. `theia-electron.service` — Electron Masaüstü (Kullanıcı Servisi)
- **Çalıştıran:** `systemd --user` → `/usr/bin/npm start --prefix /home/ismail/theia-electron`
- **Konum:** `~/.config/systemd/user/theia-electron.service`
- **Başlangıç:** Kullanıcı oturumu açıldığında otomatik
- **Restart:** `systemctl --user restart theia-electron`
- **Not:** Wake word pasif dinlemesi sayfa yüklendiğinde başlar

---

## Dizin Yapısı

```
~/theia-soul/               ← Soul API ana dizini (bu reponun kaynağı)
├── main.py                 ← FastAPI app, router kayıtları, static mount
├── persona_engine.py       ← Read-only analiz motoru
├── obsidian_bridge.py      ← Obsidian → Soul DB senkronizasyon (cron 15dk)
├── soul.db                 ← SQLite: gorevler tablosu
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
│   └── ollama_model.py     ← Yerel Ollama
│
├── api/
│   ├── routes.py           ← Tüm endpoint'ler (chat/memory/speak/stt/youtube/gorev)
│   ├── persona.py          ← GET /api/persona/snapshot
│   └── schemas.py          ← Pydantic modeller
│
├── vosk-models/            ← Offline STT modelleri (git'e girmiyor)
│   └── vosk-model-small-tr-0.3/  ← 36MB Türkçe Vosk modeli
│
├── memory/
│   └── theia.db            ← SQLite: memory + messages + sessions tabloları
│
└── static/                 ← Web arayüzü — FastAPI'den statik servis edilir
    ├── index.html          ← ANA KAYNAK — tüm modüller + wake word motoru
    ├── persona.html
    ├── hud.html
    └── modules/
        ├── vault.js
        ├── persona.js
        ├── saglik.js
        ├── gorev.js
        └── team.js

~/theia-electron/           ← Electron masaüstü uygulaması
├── main.js                 ← Chromium flagleri: PipeWire, no-sandbox, autoplay
└── package.json            ← start: "electron . --no-sandbox"

~/theia-apk/                ← APK build ortamı (~/theia-app/ ve ~/theia-mobile/ silindi)
├── capacitor.config.json   ← androidScheme: http, allowMixedContent (server.url YOK — yerel serve)
└── android/app/src/main/
    ├── AndroidManifest.xml ← INTERNET + RECORD_AUDIO + MODIFY_AUDIO_SETTINGS + networkSecurityConfig
    └── res/xml/network_security_config.xml ← 100.115.79.121 domain izni

~/theia/                    ← Telegram botu (ayrı proje)
~/TheiaMemory/              ← Obsidian vault
└── System/                 ← Bridge okuma hedefi (15dk'da bir Soul DB'ye yazılır)
```

---

## Wake Word Sistemi

| Özellik | Değer |
|---|---|
| Wake word | `"hey theia"` (küçük harf duyarsız, Vosk transcript içinde arar) |
| Pasif dinleme | `ws://localhost:8000/api/ws/stt` — ayrı WebSocket bağlantısı |
| Uyandırma sesi | `POST /api/speak` → "Kaptan Theia seni dinliyor" |
| Aktif mod süresi | 30 saniye — sonra otomatik `goToSleep()` |
| Gösterge | Sol alt köşe · yeşil = pasif · sarı = aktif |
| Kod konumu | `static/index.html` sonundaki ayrı `<script>` bloğu |

---

## Veritabanları

### `memory/theia.db` — Ana hafıza
| Tablo | İçerik |
|---|---|
| `memory` | key-value · entry_type: core/daily_summary/memory · Scout decay |
| `messages` | Konuşma mesajları (role/content/session_id/meta) |
| `sessions` | Oturum kayıtları |

Scout decay: 30 gün sessiz → `passive` · 90 gün → `archived`

### `soul.db` — Görev veritabanı
| Tablo | İçerik |
|---|---|
| `gorevler` | id/baslik/tarih/saat/hat/tekrar/kat/tur/done/done_at/created |

---

## Soul API Endpoint'leri

**Base URL:** `http://100.115.79.121:8000`

| Method | Path | Açıklama |
|---|---|---|
| GET | `/api/health` | Model sağlık durumu |
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
| POST | `/api/speak` | Edge TTS — MP3 stream (tr/tr-m/en) |
| GET | `/api/speak/voices` | Kullanılabilir TTS sesleri |
| WS | `/api/ws/stt` | Vosk offline STT — PCM16/16kHz → JSON transcript |
| GET | `/api/gorev` | Görev listesi |
| POST | `/api/gorev` | Görev oluştur |
| PATCH | `/api/gorev/{id}/done` | Görevi tamamla |
| DELETE | `/api/gorev/{id}` | Görevi sil |
| GET | `/api/persona/snapshot` | Persona analizi |
| POST | `/api/youtube/search` | YouTube arama & tarayıcıda aç |
| GET | `/persona` | Persona HTML sayfası |
| GET | `/` | Soul HUD (index.html) |

---

## Çoklu Model Fabrikası

| İsim | Model | API Key |
|---|---|---|
| `claude` | claude-sonnet-4-6 (varsayılan) | ANTHROPIC_API_KEY |
| `deepseek` | deepseek-chat | DEEPSEEK_API_KEY |
| `kimi` | moonshot-v1-8k | KIMI_API_KEY |
| `ollama` | llama3 | — (yerel) |

Varsayılan: `claude` (`.env`'den `DEFAULT_MODEL` ile değiştirilebilir)

---

## STT (Vosk WebSocket)

**Akış:** `getUserMedia` → `AudioContext(16kHz)` → `ScriptProcessor(4096)` → `Int16Array` → `ws://localhost:8000/api/ws/stt` → `KaldiRecognizer` → `{"text":"...", "final":bool}`

Wake word motoru da aynı endpoint'i kullanır ama ayrı bir WebSocket bağlantısıyla.

**Model:** `vosk-models/vosk-model-small-tr-0.3/` (36MB, git'e girmiyor)

## TTS (Edge TTS)

**Akış:** `speakText(text)` → `fetch('/api/speak', {voice:'tr', rate:'+X%'})` → MP3 blob → `new Audio(url).play()`

Rate dönüşümü: slider 0.5–2.0 → Edge TTS format (1.5 → "+50%")

## Electron Masaüstü

Kritik `main.js` flagleri:
- `WebRTCPipeWireCapturer` — Debian PipeWire mikrofon
- `use-fake-ui-for-media-stream` — otomatik mikrofon izni
- `autoplay-policy=no-user-gesture-required` — TTS autoplay
- `no-sandbox` — GPU sandbox sorunu önleme
- `unsafely-treat-insecure-origin-as-secure=http://localhost:8000`

## APK Build (~/theia-apk/)

```bash
cd ~/theia-apk
rm -rf www/* && cp -r ~/theia-soul/static/* www/
npx cap sync android
cd android && ./gradlew assembleDebug --no-daemon
cp app/build/outputs/apk/debug/app-debug.apk ~/Masaüstü/theia-soul.apk
```

- `server.url` yok — APK dosyaları `www/` içinden yerel serve edilir (getUserMedia için zorunlu)
- `SOUL_API` `window.Capacitor.isNativePlatform()` ile otomatik algılanır → `http://100.115.79.121:8000`
- `~/theia-app/` ve `~/theia-mobile/` kalıcı olarak silindi (2026.05.16)
- Modüller (vault/persona/saglik/gorev) index.html içinde inline · team ayrı uygulama

## STT Notları

- Vosk `AcceptWaveform()` artık `ThreadPoolExecutor`'da çalışıyor — event loop blokajı yok
- STT push-to-talk: 5 saniye minimum, erken durdurmada toast bildirimi
- Wake word timeout: 60 saniye (duraklamalar için)
- `goToSleep()` artık `stopListening()` çağırmaz — kullanıcı kendisi durdurur
- Pasif dinleme: aktif kayıt bitince 500ms sonra yeniden başlar

---

## Modül Durumu (2026.05.16)

| Modül | Durum | Not |
|---|---|---|
| CHAT | ✅ Aktif | Claude / DeepSeek / Kimi / Ollama |
| VAULT | ✅ Aktif | Obsidian bridge ile senkron |
| PERSONA | ✅ Aktif | /api/persona/snapshot |
| GATEKEEPER | ✅ Aktif | v2.3 |
| SAĞLIK | ✅ Aktif | |
| GÖREV | ✅ Aktif | soul.db bağlı |
| TTS | ✅ Aktif | Edge TTS → /api/speak → MP3 |
| STT | ✅ Aktif | Vosk offline Türkçe → /api/ws/stt |
| WAKE WORD | ✅ Aktif | "Hey Theia" — pasif dinleme → 60s aktif mod |
| ELECTRON | ✅ Aktif | systemd --user · otomatik başlatma |
| YOUTUBE | ✅ Aktif | /api/youtube/search · webbrowser.open() |
| APK STT | ✅ Aktif | androidScheme:http + RECORD_AUDIO → getUserMedia çalışıyor |
| APK TTS | ⚠️ Devam | Ses kesilme sorunu — incelenecek |
| GÖRÜNTÜ | ⏳ Planlandı | Screenshot → Claude analizi |
| WHATSAPP | ⏳ Planlandı | Sesli komutla mesaj gönderme |
| TAKVİM | ⏳ Planlandı | Google Calendar entegrasyonu |
| APK | ✅ Aktif | ~/theia-apk/ · 4.2 MB debug build · server.url → 100.115.79.121:8000 |

---

## Geliştirme Notları

- **ANA KAYNAK:** `~/theia-soul/static/index.html` — her zaman buraya yaz
- GitHub'a manuel commit: `cd ~/theia-soul && git add ... && git commit && git push`
- `.env`, `bridge.log`, `nohup.out`, `vosk-models/`, `graphify-out/` gitignore'da
- Soul API reload modunda: routes.py değişince otomatik restart

---

## graphify

This project has a graphify knowledge graph at `graphify-out/`.

- Before answering architecture questions, read `graphify-out/GRAPH_REPORT.md`
- If `graphify-out/wiki/index.md` exists, navigate it instead of reading raw files
- After modifying code files, run `graphify update .` to keep the graph current
