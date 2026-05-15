# Theia Soul — Kişisel AI Ekosistemi

Kaptan İsmail Karabulut'un kişisel sunucusunda çalışan, çoklu model destekli,
hafıza ve ses katmanlı AI altyapısı.

---

## Mimari Özeti

```
KAPTAN
  │
  ├── Telegram Bot (theia.service · Python · long-polling)
  │     └── ~/theia/main.py
  │
  ├── Soul HUD (tarayıcı / APK · index.html)
  │     ├── Chat → POST /api/chat
  │     ├── Vault → GET /api/memory
  │     ├── Persona → GET /api/persona/snapshot
  │     ├── Sağlık → GET /api/health
  │     ├── Görev → GET/POST /api/gorev
  │     └── Ses → POST /api/speak (Edge TTS)
  │
  └── Soul API (theia-soul.service · FastAPI · :8000)
        ├── Model Fabrikası → Claude / DeepSeek / Kimi / Ollama
        ├── Gatekeeper v2.3 (risk sınıflandırıcı)
        ├── Scout (hafıza decay motoru · 30/90 gün)
        ├── Persona Engine (konuşma analitik motoru)
        └── Obsidian Bridge (cron 15dk · TheiaMemory/System/ → Soul DB)

Erişim: Tailscale · 100.115.79.121:8000
```

---

## Servisler

| Servis | Komut | Açıklama |
|---|---|---|
| `theia-soul.service` | `sudo systemctl restart theia-soul` | Soul API (FastAPI) |
| `theia.service` | `sudo systemctl restart theia` | Telegram botu |

---

## API Endpoint'leri

| Method | Path | Açıklama |
|---|---|---|
| GET | `/api/health` | Model sağlık durumu |
| POST | `/api/chat` | Senkron chat |
| POST | `/api/chat/stream` | SSE stream chat |
| GET | `/api/memory` | Hafıza listesi |
| PUT | `/api/memory/{key}` | Hafıza yaz |
| GET | `/api/scout/report` | Scout raporu |
| POST | `/api/soul/daily` | Günlük özet yaz |
| POST | `/api/speak` | TTS ses üret |
| GET | `/api/gorev` | Görev listesi |
| POST | `/api/gorev` | Görev oluştur |
| PATCH | `/api/gorev/{id}/done` | Görevi tamamla |
| GET | `/api/persona/snapshot` | Persona analizi |

---

## Desteklenen Modeller

| İsim | Model | Kaynak |
|---|---|---|
| `claude` | claude-sonnet-4-6 | Anthropic API (varsayılan) |
| `deepseek` | deepseek-chat | DeepSeek API |
| `kimi` | moonshot-v1-8k | Moonshot API |
| `ollama` | llama3 | Yerel Ollama |

Chat isteğinde `model` alanıyla seçilir. Varsayılan `.env`'deki `DEFAULT_MODEL`.

---

## Kurulum

### Gereksinimler
- Python 3.11+
- Node.js 18+ (APK build için)
- JDK 21 (APK build için)
- Android SDK build-tools 34 (APK build için)
- Tailscale (uzak erişim için)

### Soul API

```bash
git clone https://github.com/ismailkarabulut-lang/theia-soul
cd theia-soul

python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# .env dosyasını oluştur
cp .env.example .env
# .env içine ANTHROPIC_API_KEY, DEEPSEEK_API_KEY, KIMI_API_KEY yaz

python main.py
```

### Android APK

```bash
# ANA KAYNAK her zaman ~/theia-soul/static/index.html
# Önce index.html'deki SOUL_API IP'sini güncelle

cp ~/theia-soul/static/index.html ~/theia-app/www/index.html

export ANDROID_HOME=~/Android/Sdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH

cd ~/theia-app
npx cap sync android
cd android && ./gradlew assembleDebug --no-daemon

# APK çıktısı:
# android/app/build/outputs/apk/debug/app-debug.apk
```

**Not:** Debug build. Dağıtım için release build + keystore gerekir.

---

## Obsidian Bridge

`~/TheiaMemory/System/` dizinine yazılan her `.md` dosyası
15 dakika içinde Soul DB'ye (`memory` tablosu) girer.

- `core_identity.md` → `entry_type: core` (Theia kimlik tanımı)
- Diğer `.md` dosyaları → `entry_type: memory`
- Günlük özetler → `POST /api/soul/daily` ile yazılır

---

## Modül Durumu

| Modül | Durum |
|---|---|
| Chat | ✅ Aktif |
| Vault | ✅ Aktif |
| Persona Engine | ✅ Aktif |
| Gatekeeper v2.3 | ✅ Aktif |
| Sağlık | ✅ Aktif |
| Görev | ✅ Aktif |
| Ses (TTS) | ✅ Aktif |
| Görüntü Analizi | ⏳ Planlandı |
| WhatsApp Mesaj | ⏳ Planlandı |
| YouTube | ⏳ Planlandı |
| Google Calendar | ⏳ Planlandı |
| Android APK | ⚠️ IP sorunu |

---

## Bağımlılıklar (Python)

```
fastapi
uvicorn
anthropic
python-dotenv
aiosqlite
edge-tts
pydantic
```

## Bağımlılıklar (APK)

```json
{
  "@capacitor/core": "7.x",
  "@capacitor/android": "7.x",
  "@capacitor-community/speech-recognition": "7.0.1",
  "@capacitor-community/text-to-speech": "latest",
  "@capacitor/local-notifications": "8.x",
  "@capacitor/splash-screen": "8.x",
  "@capacitor/status-bar": "8.x"
}
```

---

*Theia Soul · 2026.05*
