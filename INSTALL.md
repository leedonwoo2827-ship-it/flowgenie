# FlowGenie 설치 가이드

## 사전 준비

- **Chrome 브라우저** (최신 버전 권장)
- **Google 계정** (Google Flow 접속용)

---

## 설치 방법

### Step 1: 파일 다운로드

GitHub에서 ZIP 다운로드:

1. [https://github.com/leedonwoo/flowgenie](https://github.com/leedonwoo/flowgenie) 접속
2. 녹색 **"Code"** 버튼 → **"Download ZIP"** 클릭
3. 다운로드된 ZIP 파일을 원하는 위치에 압축 해제

또는 Git으로 클론:
```
git clone https://github.com/leedonwoo/flowgenie.git
```

### Step 2: Chrome에 확장프로그램 설치

1. Chrome 주소창에 `chrome://extensions` 입력 후 Enter
2. 우측 상단 **"개발자 모드"** 토글을 **ON**으로 변경
3. **"압축해제된 확장 프로그램을 로드합니다"** 버튼 클릭
4. 압축 해제한 **flowgenie 폴더**를 선택
5. FlowGenie가 목록에 나타나면 설치 완료

> 설치 후 FlowGenie 카드에 오류가 표시되면, 새로고침(↻) 아이콘을 한 번 클릭해주세요.

### Step 3: 확인

Chrome 우측 상단 퍼즐 아이콘(확장프로그램) 목록에서 FlowGenie가 보이면 성공입니다.

---

## 사용 방법

### 1. Google Flow 접속

1. [https://labs.google/fx/tools/flow](https://labs.google/fx/tools/flow) 접속
2. Google 계정으로 로그인
3. 프롬프트 입력창 ("무엇을 만들고 싶으신가요?")이 보이는 화면까지 진입

### 2. FlowGenie 사이드 패널 열기

1. Chrome 우측 상단의 **FlowGenie 아이콘** 클릭
2. 오른쪽에 사이드 패널이 열림
3. 상단에 **"Connected"** (녹색)이 표시되는지 확인

> "Disconnected" (빨간색)이 나오면 Google Flow 탭이 열려있는지 확인하세요.

### 3. 프롬프트 로드

**방법 A — JSON 파일 (권장)**:
1. **"Load JSON"** 버튼 클릭
2. 프롬프트가 담긴 `.json` 파일 선택
3. 큐(Queue)에 프롬프트 목록이 표시됨

**방법 B — TXT 파일**:
1. **"Load TXT"** 버튼 클릭
2. 한 줄에 하나의 프롬프트가 담긴 `.txt` 파일 선택

**방법 C — 직접 붙여넣기**:
1. **"Paste"** 버튼 클릭
2. 클립보드에 복사된 프롬프트가 자동으로 로드됨

### 4. 설정 조정 (선택)

⚙(톱니바퀴) 버튼을 누르면 설정 패널이 열립니다:

| 설정 | 설명 | 권장값 |
|------|------|--------|
| Model | 이미지 생성 모델 | Nano Banana Pro |
| Aspect Ratio | 이미지 비율 | 용도에 따라 선택 |
| Mode | DOM (안정) / API (빠름) | DOM |
| Delay (s) | 프롬프트 사이 대기 시간 | 일반 PC: 3~8초, 저사양 PC: 8~15초 |
| Images/Prompt | 프롬프트당 생성 이미지 수 | 4 (기본) |

### 5. 생성 시작

1. **"Start"** 버튼 클릭
2. 상단에 **"FlowGenie가 이 브라우저를 디버깅하고 있습니다"** 파란 배너가 표시됨 (정상)
3. 자동으로 프롬프트 입력 → 생성 → 다운로드 진행
4. 진행률과 ETA가 실시간으로 표시됨

> **중요**: Google Flow 탭이 **화면에 보이는 상태**에서 실행하세요. 탭을 다른 곳으로 전환하면 자동화가 중단될 수 있습니다.

### 6. 결과 확인

- 생성된 이미지: **다운로드 폴더 > FlowGenie/** 에 자동 저장
- CSV 내보내기: 완료 후 **"Export CSV (CapCut)"** 버튼으로 작업 결과를 CSV로 저장

---

## JSON 파일 형식

ScriptForge에서 출력하는 표준 형식:

```json
{
  "chapter": 3,
  "title": "챕터 제목",
  "scenes": [
    {
      "scene": 1,
      "title": "씬 제목",
      "image_filename": "ch03_01_example.png",
      "prompt": "A beautiful sunset over mountains, oil painting style...",
      "model": "nano_banana",
      "narration_seconds": 25,
      "visual_description": "비주얼 설명 (한국어)",
      "reference_image": null
    }
  ]
}
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `prompt` | O | 영어 이미지 프롬프트 |
| `image_filename` | X | 다운로드 파일명 (없으면 자동 생성) |
| `model` | X | `"nano_banana"` 또는 `"imagen_3_5"` |
| `scene` | X | 씬 번호 |
| `title` | X | 씬 제목 (큐 표시용) |

---

## 문제 해결

| 증상 | 해결 |
|------|------|
| "Disconnected" 표시 | Google Flow 탭이 열려있는지 확인. 탭을 새로고침 후 재시도 |
| 텍스트 입력 후 생성 안 됨 | 확장프로그램 새로고침(↻) + Flow 탭 새로고침(F5) 후 재시도 |
| 이미지가 다운로드 안 됨 | Chrome 다운로드 설정에서 "다운로드 전에 각 파일의 저장 위치 확인" 해제 |
| 배치 중간에 멈춤 | Stop → Clear → 다시 Load JSON → Start |
| "디버거 연결 실패" | 다른 DevTools가 열려있으면 닫기. FlowGenie 새로고침 후 재시도 |

---

## 업데이트 방법

1. GitHub에서 최신 버전 다운로드 (ZIP 또는 `git pull`)
2. `chrome://extensions` → FlowGenie 카드의 **새로고침(↻)** 클릭
3. Google Flow 탭 새로고침 (F5)
