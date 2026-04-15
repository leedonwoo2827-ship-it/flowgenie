# FlowGenie

**Batch image generation automation for Google Flow (ImageFX)**

Google Flow에서 이미지를 대량 생성하는 Chrome 확장프로그램입니다.  
프롬프트 목록을 JSON으로 넣으면 자동으로 입력 → 생성 → 다운로드까지 처리합니다.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![License MIT](https://img.shields.io/badge/License-MIT-yellow)

---

## Features

- **Batch Generation** — JSON/TXT 프롬프트 목록을 한 번에 처리
- **Side Panel UI** — 큐 관리, 진행률, ETA 실시간 표시
- **Auto Download** — 생성된 이미지 자동 다운로드 (파일명 지정 가능)
- **CSV Export** — CapCut 등 후속 편집을 위한 CSV 내보내기
- **Human-like Timing** — 정규분포 기반 랜덤 딜레이로 자연스러운 동작
- **Dual Model** — Imagen 4 / Nano Banana Pro 선택 가능

## How It Works

FlowGenie는 Chrome Debugger Protocol (CDP)을 사용하여 Google Flow의 Slate 에디터에 텍스트를 입력하고, 생성 버튼을 클릭합니다. 이미지가 생성되면 MutationObserver로 감지하여 자동 다운로드합니다.

```
JSON 프롬프트 → Side Panel 큐 → CDP로 텍스트 입력 → 생성 버튼 클릭 → 이미지 감지 → 자동 다운로드
```

## Installation

1. 이 저장소를 클론하거나 ZIP 다운로드
   ```bash
   git clone https://github.com/YOUR_USERNAME/flowgenie.git
   ```
2. Chrome에서 `chrome://extensions` 열기
3. **개발자 모드** 활성화 (우측 상단 토글)
4. **압축해제된 확장 프로그램을 로드합니다** 클릭
5. 클론한 폴더 선택

## Usage

### 1. Google Flow 열기
[labs.google/fx/tools/flow](https://labs.google/fx/tools/flow)에 접속하고 Google 계정으로 로그인합니다.

### 2. Side Panel 열기
FlowGenie 아이콘을 클릭하면 오른쪽에 Side Panel이 열립니다.

### 3. 프롬프트 로드

**JSON (권장)**:
```json
{
  "chapter": 3,
  "title": "Chapter Title",
  "scenes": [
    {
      "scene": 1,
      "title": "Scene Title",
      "image_filename": "ch03_01_example.png",
      "prompt": "A beautiful sunset over mountains...",
      "model": "nano_banana",
      "narration_seconds": 25,
      "visual_description": "설명",
      "reference_image": null
    }
  ]
}
```

**TXT**: 한 줄에 하나의 프롬프트

### 4. 설정 (선택)
⚙ 버튼으로 설정 패널 열기:
- **Model**: Imagen 4 / Nano Banana Pro
- **Aspect Ratio**: 1:1, 3:4, 4:3, 9:16, 16:9
- **Delay**: 프롬프트 사이 대기 시간 (초)
- **Images/Prompt**: 프롬프트당 생성 이미지 수 (1-4)

### 5. Start
Start 버튼을 누르면 자동 생성이 시작됩니다. 생성된 이미지는 다운로드 폴더의 `FlowGenie/` 하위에 저장됩니다.

## Architecture

```
┌─ Side Panel UI ──────────────┐      chrome.runtime      ┌─ Service Worker ─────────┐
│  prompt manager              │◄──────────────────────────►│  message router          │
│  batch queue                 │      chrome.storage       │  CDP controller          │
│  config panel                │◄──────────────────────────►│  download manager        │
│  progress dashboard          │                           └──────────┬──────────────┘
│  CSV export                  │                                      │
└──────────────────────────────┘                      chrome.debugger (CDP)
                                                                      ▼
┌─ Google Flow Tab ────────────────────────────────────────────────────────────────┐
│  Input.insertText → Slate editor text input (trusted)                           │
│  Input.dispatchMouseEvent → Generate button click (trusted)                     │
│  MutationObserver → New image detection → Auto download                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## File Structure

```
flowgenie/
├── manifest.json              # Chrome Extension manifest (MV3)
├── background/
│   └── service-worker.js      # Message router, CDP controller, download
├── content/
│   ├── interceptor.js         # MAIN world — file upload hooks
│   └── bridge.js              # ISOLATED world — message relay
├── sidepanel/
│   ├── panel.html / css / js  # Side Panel UI
│   └── lib/
│       ├── state.js           # Reactive store (chrome.storage)
│       └── message-bus.js     # Messaging abstraction
├── automation/
│   ├── dom-mode.js            # DOM automation helpers
│   ├── selectors.js           # DOM selector constants
│   ├── events.js              # Realistic event simulation
│   ├── observers.js           # MutationObserver image detection
│   └── stealth.js             # Human-like timing
└── shared/
    ├── constants.js           # Model IDs, API endpoints, message types
    ├── prompt-parser.js       # JSON/TXT prompt parser
    └── types.js               # JSDoc type definitions
```

## Notes

- 실행 중 **"FlowGenie가 이 브라우저를 디버깅하고 있습니다"** 배너가 표시됩니다. 이는 Chrome Debugger Protocol을 사용하기 때문이며 정상입니다.
- Google Flow 탭이 **화면에 보이는 상태**에서 실행해야 합니다.
- Google Flow는 공식 API를 제공하지 않으므로, UI 변경 시 셀렉터 업데이트가 필요할 수 있습니다.

## License

[MIT](LICENSE)

---

Built with Claude Code.
