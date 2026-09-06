# Сборка Void Terminal в APK — полное руководство

Это пошаговая инструкция по сборке приложения Void Terminal в
установленный `.apk`-файл для Android. Документ написан полностью на
русском по просьбе — техническая документация проекта (`README.md`)
осталась на английском.

Есть два способа собрать APK:

- **Способ A — локальная сборка через Gradle** (полностью на своей
  машине, без сторонних сервисов, но требует установки Android SDK).
- **Способ B — облачная сборка через EAS Build** (сервис Expo,
  требует бесплатный аккаунт expo.dev, но не нужно ставить Android
  Studio целиком).

Рекомендуется способ A, если вы хотите полный контроль и офлайн-сборку;
способ B — если не хочется возиться с установкой Android SDK.

---

## 0. Важно перед началом

Нативный SSH-модуль приложения (`modules/void-ssh`) был написан «с нуля»
(sshj для Android), потому что единственный существующий npm-пакет для
SSH в React Native (`react-native-ssh-sftp`) заброшен и несовместим с
текущей версией React Native. Код модуля написан внимательно, но **ни
разу не компилировался** — в среде, где создавался проект, не было
Android SDK. Это значит:

- Первая же сборка через `expo prebuild` + Gradle — это одновременно и
  первая реальная проверка, что нативный код компилируется.
- Если Gradle выдаст ошибку компиляции Kotlin в `VoidSshModule.kt` —
  это **не страшно и ожидаемо возможно**: читайте текст ошибки, она
  обычно точно укажет строку и причину (неверное имя метода, тип
  аргумента и т.д.). Список известных рискованных мест — в
  `modules/void-ssh/README.md`.
- Функция mosh (мгновенное восстановление сессии при потере связи) **не
  реализована** — переключатель в интерфейсе есть, но реального
  протокола mosh пока нет, подключение идёт по обычному SSH. Подробности
  — в `README.md`, раздел «Honest feature status».

---

## Способ A — локальная сборка через Gradle

### 1. Установка Node.js

Нужен Node.js версии 20 или новее.

**macOS** (через Homebrew):
```bash
brew install node
```

