# Theia Soul — Kişisel AI Ekosistemi

Kaptan İsmail Karabulut'un kişisel sunucusunda çalışan, çoklu model destekli,
offline ses tanıma, wake word ve Edge TTS katmanlı AI altyapısı.

---

## Mimari Özeti

```
KAPTAN
  │
  ├── Electron Masaüstü (theia-electron.service · systemd --user · otomatik)
  │     ├── localhost:8000 → Soul HUD
  │     └── Wake word "Hey Theia" → pasif Vosk dinleme → aktif komut modu
  │
  ├── Soul HUD (tarayıcı / APK · index.html)
  │     ├── Chat    → POST /api/chat
  │     ├── Vault   → GET  /api/memory
  │     ├── Persona → GET  /api/persona/snapshot
  │     ├── Sağlık  → GET  /api/health
  │     ├── Görev   → GET/POST /api/gorev
  │     ├── TTS     → POST /api/speak → MP3 → Audio.play()
  │     ├── STT     → WS   /api/ws/stt → Vosk offline Türkçe
  │     └── YouTube → POST /api/youtube/search → webbrowser.open()
  │
  ├── Telegram Bot (theia.service · Python · long-polling)
  │
  └── Soul API (theia-soul.service · FastAPI · :8000)
        ├── Model Fabrikası → Claude / DeepSeek / Kimi / Ollama
        ├── Gatekeeper v2.3
        ├── Scout (hafıza decay · 30/90 gün)
        ├── Persona Engine
        ├── Vosk STT WebSocket (/api/ws/stt · offline Türkçe)
        ├── Edge TTS (/api/speak · tr/tr-m/en)
        ├── YouTube Arama (/api/youtube/search)
        └── Obsidian Bridge (cron 15dk)

Erişim: Tailscale · 100.115.79.121:8000
```

---

## Servisler

| Servis | Tür | Komut |
|---|---|---|
| `theia-soul.service` | system | `sudo systemctl restart theia-soul` |
| `theia.service` | system | `sudo systemctl restart theia` |
| `theia-electron.service` | user | `systemctl --user restart theia-electron` |

---

## API Endpoint'leri

| Method | Path | Açıklama |
|---|---|---|
| GET | `/api/health` | Model sağlık durumu |
| POST | `/api/chat` | Senkron chat |
| POST | `/api/chat/stream` | SSE stream chat |
| GET | `/api/memory` | Hafıza listesi |
| PUT | `/api/memory/{key}` | Hafıza yaz |
| DELETE | `/api/memory/{key}` | Hafıza sil |
| GET | `/api/scout/report` | Scout raporu |
| GET | `/api/scout/summary` | Scout özet |
| PATCH | `/api/scout/status/{key}` | Status güncelle |
| POST | `/api/soul/daily` | Günlük özet yaz |
| POST | `/api/speak` | Edge TTS → MP3 stream (tr/tr-m/en) |
| GET | `/api/speak/voices` | Kullanılabilir sesler |
| WS | `/api/ws/stt` | Vosk offline STT — PCM16/16kHz → JSON transcript |
| GET | `/api/gorev` | Görev listesi |
| POST | `/api/gorev` | Görev oluştur |
| PATCH | `/api/gorev/{id}/done` | Görevi tamamla |
| DELETE | `/api/gorev/{id}` | Görevi sil |
| GET | `/api/persona/snapshot` | Persona analizi |
| POST | `/api/youtube/search` | YouTube arama & tarayıcıda aç |

---

## Desteklenen Modeller

| İsim | Model | Kaynak |
|---|---|---|
| `claude` | claude-sonnet-4-6 | Anthropic API (varsayılan) |
| `deepseek` | deepseek-chat | DeepSeek API |
| `kimi` | moonshot-v1-8k | Moonshot API |
| `ollama` | llama3 | Yerel Ollama |

---

## Wake Word

"Hey Theia" deyince:
1. Vosk pasif dinlemesi tetiklenir (`ws://localhost:8000/api/ws/stt`)
2. Edge TTS ile "Kaptan Theia seni dinliyor" sesi çalar
3. `startListening()` çağrılır — aktif komut modu başlar
4. 30 saniye sessizlik sonrası otomatik pasife döner

Sol alt köşede gösterge: **yeşil** = pasif · **sarı** = aktif

---

## Kurulum

### Gereksinimler
- Python 3.11+ · Node.js 18+ · Tailscale

### Soul API

```bash
git clone https://github.com/ismailkarabulut-lang/theia-soul
cd theia-soul
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # API anahtarlarını doldur
python main.py
```

### Offline STT (Vosk Türkçe)

```bash
pip install vosk
mkdir -p vosk-models && cd vosk-models
wget https://alphacephei.com/vosk/models/vosk-model-small-tr-0.3.zip
unzip vosk-model-small-tr-0.3.zip
```

Model ilk bağlantıda yüklenir (~1s), sonraki bağlantılarda önbellekten gelir.

### Electron Masaüstü (Debian/Linux)

```bash
# Tek seferlik kurulum
cd ~/theia-electron && npm install

# Manuel başlatma
npm start

# Systemd servisi (oturum açılışında otomatik)
systemctl --user enable --now theia-electron.service
```

### Android APK

```bash
cd ~/theia-mobile
rm -rf www/* && cp -r ~/theia-soul/static/* www/
npx cap sync android
cd android && ./gradlew assembleDebug --no-daemon
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

⚠️ APK build öncesi `static/` içinde `localhost:8000` yerine `100.115.79.121:8000` olduğunu doğrula.

---

## Modül Durumu

| Modül | Durum | Not |
|---|---|---|
| Chat | ✅ Aktif | Claude / DeepSeek / Kimi / Ollama |
| Vault | ✅ Aktif | Obsidian bridge ile senkron |
| Persona Engine | ✅ Aktif | /api/persona/snapshot |
| Gatekeeper v2.3 | ✅ Aktif | Risk sınıflandırıcı |
| Sağlık | ✅ Aktif | |
| Görev | ✅ Aktif | soul.db bağlı |
| TTS | ✅ Aktif | Edge TTS → /api/speak → MP3 |
| STT | ✅ Aktif | Vosk offline Türkçe → /api/ws/stt |
| Wake Word | ✅ Aktif | "Hey Theia" — 30s aktif mod |
| Electron | ✅ Aktif | systemd --user · otomatik başlatma |
| YouTube | ✅ Aktif | /api/youtube/search |
| Görüntü Analizi | ⏳ Planlandı | Screenshot → Claude |
| WhatsApp | ⏳ Planlandı | Sesli komutla mesaj |
| Google Calendar | ⏳ Planlandı | |
| Android APK | ⚠️ IP sorunu | SOUL_API sabiti güncellenmeli |

---

## Bağımlılıklar (Python)

```
fastapi · uvicorn · anthropic · python-dotenv
aiosqlite · edge-tts · pydantic · vosk
```

---

*Theia Soul · 2026.05.16*
