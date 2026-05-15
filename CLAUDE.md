# CLAUDE.md — Theia Projesi · Oturum Baglamı
> Son guncelleme: 2026.05.10 · Portal v2.2

## Dizin Yapısı
- ~/theia-soul/static/index.html  → ANA KAYNAK (buraya yaz)
- ~/theia-app/www/index.html      → APK icin kopyalanır
- ~/theia-github/static/index.html → GitHub referans
- ~/Android/Sdk                   → Android SDK
- soul.db                         → SQLite (gorevler tablosu burada)

## APK Build Akısı
export ANDROID_HOME=~/Android/Sdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
cp ~/theia-soul/static/index.html ~/theia-app/www/index.html
cd ~/theia-app && npx cap sync android
cd android && ./gradlew assembleDebug --no-daemon
cp ~/theia-app/android/app/build/outputs/apk/debug/app-debug.apk ~/Masaüstü/theia-portal.apk

## Soul API
IP: 100.115.79.121:8000 (Tailscale)
Endpoints: /api/health /api/chat /api/memory /api/persona/snapshot
           /api/gorev (GET/POST) /api/gorev/{id}/done (PATCH)

## Modül Durumu
CHAT      - APK'dan API hatası (Failed to fetch) - COZULMEDI
VAULT     - Aktif
PERSONA   - Aktif
GATEKEEPER- Aktif
SAGLIK    - Aktif
GOREV     - Aktif, Soul DB bagli
SES       - onMod'da eksik (tek satır eklenecek)
GORUNTU   - Henuz eklenmedi
MIMARI    - Static'te guncel ama APK yanlis adres cekiyor

## Kritik Notlar
- Laptop bataryası yok, fis cekilince /tmp sifirlanıyor
- ANA KAYNAK: ~/theia-soul/static/index.html
- GitHub'a manuel commit atiliyor
- Telegram kapatilacak (artik kullanilmiyor)
- Debug APK, release icin keystore lazim
- Mimari: static'teki dogru, APK'daki adres yanlis