**Windows/Linux**: скачайте установщик с [nodejs.org](https://nodejs.org)
(выберите LTS-версию) или используйте [nvm](https://github.com/nvm-sh/nvm):
```bash
nvm install --lts
nvm use --lts
```

Проверка:
```bash
node -v
npm -v
```

### 2. Установка JDK 17

Android Gradle Plugin (актуальные версии) требует именно **JDK 17**
(не 8, не 21 — возможны проблемы совместимости).

**macOS**:
```bash
brew install --cask temurin17
```

**Windows/Linux**: скачайте Eclipse Temurin 17 с
[adoptium.net](https://adoptium.net/temurin/releases/?version=17) и
установите.

После установки задайте переменную окружения `JAVA_HOME`:

**macOS/Linux** (добавьте в `~/.zshrc` или `~/.bashrc`):
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)   # macOS
# или, если путь известен явно (Linux):
# export JAVA_HOME=/usr/lib/jvm/temurin-17-jdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"
```

**Windows** (PowerShell, от имени администратора):
```powershell
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot", "Machine")
```

Проверка:
```bash
java -version
```
Должно быть написано что-то вроде `openjdk version "17...`.

### 3. Установка Android SDK

Самый простой способ — установить Android Studio целиком (он уже
включает SDK Manager с удобным интерфейсом):

1. Скачайте Android Studio с
   [developer.android.com/studio](https://developer.android.com/studio).
2. Установите и запустите, пройдите первичную настройку (Standard
   setup) — при этом установится Android SDK, платформа последней
   версии Android и build-tools.
3. Откройте **Settings → Languages & Frameworks → Android SDK** и
   убедитесь, что установлены:
   - **SDK Platform** для Android 14 (API 34) или новее;
   - **Android SDK Build-Tools**;
   - **Android SDK Command-line Tools**;
   - **Android SDK Platform-Tools** (сюда входит `adb`).

Запомните путь к SDK, показанный там же (обычно):
- macOS: `~/Library/Android/sdk`
- Linux: `~/Android/Sdk`
- Windows: `C:\Users\<имя>\AppData\Local\Android\Sdk`

### 4. Переменные окружения ANDROID_HOME

**macOS/Linux** (добавьте в `~/.zshrc` или `~/.bashrc`):
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk    # macOS
# export ANDROID_HOME=$HOME/Android/Sdk          # Linux
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```
После добавления выполните `source ~/.zshrc` (или откройте новый терминал).

**Windows** (PowerShell, от имени администратора):
```powershell
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\<имя>\AppData\Local\Android\Sdk", "Machine")
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Users\<имя>\AppData\Local\Android\Sdk\platform-tools", "Machine")
```

Проверка:
```bash
adb --version
echo $ANDROID_HOME        # macOS/Linux
echo %ANDROID_HOME%       # Windows cmd
```

### 5. Установка зависимостей проекта

В корне проекта:
```bash
npm install
```

### 6. Генерация нативного Android-проекта

```bash
npx expo prebuild -p android
```

Эта команда создаст папку `android/` на основе `app.json` и модулей из
`modules/` (включая `modules/void-ssh`). Папка `android/` не хранится в
git (см. `.gitignore`) — она всегда генерируется заново этой командой,
поэтому не редактируйте её файлы вручную (правки потеряются при
следующем `prebuild`).

Если после этой команды нужно внести кастомные правки в нативный код —
меняйте файлы в `modules/void-ssh/android/`, а не в сгенерированной
`android/`.

### 7. Создание ключа подписи (keystore)

Каждый релизный APK должен быть подписан. Если у вас ещё нет ключа —
создайте его:

```bash
keytool -genkeypair -v \
  -keystore void-terminal-release.keystore \
  -alias void-terminal \
  -keyalg RSA -keysize 2048 -validity 10000
```

Вас спросят пароль хранилища, пароль ключа и данные (имя, организация и
т.д. — можно указывать что угодно, это не проверяется). **Сохраните
пароли и файл `void-terminal-release.keystore` в надёжном месте** — без
него вы не сможете выпускать обновления этого же приложения в будущем
(Android требует, чтобы обновления были подписаны тем же ключом).

Файл `.keystore` **не должен попасть в git** — он уже добавлен в
`.gitignore`.

### 8. Настройка подписи в Gradle

Поместите `void-terminal-release.keystore` в `android/app/`, затем
создайте (или дополните) файл `android/gradle.properties` строками:

```properties
VOID_UPLOAD_STORE_FILE=void-terminal-release.keystore
VOID_UPLOAD_KEY_ALIAS=void-terminal
VOID_UPLOAD_STORE_PASSWORD=ваш_пароль_хранилища
VOID_UPLOAD_KEY_PASSWORD=ваш_пароль_ключа
```

И добавьте блок подписи в `android/app/build.gradle` внутри секции
`android { ... }` (если такого блока ещё нет — секцию `signingConfigs`
нужно добавить перед `buildTypes`, а `signingConfig` — внутрь
`buildTypes.release`):

```groovy
signingConfigs {
    release {
        storeFile file(VOID_UPLOAD_STORE_FILE)
        storePassword VOID_UPLOAD_STORE_PASSWORD
        keyAlias VOID_UPLOAD_KEY_ALIAS
        keyPassword VOID_UPLOAD_KEY_PASSWORD
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        // остальные настройки release оставьте как есть
    }
}
```

> Поскольку `android/` пересоздаётся командой `expo prebuild`, это
> изменение будет затираться при каждом prebuild. Есть два варианта:
> либо вносить эту правку заново после каждого `prebuild` (нормально,
> если вы делаете это редко), либо оформить её как [config
> plugin](https://docs.expo.dev/config-plugins/introduction/) в
> `app.json`, чтобы `prebuild` применял её автоматически — это более
> продвинутый шаг, не обязательный для первой сборки.

### 9. Сборка релизного APK

```bash
cd android
./gradlew assembleRelease
```

На Windows используйте `gradlew.bat assembleRelease` вместо `./gradlew`.

Первая сборка может занять продолжительное время (Gradle скачивает
зависимости, включая sshj и BouncyCastle для нативного SSH-модуля).

Готовый файл появится здесь:
```
android/app/build/outputs/apk/release/app-release.apk
```

### 10. Установка на устройство

Подключите Android-телефон по USB с включённой отладкой по USB
(**Настройки → О телефоне → 7 раз нажать «Номер сборки»**, затем
**Настройки → Для разработчиков → Отладка по USB**), затем:

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

Либо просто скопируйте `.apk`-файл на телефон любым способом
(облако, USB-накопитель, мессенджер) и откройте его — Android
предложит установить (может потребоваться разрешить «Установка из
неизвестных источников» для того приложения, через которое вы открыли
файл).

---

## Способ B — облачная сборка через EAS Build

Этот способ не требует установки Android SDK на свой компьютер —
сборка происходит на серверах Expo. Нужен только Node.js (шаг 1 выше)
и бесплатный аккаунт на [expo.dev](https://expo.dev).

### 1. Установка EAS CLI

```bash
npm install -g eas-cli
```

### 2. Вход в аккаунт

```bash
eas login
```
(если аккаунта ещё нет — зарегистрируйтесь на expo.dev, это бесплатно)

### 3. Настройка проекта для EAS

В корне проекта:
```bash
eas build:configure
```

Это создаст файл `eas.json`, если его ещё нет. Пример рабочей
конфигурации:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

Профиль `preview` со `"buildType": "apk"` собирает именно `.apk`
(удобно для тестирования на своих устройствах); `production` со
`"app-bundle"` собирает `.aab` для публикации в Google Play.

### 4. Запуск сборки

```bash
eas build -p android --profile preview
```

При первом запуске EAS сам предложит сгенерировать ключ подписи —
согласитесь (Expo сохранит его на своих серверах для будущих сборок
этого же профиля). Сборка идёт в облаке; в терминале появится ссылка
на страницу сборки, там же будет прогресс.

### 5. Скачивание и установка

После завершения сборки в терминале (и на странице expo.dev) появится
ссылка на скачивание `.apk`. Скачайте файл на телефон и откройте его
для установки, либо, если телефон подключён по USB:

```bash
adb install путь/к/скачанному-файлу.apk
```

---

## Типичные ошибки и их решения

**`SDK location not found`**
Файл `android/local.properties` не создан или не указывает на SDK.
Создайте `android/local.properties` вручную со строкой:
```
sdk.dir=/полный/путь/к/Android/sdk
```
(на Windows путь пишется с двойными обратными слэшами: `sdk.dir=C\:\\Users\\имя\\AppData\\Local\\Android\\Sdk`)

**`JAVA_HOME is not set` или ошибки версии Java**
Проверьте `java -version` — должна быть версия 17. Если стоит несколько
версий JDK, явно укажите `JAVA_HOME` на JDK 17 (см. шаг 2 выше).

**Ошибка компиляции Kotlin в `expo.modules.voidssh.VoidSshModule`**
Это самый вероятный тип ошибки в этом проекте, потому что нативный
SSH-модуль не был скомпилирован заранее (см. раздел «0. Важно перед
началом»). Прочитайте текст ошибки — Gradle укажет точную строку.
Частые случаи: несовпадение имени метода библиотеки sshj — сверьтесь с
`modules/void-ssh/README.md`, раздел «Known risks».

**`Could not resolve com.hierynomus:sshj` или похожая ошибка сети**
Gradle не может скачать зависимость — проверьте интернет-соединение;
если вы за корпоративным прокси/файрволом, может понадобиться настроить
прокси для Gradle (`android/gradle.properties`:
`systemProp.http.proxyHost=...`).

**Приложение собралось, но не подключается по SSH**
Сначала проверьте на реальном тестовом сервере (например, временная
виртуальная машина или `docker run -p 2222:22
linuxserver/openssh-server`), а не сразу на боевом сервере — это первая
реальная проверка нативного SSH-кода на устройстве, ошибки на этом
этапе ожидаемы и не означают проблему с самим приложением в целом.

**`INSTALL_FAILED_UPDATE_INCOMPATIBLE` при `adb install`**
На телефоне уже установлена версия приложения, подписанная другим
ключом (например, debug-сборкой). Удалите старую версию перед установкой:
```bash
adb uninstall sh.void.terminal
adb install android/app/build/outputs/apk/release/app-release.apk
```

**Gradle зависает или падает с `OutOfMemoryError`**
Добавьте в `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m
```

---

## Что дальше

- Реальный протокол mosh и полноценная интеграция управляющих
  последовательностей tmux — задокументированные ограничения текущей
  версии, см. `README.md`.
