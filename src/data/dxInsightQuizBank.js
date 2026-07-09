export const dxInsightParts = [
  {
    id: 'part1',
    title: 'Part 1 Tech Basic',
    chapters: [
      { id: 'ch1', number: 1, title: 'AX' },
      { id: 'ch2', number: 2, title: '차세대 ERP' },
      { id: 'ch3', number: 3, title: 'Security' },
      { id: 'ch4', number: 4, title: '품질관리' },
      { id: 'ch5', number: 5, title: 'INFRA' },
    ],
  },
  {
    id: 'part2',
    title: 'Part 2 New Trend',
    chapters: [
      { id: 'ch6', number: 6, title: '식품/바이오 DX TREND' },
      { id: 'ch7', number: 7, title: '물류 DX TREND' },
      { id: 'ch8', number: 8, title: '유통 DX TREND' },
      { id: 'ch9', number: 9, title: '엔터/미디어 DX TREND' },
    ],
  },
  {
    id: 'part3',
    title: 'Part 3 ONS Solution & Service',
    chapters: [
      { id: 'ch10', number: 10, title: 'Trailvisi:ON' },
      { id: 'ch11', number: 11, title: 'AI VFX Platform' },
      { id: 'ch12', number: 12, title: "O'testlab" },
      { id: 'ch13', number: 13, title: 'Braze & Amplitude' },
    ],
  },
]

const termsByChapter = {
  "ch1": [
    [
      "AX",
      "AI를 의사결정과 비즈니스 로직에 내재화해 지능형 운영 체계로 전환하는 것"
    ],
    [
      "Agentic AI",
      "목표를 이해하고 계획, 도구 선택, 실행, 검증을 수행하는 자율 실행형 AI"
    ],
    [
      "MCP",
      "AI가 외부 도구, 데이터, 시스템에 표준 방식으로 연결되도록 하는 인터페이스 규격"
    ],
    [
      "AI-Native",
      "AI를 중심으로 시스템과 조직을 설계하고 AI가 실행을 수행하는 구조"
    ],
    [
      "AI-DLC",
      "AI가 요구사항 정의부터 설계, 구현, 검증, 배포까지 개발 전 과정을 주도하는 체계"
    ],
    [
      "컨텍스트 엔지니어링",
      "AI에게 업무 맥락, 지침, 도구 정보를 효과적으로 전달하도록 설계하는 기술"
    ],
    [
      "AI-CoE",
      "조직 내 AI 전략, 표준, 거버넌스를 정의하고 전사 확산을 주도하는 전문 조직"
    ]
  ],
  "ch2": [
    [
      "S/4HANA",
      "SAP의 차세대 ERP 플랫폼으로 실시간 처리와 지능형 경영을 지원한다"
    ],
    [
      "Digital Core",
      "전사 데이터를 통합해 경영 의사결정과 프로세스 실행을 연결하는 핵심 시스템"
    ],
    [
      "Clean Core",
      "핵심 ERP를 표준에 가깝게 유지하고 확장은 외부화해 업그레이드 민첩성을 확보하는 전략"
    ],
    [
      "Universal Journal",
      "재무 데이터의 단일 원천을 강화해 일관성과 실시간 분석성을 높이는 S/4HANA 구조"
    ],
    [
      "Fiori",
      "SAP의 사용자 중심 UX로 ERP 업무 접근성과 사용성을 높이는 인터페이스"
    ],
    [
      "인메모리 DB",
      "데이터를 디스크가 아닌 메모리에 두어 트랜잭션과 분석 처리를 고속화하는 데이터베이스 구조"
    ],
    [
      "OLTP",
      "주문·결제 등 짧고 빠른 거래를 처리하는 온라인 트랜잭션 처리 방식"
    ],
    [
      "OLAP",
      "대량 데이터를 다차원으로 집계·분석하는 온라인 분석 처리 방식"
    ],
    [
      "BTP",
      "SAP의 클라우드 플랫폼으로 S/4HANA 확장·통합·AI 연계를 지원하는 개방형 플랫폼"
    ],
    [
      "Joule",
      "자연어로 ERP 데이터 조회·분석·업무를 지원하는 SAP의 생성형 AI 어시스턴트"
    ]
  ],
  "ch3": [
    [
      "Zero Trust",
      "내부와 외부를 구분하지 않고 모든 접근 요청을 계속 검증하는 보안 모델"
    ],
    [
      "Lateral Movement",
      "공격자가 내부망 진입 후 다른 시스템으로 이동하며 권한을 확대하는 공격 단계"
    ],
    [
      "최소 권한",
      "사용자와 시스템에 필요한 범위만 접근 권한을 부여하는 보안 원칙"
    ],
    [
      "마이크로 세그멘테이션",
      "네트워크 접근 영역을 세분화해 침투 후 내부 이동 경로를 제한하는 설계"
    ],
    [
      "AX 사내 보안 가이드",
      "AI 도구 활용 시 데이터 처리, 접근 통제, 보안 기준을 정한 사내 활용 기준"
    ],
    [
      "MFA",
      "두 가지 이상의 인증 방식을 결합해 계정 탈취를 방지하는 다중 인증 방식"
    ],
    [
      "Zero-Day 공격",
      "아직 공개되거나 패치되지 않은 취약점을 악용하는 공격으로 방어가 극히 어렵다"
    ],
    [
      "SASE",
      "네트워크와 보안 기능(SD-WAN, ZTNA, CASB, SWG 등)을 클라우드에서 통합 제공하는 프레임워크"
    ],
    [
      "ZTNA",
      "접속 위치가 아닌 사용자·기기·권한을 검증해 최소 접근만 허용하는 Zero Trust 네트워크 접근 방식"
    ],
    [
      "CASB",
      "기업과 클라우드 서비스 사이에서 데이터 유출 방지·섀도 IT 탐지·접근 정책을 시행하는 보안 중개 도구"
    ],
    [
      "SWG",
      "사용자의 인터넷 트래픽을 검사해 악성 사이트·콘텐츠 접근을 실시간 차단하는 보안 웹 게이트웨이"
    ],
    [
      "SD-WAN",
      "소프트웨어로 WAN 연결을 제어해 클라우드·지사 간 트래픽 경로를 지능적으로 최적화하는 기술"
    ]
  ],
  "ch4": [
    [
      "품질 Gate",
      "단계별 품질 기준을 확인해 리스크가 다음 단계로 넘어가지 않게 하는 체크포인트"
    ],
    [
      "QA",
      "품질 보증 관점에서 프로세스 준수와 예방 활동에 집중하는 역할"
    ],
    [
      "QC",
      "결과물 자체가 기준에 부합하는지 판정하는 품질 통제 역할"
    ],
    [
      "PMO",
      "프로젝트 일정, 범위, 리스크를 데이터 기반으로 통제하고 관리 체계를 안정화하는 역할"
    ],
    [
      "AI DevOps Platform",
      "코드, 테스트, 운영 데이터를 통합 분석해 기술 품질을 지능적으로 관리하는 플랫폼"
    ],
    [
      "SCA",
      "소프트웨어에 포함된 오픈소스 구성 요소의 보안 취약점과 라이선스 위험을 분석하는 도구"
    ],
    [
      "DAST",
      "실행 중인 애플리케이션을 대상으로 외부에서 취약점을 동적으로 테스트하는 방식"
    ],
    [
      "DevSecOps",
      "개발·보안·운영을 하나의 흐름으로 통합해 보안을 전 개발 과정에 내재화하는 방법론"
    ],
    [
      "시프트레프트",
      "보안·품질 검사를 개발 초기 단계로 앞당겨 수정 비용과 리스크를 줄이는 접근"
    ],
    [
      "SLA",
      "서비스 제공자와 사용자 간 서비스 수준·가용성 기준을 공식 약속한 협약"
    ],
    [
      "SonarQube",
      "코드 복잡도·버그·보안 취약점을 정적 분석해 품질 점수를 지속적으로 측정하는 도구"
    ]
  ],
  "ch5": [
    [
      "AI Fabric",
      "대규모 GPU와 노드를 초고속으로 연결하는 AI 워크로드 최적화 네트워크"
    ],
    [
      "베어메탈 서버",
      "가상화 오버헤드 없이 물리 서버 자원을 직접 점유하는 고성능 서버"
    ],
    [
      "Kubernetes",
      "컨테이너 배포, 확장, 복구를 자동화하는 오케스트레이션 플랫폼"
    ],
    [
      "Spine-Leaf",
      "모든 노드 간 고속 연결로 AI Fabric의 동-서 트래픽을 처리하는 네트워크 토폴로지"
    ],
    [
      "GitOps",
      "Git을 단일 원천으로 삼아 인프라·앱 배포 상태를 선언적으로 자동화하는 운영 방식"
    ],
    [
      "RBAC",
      "사용자 역할(Role)에 따라 시스템 자원 접근 권한을 제어하는 역할 기반 접근 제어 모델"
    ]
  ],
  "ch6": [
    [
      "RAG",
      "외부 지식 검색 결과를 생성형 AI 답변에 결합해 정확성과 근거성을 높이는 방식"
    ],
    [
      "목적형 식품 소비",
      "맛이나 가격만이 아니라 건강 목표와 생체 지표에 맞춰 식품을 선택하는 소비"
    ],
    [
      "데이터 기반 ESG",
      "탄소, 공급망, 윤리 지표를 데이터로 수집·검증·보고하는 경영 방식"
    ],
    [
      "Bio-Sync",
      "개인 생체 리듬과 상태 변화에 맞춰 식품 성분과 추천을 조정하는 서비스 방향"
    ],
    [
      "TurboQuant",
      "초고속 연산 기술로 식품·바이오 산업의 데이터 분석과 혁신을 가속하는 기술"
    ],
    [
      "맞춤형 기능성 식품",
      "개인 생체 데이터와 건강 목표에 맞춰 영양·기능성을 설계하는 식품 솔루션"
    ],
    [
      "청킹",
      "RAG에서 긴 문서를 검색에 적합한 작은 의미 단위로 분할하는 전처리 과정"
    ],
    [
      "리랭킹",
      "RAG 초기 검색 후보 중 질문 맥락에 가장 적합한 문서를 재정렬해 답변 품질을 높이는 과정"
    ],
    [
      "그린워싱",
      "실제 근거 없이 친환경적인 것처럼 과장·허위 홍보하는 행위"
    ],
    [
      "CGM",
      "혈당을 실시간으로 연속 측정하는 웨어러블 기기로 목적형 식품 소비와 Bio-Sync의 핵심 데이터 소스"
    ]
  ],
  "ch7": [
    [
      "디지털 트윈",
      "현실 설비와 프로세스를 가상 공간에 구현하고 실시간 데이터로 연결한 모델"
    ],
    [
      "피지컬 AI",
      "AI가 실제 물리 환경을 인지하고 행동하도록 하는 기술 영역"
    ],
    [
      "미들마일",
      "물류 허브와 허브 사이의 중간 운송 구간"
    ]
  ],
  "ch8": [
    [
      "유니파이드 커머스",
      "모든 채널의 상거래 로직과 데이터를 하나의 운영 체계로 통합하는 모델"
    ],
    [
      "Single Source of Truth",
      "조직이 동일하게 신뢰하는 단일 기준 데이터 원천"
    ],
    [
      "에이전틱 커머스",
      "AI 에이전트가 사용자의 의도를 파악해 탐색과 구매를 지원하거나 수행하는 상거래"
    ],
    [
      "옴니채널",
      "온·오프라인 등 모든 접점에서 일관되고 끊김 없는 고객 경험을 제공하는 전략"
    ]
  ],
  "ch9": [
    [
      "VLM",
      "텍스트와 이미지, 영상 정보를 함께 이해하는 비전-언어 모델"
    ],
    [
      "초개인화 큐레이션",
      "사용자의 맥락과 취향에 맞춰 콘텐츠 추천을 정교하게 조정하는 방식"
    ],
    [
      "콘텐츠 신뢰 인프라",
      "합성 콘텐츠, 출처, 저작권, 진위 여부를 검증하기 위한 기술 체계"
    ],
    [
      "공간 컴퓨팅",
      "디지털 콘텐츠와 물리 공간·사용자 상호작용을 결합해 경험을 확장하는 컴퓨팅"
    ],
    [
      "감성 컴퓨팅",
      "사용자 감정과 반응 맥락을 인식·활용해 콘텐츠 경험과 추천을 조정하는 기술"
    ],
    [
      "VR",
      "현실과 완전히 분리된 가상환경에 몰입하게 하는 기술"
    ],
    [
      "AR",
      "현실 위에 디지털 정보를 오버레이해 보여주는 기술"
    ],
    [
      "MR",
      "현실과 디지털 객체가 실시간으로 상호작용하는 혼합 현실 기술"
    ],
    [
      "비가시적 워터마킹",
      "사람 눈에 보이지 않는 식별 정보를 콘텐츠에 삽입해 출처·저작권을 검증하는 기술"
    ]
  ],
  "ch10": [
    [
      "Trailvisi:ON",
      "AWS 환경의 이상행위와 위협 탐지를 지원하는 보안 가시성 솔루션"
    ],
    [
      "Dwell Time",
      "공격자가 침투 후 탐지되기 전까지 내부에 머무는 시간"
    ],
    [
      "Cryptomining",
      "탈취한 클라우드 자원으로 암호화폐를 채굴해 비용 피해를 유발하는 공격"
    ],
    [
      "API 가시성",
      "클라우드에서 권한 변경·자원 생성 등 API 활동을 추적해 이상행위를 파악하는 능력"
    ],
    [
      "IAM",
      "클라우드에서 계정·역할·권한을 제어하는 신원 및 접근 관리 체계로 실질적 보안 경계가 됨"
    ],
    [
      "CSPM",
      "클라우드 환경의 보안 설정 취약점을 지속 모니터링하고 위험을 탐지하는 도구"
    ],
    [
      "SIEM",
      "다양한 소스의 보안 이벤트 로그를 수집·분석해 위협을 탐지하는 보안 정보 및 이벤트 관리 플랫폼"
    ]
  ],
  "ch11": [
    [
      "VANTA VFX",
      "AI 기반 VFX 통합 제작 플랫폼"
    ],
    [
      "VFX",
      "영상 콘텐츠 제작에서 현실 촬영으로 구현하기 어려운 장면을 만드는 시각 특수효과"
    ],
    [
      "제작 데이터 자산화",
      "프로젝트 종료 후 사라지던 제작 정보를 축적해 재활용 가능한 자산으로 만드는 것"
    ],
    [
      "GPU 리소스 관리",
      "VFX 렌더링 등 고성능 연산 자원의 할당과 활용을 데이터 기반으로 최적화하는 운영"
    ]
  ],
  "ch12": [
    [
      "O’testlab",
      "AI 기반 통합 테스트 자동화 플랫폼"
    ],
    [
      "Real Device Test Farm",
      "실제 모바일/PC 기기로 구성된 테스트 장비 풀"
    ],
    [
      "No-Code 테스트",
      "개발자가 아니어도 화면 요소 인식과 드래그 앤 드롭으로 테스트를 구성하는 방식"
    ],
    [
      "UI 요소 인식",
      "AI가 화면 구성 요소를 자동으로 찾아 테스트 시나리오 작성·유지보수를 돕는 기능"
    ]
  ],
  "ch13": [
    [
      "Braze",
      "고객 메시징, 캠페인 자동화, 개인화 마케팅 실행 플랫폼"
    ],
    [
      "Amplitude",
      "프로덕트 내 고객 행동 분석과 실험을 지원하는 분석 플랫폼"
    ],
    [
      "그로스 마케팅",
      "고객 행동 데이터를 기반으로 제품 경험과 전환을 지속 개선하는 성장 방법론"
    ],
    [
      "서드파티 쿠키",
      "제3자가 브라우저에 저장해 사용자 행동을 추적하는 데이터로, 규제로 활용이 제한되고 있다"
    ],
    [
      "옴니채널",
      "온·오프라인 등 모든 접점에서 일관되고 끊김 없는 고객 경험을 제공하는 전략"
    ]
  ]
}

export const dxInsightTerms = Object.entries(termsByChapter).flatMap(([chapterId, terms]) =>
  terms.map(([term, definition], index) => ({
    id: `${chapterId}-term-${index + 1}`,
    chapterId,
    term,
    definition,
  })),
)

export const dxInsightTermQuestions = [
  {
    "chapterId": "ch1",
    "type": "term",
    "prompt": "\"AX\"의 정의로 가장 적절한 것은?",
    "options": [
      "문서를 전자 파일로 변환하는 활동",
      "AI가 판단과 실행에 참여하는 지능형 운영 체계로 전환하는 것",
      "모든 서버를 클라우드로 이전하는 것",
      "반복 업무를 정해진 규칙으로만 자동화하는 것"
    ],
    "answerIndex": 1,
    "explanation": "AX는 단순 디지털화가 아니라 AI 중심의 판단·실행 구조로의 전환이다.",
    "id": "ch1-term-quiz-1"
  },
  {
    "chapterId": "ch1",
    "type": "term",
    "prompt": "\"AI-Native\"의 정의로 가장 적절한 것은?",
    "options": [
      "기존 시스템에 AI 기능만 덧붙이는 방식",
      "AI를 중심으로 시스템과 조직을 설계하고 AI가 실행을 수행하는 구조",
      "모든 업무를 사람이 직접 수행하는 구조",
      "문서 검색만 자동화하는 방식"
    ],
    "answerIndex": 1,
    "explanation": "AI-Native는 AI를 부가 기능이 아니라 일하는 방식과 시스템 설계의 기본 전제로 삼는 관점이다.",
    "id": "ch1-term-quiz-2"
  },
  {
    "chapterId": "ch1",
    "type": "term",
    "prompt": "\"AI-DLC\"가 의미하는 것은?",
    "options": [
      "AI가 개발 생명주기 전 과정을 주도적으로 수행하는 개발 체계",
      "AI 모델 학습용 GPU만 관리하는 체계",
      "문서 보관 전용 개발 방법론",
      "ERP 전환 전용 방법론"
    ],
    "answerIndex": 0,
    "explanation": "AI-DLC는 요구사항 정의부터 설계, 구현, 검증, 배포까지 AI가 주도하는 개발 체계다.",
    "id": "ch1-term-quiz-3"
  },
  {
    "chapterId": "ch1",
    "type": "term",
    "prompt": "\"컨텍스트 엔지니어링\"의 핵심은?",
    "options": [
      "AI에게 업무 맥락·지침·도구 정보를 잘 전달하도록 설계하는 것",
      "GPU 냉각 시스템을 최적화하는 것",
      "모든 데이터를 공개 인터넷에 올리는 것",
      "프롬프트 길이를 무조건 줄이는 것"
    ],
    "answerIndex": 0,
    "explanation": "같은 AI라도 제공되는 맥락과 지침에 따라 결과가 달라지므로 컨텍스트 설계가 핵심 역량이다.",
    "id": "ch1-term-quiz-4"
  },
  {
    "chapterId": "ch1",
    "type": "term",
    "prompt": "\"AI-CoE\"의 역할로 가장 적절한 것은?",
    "options": [
      "조직 내 AI 전략, 표준, 거버넌스를 정의하고 전사 확산을 주도",
      "모든 AI 모델을 외부에만 위탁",
      "보안 로그만 수집하는 조직",
      "ERP 결산만 담당하는 조직"
    ],
    "answerIndex": 0,
    "explanation": "AI-CoE는 AI 전략과 표준, 거버넌스를 중앙에서 정의하고 조직 전반으로 확산하는 역할을 한다.",
    "id": "ch1-term-quiz-5"
  },
  {
    "chapterId": "ch1",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「AI가 외부 도구, 데이터, 시스템에 표준 방식으로 연결되도록 하는 인터페이스 규격」",
    "options": [
      "MCP",
      "RPA",
      "REST API",
      "AI-CoE"
    ],
    "answerIndex": 0,
    "explanation": "MCP(Model Context Protocol)는 AI와 외부 도구·시스템 연결을 표준화하는 인터페이스다. RPA는 규칙 기반 자동화, REST API는 일반 API 방식이다.",
    "id": "ch1-term-quiz-6"
  },
  {
    "chapterId": "ch1",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「목표를 이해하고 계획, 도구 선택, 실행, 검증까지 수행하는 자율 실행형 AI」",
    "options": [
      "Agentic AI",
      "RPA",
      "생성형 AI",
      "MCP"
    ],
    "answerIndex": 0,
    "explanation": "Agentic AI는 대화형 답변을 넘어 목표 달성을 위한 실행까지 포함한다. RPA는 정해진 절차 반복에 가깝다.",
    "id": "ch1-term-quiz-7"
  },
  {
    "chapterId": "ch1",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「AI에게 업무 맥락, 지침, 도구 정보를 효과적으로 전달하도록 설계하는 기술」",
    "options": [
      "컨텍스트 엔지니어링",
      "AI-DLC",
      "프롬프트 캐싱",
      "GPU 오케스트레이션"
    ],
    "answerIndex": 0,
    "explanation": "컨텍스트 엔지니어링은 AI 결과 품질을 좌우하는 맥락 설계 기술이다. AI-DLC는 개발 생명주기 전반을 AI가 주도하는 체계다.",
    "id": "ch1-term-quiz-8"
  },
  {
    "chapterId": "ch1",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「AI를 의사결정과 비즈니스 로직에 내재화해 지능형 운영 체계로 전환하는 것」",
    "options": [
      "AX",
      "DX",
      "RPA",
      "ERP"
    ],
    "answerIndex": 0,
    "explanation": "AX는 AI 중심의 판단·실행 구조로의 전환이다. DX는 디지털 전환, RPA는 규칙 기반 자동화다.",
    "id": "ch1-term-quiz-9"
  },
  {
    "chapterId": "ch2",
    "type": "term",
    "prompt": "\"S/4HANA\"가 차세대 ERP 플랫폼으로 강조되는 이유는?",
    "options": [
      "실시간 데이터 처리와 통합 디지털 코어를 제공한다",
      "기존 ERP 화면을 그대로 유지한다",
      "부서별 데이터를 더 강하게 분리한다",
      "문서 출력 속도만 높인다"
    ],
    "answerIndex": 0,
    "explanation": "S/4HANA는 인메모리 기반 실시간 처리와 통합 데이터 구조로 지능형 경영을 지원한다.",
    "id": "ch2-term-quiz-1"
  },
  {
    "chapterId": "ch2",
    "type": "term",
    "prompt": "\"인메모리 DB\"가 S/4HANA에 주는 효과는?",
    "options": [
      "디스크 I/O 병목을 줄여 트랜잭션과 분석을 빠르게 처리",
      "부서별 장부를 더 많이 분리",
      "ERP와 분석 시스템을 완전히 단절",
      "사용자 UI 테마만 변경"
    ],
    "answerIndex": 0,
    "explanation": "인메모리 DB는 데이터를 메모리에 두어 실시간 트랜잭션과 분석 성능을 높인다.",
    "id": "ch2-term-quiz-2"
  },
  {
    "chapterId": "ch2",
    "type": "term",
    "prompt": "\"Universal Journal\"의 핵심 가치는?",
    "options": [
      "재무 데이터의 단일 원천을 강화해 일관성과 실시간 분석성을 높인다",
      "부서별 장부를 더 많이 분리한다",
      "ERP와 분석 시스템을 완전히 단절한다",
      "사용자 UI 테마만 변경한다"
    ],
    "answerIndex": 0,
    "explanation": "Universal Journal은 중복 장부를 줄이고 단일 원천 기반 분석을 가능하게 하는 S/4HANA 데이터 구조다.",
    "id": "ch2-term-quiz-3"
  },
  {
    "chapterId": "ch2",
    "type": "term",
    "prompt": "\"Fiori\"가 차세대 ERP에서 갖는 의미는?",
    "options": [
      "직관적 사용자 경험으로 ERP 업무 접근성을 높인다",
      "인메모리 DB를 대체하는 장비",
      "클라우드 위협 탐지 도구",
      "VFX 렌더링 엔진"
    ],
    "answerIndex": 0,
    "explanation": "SAP Fiori는 사용자 중심 UX를 제공해 ERP 사용성과 업무 효율을 높이는 요소다.",
    "id": "ch2-term-quiz-4"
  },
  {
    "chapterId": "ch2",
    "type": "term",
    "prompt": "\"Digital Core\"의 역할은?",
    "options": [
      "전사 데이터를 통합해 경영 의사결정과 업무 실행을 연결하는 핵심 시스템",
      "마케팅 메시지만 발송하는 도구",
      "테스트 자동화 전용 플랫폼",
      "물류 로봇 제어 시스템"
    ],
    "answerIndex": 0,
    "explanation": "Digital Core는 기업 데이터를 하나의 중심으로 연결해 지능형 경영과 프로세스 실행을 지원한다.",
    "id": "ch2-term-quiz-5"
  },
  {
    "chapterId": "ch2",
    "type": "term",
    "prompt": "\"Clean Core\" 전략의 목적은?",
    "options": [
      "핵심 ERP를 표준에 가깝게 유지하고 확장은 분리해 업그레이드 민첩성을 확보",
      "모든 커스터마이징을 코어에 직접 반영",
      "표준 프로세스보다 예외 처리를 우선",
      "데이터 입력을 수기로 되돌림"
    ],
    "answerIndex": 0,
    "explanation": "Clean Core는 핵심을 표준 상태로 유지하고 특화 기능은 외부화해 업그레이드와 AI 연계를 쉽게 한다.",
    "id": "ch2-term-quiz-6"
  },
  {
    "chapterId": "ch2",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「재무 데이터의 단일 원천을 강화해 일관성과 실시간 분석성을 높이는 S/4HANA 구조」",
    "options": [
      "Universal Journal",
      "Clean Core",
      "Digital Core",
      "SAP ECC"
    ],
    "answerIndex": 0,
    "explanation": "Universal Journal은 재무 데이터 중복을 줄이는 단일 원천 구조다. Clean Core는 표준 유지 전략, Digital Core는 전사 데이터 중심 개념이다.",
    "id": "ch2-term-quiz-7"
  },
  {
    "chapterId": "ch2",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「핵심 ERP를 표준에 가깝게 유지하고 확장은 외부화해 업그레이드 민첩성을 확보하는 전략」",
    "options": [
      "Clean Core",
      "Universal Journal",
      "Best Practice",
      "Legacy Migration"
    ],
    "answerIndex": 0,
    "explanation": "Clean Core는 코어 커스터마이징을 줄이고 표준·확장을 분리하는 S/4HANA 전략이다.",
    "id": "ch2-term-quiz-8"
  },
  {
    "chapterId": "ch2",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「SAP의 사용자 중심 UX로 ERP 업무 접근성과 사용성을 높이는 인터페이스」",
    "options": [
      "Fiori",
      "SAP GUI",
      "Digital Core",
      "S/4HANA"
    ],
    "answerIndex": 0,
    "explanation": "Fiori는 SAP의 현대적 사용자 경험(UX) 인터페이스다. S/4HANA는 플랫폼 전체, Digital Core는 데이터 중심 개념이다.",
    "id": "ch2-term-quiz-9"
  },
  {
    "chapterId": "ch2",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「SAP의 차세대 ERP 플랫폼으로 실시간 처리와 지능형 경영을 지원한다」",
    "options": [
      "S/4HANA",
      "SAP ECC",
      "Digital Core",
      "Fiori"
    ],
    "answerIndex": 0,
    "explanation": "S/4HANA는 SAP 차세대 ERP 플랫폼이다. Digital Core는 전사 데이터 중심 개념, Fiori는 UX다.",
    "id": "ch2-term-quiz-10"
  },
  {
    "chapterId": "ch2",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「데이터를 디스크가 아닌 메모리에 두어 트랜잭션과 분석 처리를 고속화하는 데이터베이스 구조」",
    "options": [
      "인메모리 DB",
      "Universal Journal",
      "Clean Core",
      "Digital Core"
    ],
    "answerIndex": 0,
    "explanation": "인메모리 DB는 S/4HANA 실시간 처리의 기반이다. Universal Journal은 재무 데이터 구조다.",
    "id": "ch2-term-quiz-11"
  },
  {
    "chapterId": "ch2",
    "type": "term",
    "prompt": "\"OLTP\"와 \"OLAP\"의 차이로 옳은 것은?",
    "options": [
      "OLTP는 거래 처리 중심, OLAP는 분석·조회 중심",
      "OLTP는 분석 전용, OLAP는 거래 처리 전용",
      "S/4HANA에서 두 방식은 완전히 분리 운영된다",
      "OLAP는 실시간 결제 처리에 최적화되어 있다"
    ],
    "answerIndex": 0,
    "explanation": "OLTP는 주문·결제 등 빠른 거래 처리에, OLAP는 매출 분석 등 복잡한 다차원 조회에 강점이 있다. S/4HANA 인메모리 DB는 이 둘을 하나의 구조에서 처리한다.",
    "id": "ch2-term-quiz-12"
  },
  {
    "chapterId": "ch2",
    "type": "term",
    "prompt": "\"BTP\"의 역할은?",
    "options": [
      "SAP 확장·통합·데이터·AI를 위한 클라우드 플랫폼",
      "ERP 핵심 트랜잭션만 처리하는 온프레미스 서버",
      "SAP UI 테마를 자동으로 변경하는 도구",
      "재고 관리(MM) 전용 SAP 모듈"
    ],
    "answerIndex": 0,
    "explanation": "BTP(Business Technology Platform)는 Clean Core를 유지하면서 S/4HANA를 확장·통합하고 AI를 연계하기 위한 SAP 클라우드 플랫폼이다.",
    "id": "ch2-term-quiz-13"
  },
  {
    "chapterId": "ch2",
    "type": "term",
    "prompt": "\"Joule\"이란?",
    "options": [
      "자연어로 ERP 업무를 지원하는 SAP의 AI 어시스턴트",
      "S/4HANA 재무 결산 전용 배치 프로그램",
      "SAP 네트워크 방화벽 설정 도구",
      "BTP 클라우드 인프라 과금 단위"
    ],
    "answerIndex": 0,
    "explanation": "Joule은 SAP의 생성형 AI 어시스턴트로 자연어 질문으로 ERP 데이터 조회·분석·업무 지원을 제공한다.",
    "id": "ch2-term-quiz-14"
  },
  {
    "chapterId": "ch3",
    "type": "term",
    "prompt": "\"최소 권한\" 원칙의 목적은?",
    "options": [
      "필요한 범위만 접근 권한을 부여해 피해를 제한",
      "모든 사용자에게 관리자 권한을 부여",
      "VPN 접속 후 추가 검증을 생략",
      "내부망 사용자는 무조건 신뢰"
    ],
    "answerIndex": 0,
    "explanation": "최소 권한은 침해 발생 시 피해 범위를 줄이는 Zero Trust의 핵심 원칙이다.",
    "id": "ch3-term-quiz-1"
  },
  {
    "chapterId": "ch3",
    "type": "term",
    "prompt": "\"마이크로 세그멘테이션\"의 목적은?",
    "options": [
      "네트워크 접근 영역을 세분화해 침투 후 내부 이동을 제한",
      "모든 서버를 하나의 큰 네트워크로 통합",
      "VPN 접속 후 추가 검증을 생략",
      "관리자 계정을 여러 명이 공유"
    ],
    "answerIndex": 0,
    "explanation": "마이크로 세그멘테이션은 공격자가 내부에서 자유롭게 이동하지 못하도록 접근 범위를 나눈다.",
    "id": "ch3-term-quiz-2"
  },
  {
    "chapterId": "ch3",
    "type": "term",
    "prompt": "\"Zero Trust\"의 핵심 원칙은?",
    "options": [
      "모든 접근을 잠재적 위협으로 보고 지속적으로 검증",
      "내부망 사용자는 기본적으로 신뢰",
      "VPN 접속 후 내부 접근은 자유",
      "방화벽 장비만 강화하면 충분"
    ],
    "answerIndex": 0,
    "explanation": "Zero Trust는 위치가 아니라 신원, 기기, 권한, 행위 맥락을 계속 검증하는 모델이다.",
    "id": "ch3-term-quiz-3"
  },
  {
    "chapterId": "ch3",
    "type": "term",
    "prompt": "교재의 \"AX 사내 보안 가이드\"가 강조하는 방향은?",
    "options": [
      "AI 도구 활용 시 보안 기준과 데이터 처리 원칙을 준수",
      "모든 AI 도구 사용을 무조건 금지",
      "보안 검토 없이 외부 AI에 업무 데이터를 입력",
      "내부망만 사용하면 AI 보안이 자동 해결"
    ],
    "answerIndex": 0,
    "explanation": "AX 시대에는 AI 도구 활용과 함께 사내 보안 가이드에 따른 데이터·접근 통제가 필요하다.",
    "id": "ch3-term-quiz-4"
  },
  {
    "chapterId": "ch3",
    "type": "term",
    "prompt": "\"Lateral Movement\"란?",
    "options": [
      "공격자가 내부 진입 후 다른 시스템으로 이동하며 권한을 확대하는 단계",
      "고객이 여러 채널을 오가는 구매 여정",
      "GPU 간 데이터 동기화",
      "ERP 모듈 간 데이터 연계"
    ],
    "answerIndex": 0,
    "explanation": "Lateral Movement는 초기 침투 이후 내부 자원으로 확산하는 공격 단계를 말한다.",
    "id": "ch3-term-quiz-5"
  },
  {
    "chapterId": "ch3",
    "type": "term",
    "prompt": "\"MFA\"의 목적은?",
    "options": [
      "두 가지 이상의 인증 방식을 결합해 계정 탈취를 방지",
      "비밀번호 없이 접속하는 방식",
      "VPN 접속 시 추가 검증을 생략",
      "내부망 사용자에게만 적용하는 인증"
    ],
    "answerIndex": 0,
    "explanation": "MFA(다중 인증)는 비밀번호 외 OTP·생체 인식 등을 추가해 계정 도용 위험을 크게 줄인다.",
    "id": "ch3-term-quiz-6"
  },
  {
    "chapterId": "ch3",
    "type": "term",
    "prompt": "\"Zero-Day 공격\"이란?",
    "options": [
      "아직 공개되거나 패치되지 않은 취약점을 악용하는 공격",
      "이미 패치된 취약점을 반복 악용하는 공격",
      "클라우드 자원을 탈취해 채굴하는 공격",
      "내부 계정 없이 외부에서만 이루어지는 공격"
    ],
    "answerIndex": 0,
    "explanation": "Zero-Day 공격은 방어 패치가 존재하지 않는 취약점을 이용하므로 탐지와 대응이 매우 어렵다.",
    "id": "ch3-term-quiz-7"
  },
  {
    "chapterId": "ch3",
    "type": "term",
    "prompt": "\"SASE\"란?",
    "options": [
      "네트워크와 보안 기능을 클라우드에서 통합 제공하는 프레임워크",
      "물리 방화벽 장비만 관리하는 하드웨어 솔루션",
      "ERP 재무 결산을 자동화하는 모듈",
      "AI 모델 학습용 GPU 클러스터 구조"
    ],
    "answerIndex": 0,
    "explanation": "SASE(Secure Access Service Edge)는 SD-WAN, ZTNA, CASB, SWG, FwaaS 등 네트워크·보안 기능을 클라우드 기반으로 통합한 프레임워크다.",
    "id": "ch3-term-quiz-8"
  },
  {
    "chapterId": "ch3",
    "type": "term",
    "prompt": "\"ZTNA\"가 VPN을 대체하는 이유는?",
    "options": [
      "위치가 아닌 신원·기기·권한을 검증해 최소 권한으로 접근하기 때문",
      "VPN보다 물리적 연결이 빠르기 때문",
      "모든 사용자에게 동일한 넓은 접근 권한을 부여하기 때문",
      "클라우드가 아닌 온프레미스 전용이기 때문"
    ],
    "answerIndex": 0,
    "explanation": "ZTNA(Zero Trust Network Access)는 내부망 전체를 신뢰하는 VPN과 달리 사용자·기기·상황을 검증해 필요한 자원만 접근하게 한다.",
    "id": "ch3-term-quiz-9"
  },
  {
    "chapterId": "ch3",
    "type": "term",
    "prompt": "\"CASB\"의 역할은?",
    "options": [
      "클라우드 서비스 사용을 가시화하고 데이터 접근을 통제하는 보안 중개 도구",
      "온프레미스 서버의 물리 보안을 담당하는 장비",
      "ERP 모듈 간 데이터 동기화를 자동화하는 도구",
      "GPU 워크로드를 분산 배치하는 오케스트레이터"
    ],
    "answerIndex": 0,
    "explanation": "CASB(Cloud Access Security Broker)는 기업과 클라우드 서비스 사이에서 섀도 IT 탐지, 데이터 유출 방지, 접근 정책을 시행한다.",
    "id": "ch3-term-quiz-10"
  },
  {
    "chapterId": "ch3",
    "type": "term",
    "prompt": "\"SWG\"의 역할은?",
    "options": [
      "사용자의 인터넷 트래픽을 검사해 악성 사이트·콘텐츠 접근을 차단",
      "클라우드 자원의 비용을 분석하는 FinOps 도구",
      "재무 결산 데이터를 외부로 전송하는 게이트웨이",
      "IoT 센서 데이터를 수집하는 엣지 장비"
    ],
    "answerIndex": 0,
    "explanation": "SWG(Secure Web Gateway)는 악성 URL, 멀웨어, 부적절한 콘텐츠를 실시간 필터링해 웹 기반 위협을 차단한다.",
    "id": "ch3-term-quiz-11"
  },
  {
    "chapterId": "ch3",
    "type": "term",
    "prompt": "\"SD-WAN\"이 SASE 구조에서 맡는 역할은?",
    "options": [
      "소프트웨어로 WAN 연결을 제어해 클라우드·지사 간 트래픽을 최적화",
      "물리 방화벽을 대체하는 하드웨어 장비",
      "ERP 트랜잭션 데이터를 압축 보관하는 스토리지",
      "GPU 노드 간 동-서 트래픽을 관리하는 AI Fabric"
    ],
    "answerIndex": 0,
    "explanation": "SD-WAN은 소프트웨어 정의 방식으로 WAN 경로를 지능적으로 선택해 클라우드·지사 연결 효율과 안정성을 높인다.",
    "id": "ch3-term-quiz-12"
  },
  {
    "chapterId": "ch3",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「공격자가 내부망 진입 후 다른 시스템으로 이동하며 권한을 확대하는 공격 단계」",
    "options": [
      "Lateral Movement",
      "Dwell Time",
      "Cryptomining",
      "Zero Trust"
    ],
    "answerIndex": 0,
    "explanation": "Lateral Movement(횡적 이동)는 침투 후 내부 확산 단계다. Dwell Time은 탐지 전 체류 시간, Zero Trust는 보안 모델이다.",
    "id": "ch3-term-quiz-13"
  },
  {
    "chapterId": "ch3",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「네트워크 접근 영역을 세분화해 침투 후 내부 이동 경로를 제한하는 설계」",
    "options": [
      "마이크로 세그멘테이션",
      "VPN",
      "방화벽 ACL",
      "최소 권한"
    ],
    "answerIndex": 0,
    "explanation": "마이크로 세그멘테이션은 네트워크를 잘게 나눠 이동을 제한한다. 최소 권한은 권한 부여 원칙으로 함께 쓰이지만 개념이 다르다.",
    "id": "ch3-term-quiz-14"
  },
  {
    "chapterId": "ch3",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「AI 도구 활용 시 데이터 처리, 접근 통제, 보안 기준을 정한 사내 활용 기준」",
    "options": [
      "AX 사내 보안 가이드",
      "Zero Trust",
      "ISO 27001",
      "Clean Core"
    ],
    "answerIndex": 0,
    "explanation": "AX 사내 보안 가이드는 AI 도구 사용 시 사내 데이터·보안 기준이다. Zero Trust는 접근 검증 모델이다.",
    "id": "ch3-term-quiz-15"
  },
  {
    "chapterId": "ch3",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「사용자와 시스템에 필요한 범위만 접근 권한을 부여하는 보안 원칙」",
    "options": [
      "최소 권한",
      "Zero Trust",
      "마이크로 세그멘테이션",
      "Lateral Movement"
    ],
    "answerIndex": 0,
    "explanation": "최소 권한은 Zero Trust와 함께 쓰이는 권한 부여 원칙이다. Lateral Movement는 공격 단계다.",
    "id": "ch3-term-quiz-16"
  },
  {
    "chapterId": "ch4",
    "type": "term",
    "prompt": "\"품질 Gate\"의 역할은?",
    "options": [
      "단계별 품질 기준을 확인해 리스크가 다음 단계로 넘어가지 않게 함",
      "프로젝트 종료 후 결함을 한 번에 찾음",
      "테스트를 최대한 줄여 배포만 빠르게 함",
      "품질 판단을 개인 경험에만 맡김"
    ],
    "answerIndex": 0,
    "explanation": "품질 Gate는 품질 미달 상태가 다음 단계로 전이되지 않도록 하는 체크포인트다.",
    "id": "ch4-term-quiz-1"
  },
  {
    "chapterId": "ch4",
    "type": "term",
    "prompt": "\"PMO\"의 역할에 가장 가까운 것은?",
    "options": [
      "일정·범위·리스크를 데이터 기반으로 통제하고 관리 체계를 안정화",
      "결과물 합격 여부만 최종 판정",
      "모든 코드를 직접 작성",
      "운영 장애와 품질을 완전히 분리"
    ],
    "answerIndex": 0,
    "explanation": "PMO는 프로젝트 관리 체계를 안정화하고 일정, 범위, 리스크를 모니터링하는 역할이다.",
    "id": "ch4-term-quiz-2"
  },
  {
    "chapterId": "ch4",
    "type": "term",
    "prompt": "\"AI DevOps Platform\" 기반 품질 관리가 지향하는 것은?",
    "options": [
      "코드·테스트·운영 데이터를 함께 분석해 품질을 지능적으로 판단",
      "테스트 기록을 수동으로 삭제",
      "운영 장애를 개발과 분리",
      "배포 속도만 보고 품질은 보지 않음"
    ],
    "answerIndex": 0,
    "explanation": "AI DevOps는 코드 품질, 테스트 충분성, 운영 데이터를 통합 분석해 품질 개선을 지원한다.",
    "id": "ch4-term-quiz-3"
  },
  {
    "chapterId": "ch4",
    "type": "term",
    "prompt": "QA와 QC의 차이로 올바른 것은?",
    "options": [
      "QA는 과정·예방 중심, QC는 결과물 기준 판정 중심",
      "QA는 결과 판정, QC는 일정 관리",
      "둘은 완전히 같은 역할",
      "QC는 품질과 무관한 운영 지원"
    ],
    "answerIndex": 0,
    "explanation": "QA는 프로세스와 예방 활동에, QC는 산출물 자체의 합격 여부에 초점을 둔다.",
    "id": "ch4-term-quiz-4"
  },
  {
    "chapterId": "ch4",
    "type": "term",
    "prompt": "\"SCA\"의 목적으로 가장 적절한 것은?",
    "options": [
      "오픈소스·외부 라이브러리의 보안 취약점과 라이선스 위험을 분석",
      "실행 중인 앱을 동적으로 테스트해 취약점 탐지",
      "운영 서버 장애를 실시간 탐지하는 모니터링",
      "코드 커버리지를 측정하는 단위 테스트 도구"
    ],
    "answerIndex": 0,
    "explanation": "SCA(Software Composition Analysis)는 소프트웨어에 포함된 오픈소스 구성 요소의 보안 취약점과 라이선스 위험을 분석한다.",
    "id": "ch4-term-quiz-5"
  },
  {
    "chapterId": "ch4",
    "type": "term",
    "prompt": "\"DAST\"의 정의로 가장 적절한 것은?",
    "options": [
      "실행 중인 애플리케이션을 대상으로 외부에서 취약점을 동적으로 테스트",
      "소스코드를 실행하지 않고 정적으로 분석",
      "오픈소스 라이브러리 취약점을 분석",
      "CI/CD 파이프라인 배포를 자동화하는 방식"
    ],
    "answerIndex": 0,
    "explanation": "DAST(Dynamic Application Security Testing)는 앱을 실행한 상태에서 HTTP 요청 등 외부 공격 방식으로 취약점을 탐지한다.",
    "id": "ch4-term-quiz-6"
  },
  {
    "chapterId": "ch4",
    "type": "term",
    "prompt": "\"DevSecOps\"의 핵심은?",
    "options": [
      "개발·보안·운영을 하나의 흐름으로 통합해 보안을 전 과정에 내재화",
      "보안 검토를 배포 이후에만 수행",
      "개발과 보안 조직을 완전히 분리해 독립 운영",
      "품질 Gate를 줄여 배포 속도만 극대화"
    ],
    "answerIndex": 0,
    "explanation": "DevSecOps는 개발 초기부터 보안을 CI/CD에 통합해 취약점을 조기에 발견하고 대응하는 방법론이다.",
    "id": "ch4-term-quiz-7"
  },
  {
    "chapterId": "ch4",
    "type": "term",
    "prompt": "\"시프트레프트(Shift Left)\"가 품질 관리에서 의미하는 것은?",
    "options": [
      "보안·품질 검사를 개발 초기 단계로 앞당겨 수정 비용과 리스크를 줄이는 접근",
      "테스트를 배포 이후에만 수행해 속도를 높이는 방식",
      "품질 기준을 릴리즈 후에 정의하는 방식",
      "운영 단계 검토를 없애고 개발에만 집중"
    ],
    "answerIndex": 0,
    "explanation": "시프트레프트는 결함 발견과 수정이 늦을수록 비용이 커지므로 개발 초기에 품질·보안 검사를 실시하는 원칙이다.",
    "id": "ch4-term-quiz-8"
  },
  {
    "chapterId": "ch4",
    "type": "term",
    "prompt": "\"SLA\"란?",
    "options": [
      "서비스 제공자와 사용자 간 서비스 수준·가용성 기준을 공식 약속한 협약",
      "소스코드 정적 분석으로 품질 점수를 산출하는 도구",
      "컨테이너 배포를 자동화하는 파이프라인",
      "프로젝트 일정과 예산을 관리하는 문서"
    ],
    "answerIndex": 0,
    "explanation": "SLA(Service Level Agreement)는 가용성·응답 시간·장애 복구 목표 등 IT 서비스 품질 기준을 명시하는 공식 약속이다.",
    "id": "ch4-term-quiz-9"
  },
  {
    "chapterId": "ch4",
    "type": "term",
    "prompt": "\"SonarQube\"의 역할은?",
    "options": [
      "코드 복잡도·버그·취약점을 정적 분석해 품질 점수를 지속 측정",
      "실행 중인 앱을 동적으로 테스트해 외부 취약점을 탐지",
      "GPU 자원 할당과 활용을 자동 최적화",
      "클라우드 환경 이상행위와 위협을 탐지"
    ],
    "answerIndex": 0,
    "explanation": "SonarQube는 CI/CD 파이프라인에 통합해 코드 품질·보안 취약점을 지속적으로 분석하는 정적 분석 도구다.",
    "id": "ch4-term-quiz-10"
  },
  {
    "chapterId": "ch4",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「품질 보증 관점에서 프로세스 준수와 예방 활동에 집중하는 역할」",
    "options": [
      "QA",
      "QC",
      "PMO",
      "DevOps"
    ],
    "answerIndex": 0,
    "explanation": "QA(Quality Assurance)는 과정·예방 중심이다. QC는 결과물 판정, PMO는 프로젝트 관리 체계 안정화에 가깝다.",
    "id": "ch4-term-quiz-11"
  },
  {
    "chapterId": "ch4",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「결과물 자체가 기준에 부합하는지 판정하는 품질 통제 역할」",
    "options": [
      "QC",
      "QA",
      "품질 Gate",
      "PM"
    ],
    "answerIndex": 0,
    "explanation": "QC(Quality Control)는 산출물 합격 여부 판정에 초점을 둔다. QA는 예방·프로세스 중심이다.",
    "id": "ch4-term-quiz-12"
  },
  {
    "chapterId": "ch4",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「코드, 테스트, 운영 데이터를 통합 분석해 기술 품질을 지능적으로 관리하는 플랫폼」",
    "options": [
      "AI DevOps Platform",
      "품질 Gate",
      "Real Device Test Farm",
      "Trailvisi:ON"
    ],
    "answerIndex": 0,
    "explanation": "AI DevOps Platform은 기술 품질을 데이터 기반으로 분석하는 CJ DevOps 플랫폼 개념이다.",
    "id": "ch4-term-quiz-13"
  },
  {
    "chapterId": "ch5",
    "type": "term",
    "prompt": "\"AI Fabric\"이란?",
    "options": [
      "대규모 GPU와 노드를 초고속으로 연결하는 AI 워크로드 최적화 네트워크",
      "고객 메시징 자동화 플랫폼",
      "ERP 재무 모듈",
      "식품 규제 검색 엔진"
    ],
    "answerIndex": 0,
    "explanation": "AI Fabric은 GPU 클러스터 내부 동-서 트래픽 병목을 줄이는 AI 인프라 네트워크다.",
    "id": "ch5-term-quiz-1"
  },
  {
    "chapterId": "ch5",
    "type": "term",
    "prompt": "\"베어메탈 서버\"의 특징은?",
    "options": [
      "가상화 오버헤드 없이 물리 서버 자원을 직접 점유",
      "모든 워크로드를 컨테이너로만 실행",
      "GPU를 사용할 수 없는 서버",
      "ERP 전용 단말기"
    ],
    "answerIndex": 0,
    "explanation": "베어메탈은 물리 자원을 직접 활용해 AI 고성능 연산의 예측 가능성을 높인다.",
    "id": "ch5-term-quiz-2"
  },
  {
    "chapterId": "ch5",
    "type": "term",
    "prompt": "\"Kubernetes\"의 역할은?",
    "options": [
      "컨테이너 배포, 확장, 복구를 자동화",
      "GPU 간 네트워크만 설계",
      "고객 행동 분석만 수행",
      "VFX 렌더링만 담당"
    ],
    "answerIndex": 0,
    "explanation": "Kubernetes는 컨테이너 워크로드의 배포·확장·복구를 자동화하는 오케스트레이션 플랫폼이다.",
    "id": "ch5-term-quiz-3"
  },
  {
    "chapterId": "ch5",
    "type": "term",
    "prompt": "\"Spine-Leaf\" 구조가 AI Fabric에서 중요한 이유는?",
    "options": [
      "모든 노드 간 고속 연결로 GPU 동기화 트래픽을 처리",
      "외부 인터넷 접속만 빠르게 함",
      "ERP 화면 로딩만 최적화",
      "고객 이메일 전송만 개선"
    ],
    "answerIndex": 0,
    "explanation": "Spine-Leaf는 AI Fabric에서 동-서 트래픽을 고속·균등하게 처리하는 네트워크 토폴로지다.",
    "id": "ch5-term-quiz-4"
  },
  {
    "chapterId": "ch5",
    "type": "term",
    "prompt": "\"GitOps\"의 핵심은?",
    "options": [
      "Git을 단일 원천으로 삼아 인프라·앱 배포 상태를 선언적으로 자동화",
      "소스코드를 Git에 저장하는 일반 버전 관리 방식",
      "GPU 클러스터 설정을 수동으로 관리하는 방법",
      "ERP 코드베이스만 관리하는 전용 플랫폼"
    ],
    "answerIndex": 0,
    "explanation": "GitOps는 Git 상태를 원하는 인프라 상태로 선언하고 ArgoCD 등이 자동으로 일치시키는 현대적 운영 방식이다.",
    "id": "ch5-term-quiz-5"
  },
  {
    "chapterId": "ch5",
    "type": "term",
    "prompt": "\"RBAC\"이란?",
    "options": [
      "사용자 역할(Role)에 따라 시스템 자원 접근 권한을 제어하는 보안 모델",
      "모든 사용자에게 동일한 최고 권한을 부여하는 방식",
      "GPU 리소스를 균등 배분하는 네트워크 구조",
      "Kubernetes 자원 사용량을 측정하는 모니터링 도구"
    ],
    "answerIndex": 0,
    "explanation": "RBAC(역할 기반 접근 제어)는 직무·역할별로 필요한 권한만 부여해 최소 권한 원칙을 시스템 수준에서 구현한다.",
    "id": "ch5-term-quiz-6"
  },
  {
    "chapterId": "ch5",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「대규모 GPU와 노드를 초고속으로 연결하는 AI 워크로드 최적화 네트워크」",
    "options": [
      "AI Fabric",
      "Kubernetes",
      "Spine-Leaf",
      "Digital Core"
    ],
    "answerIndex": 0,
    "explanation": "AI Fabric은 GPU 클러스터 동-서 트래픽을 위한 네트워크다. Kubernetes는 컨테이너 오케스트레이션이다.",
    "id": "ch5-term-quiz-7"
  },
  {
    "chapterId": "ch5",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「가상화 오버헤드 없이 물리 서버 자원을 직접 점유하는 고성능 서버」",
    "options": [
      "베어메탈 서버",
      "AI Fabric",
      "Fiori",
      "Real Device Test Farm"
    ],
    "answerIndex": 0,
    "explanation": "베어메탈은 물리 자원 직접 점유로 AI 고성능 연산에 유리하다.",
    "id": "ch5-term-quiz-8"
  },
  {
    "chapterId": "ch5",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「모든 노드 간 고속 연결로 AI Fabric의 동-서 트래픽을 처리하는 네트워크 토폴로지」",
    "options": [
      "Spine-Leaf",
      "VPN",
      "Zero Trust",
      "Universal Journal"
    ],
    "answerIndex": 0,
    "explanation": "Spine-Leaf는 AI Fabric에서 GPU 동기화 트래픽을 처리하는 토폴로지다.",
    "id": "ch5-term-quiz-9"
  },
  {
    "chapterId": "ch6",
    "type": "term",
    "prompt": "\"RAG\"의 정의로 가장 적절한 것은?",
    "options": [
      "외부 지식 검색 결과를 생성형 AI 답변에 결합해 근거성을 높이는 방식",
      "식품 패키지 디자인 자동화 도구",
      "물류 차량 배차 시스템",
      "고객 결제 수단 관리 도구"
    ],
    "answerIndex": 0,
    "explanation": "RAG는 검색된 지식을 AI 답변에 결합해 정확성과 출처 근거를 강화하는 방식이다.",
    "id": "ch6-term-quiz-1"
  },
  {
    "chapterId": "ch6",
    "type": "term",
    "prompt": "\"목적형 식품 소비\"란?",
    "options": [
      "건강 목표와 생체 지표에 맞춰 식품을 선택하는 소비",
      "가격만 보고 구매하는 소비",
      "브랜드 로고만 보고 구매하는 소비",
      "식품 성분 표시를 무시하는 소비"
    ],
    "answerIndex": 0,
    "explanation": "목적형 식품 소비는 단백질, 혈당, 장 건강 등 명확한 건강 목적에 맞춘 선택을 말한다.",
    "id": "ch6-term-quiz-2"
  },
  {
    "chapterId": "ch6",
    "type": "term",
    "prompt": "\"Bio-Sync\" 관점의 식품 서비스에 가까운 것은?",
    "options": [
      "개인 생체 리듬과 상태에 맞춰 성분·추천을 조정",
      "모든 고객에게 같은 영양 조합 제공",
      "건강 데이터를 식품 설계에서 제외",
      "제조 후 데이터를 더 이상 활용하지 않음"
    ],
    "answerIndex": 0,
    "explanation": "Bio-Sync는 개인 생체 데이터와 상태 변화에 맞춰 식품 솔루션을 조정하는 방향이다.",
    "id": "ch6-term-quiz-3"
  },
  {
    "chapterId": "ch6",
    "type": "term",
    "prompt": "\"데이터 기반 ESG\"의 핵심은?",
    "options": [
      "탄소·공급망·윤리 지표를 데이터로 수집·검증·보고",
      "홍보 문구만 강화",
      "협력사 데이터를 무시",
      "규제 보고를 수기로만 처리"
    ],
    "answerIndex": 0,
    "explanation": "데이터 기반 ESG는 디지털 증거와 정량 데이터로 지속가능성을 검증하는 방식이다.",
    "id": "ch6-term-quiz-4"
  },
  {
    "chapterId": "ch6",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「외부 지식 검색 결과를 생성형 AI 답변에 결합해 정확성과 근거성을 높이는 방식」",
    "options": [
      "RAG",
      "Fine-tuning",
      "Prompt Engineering",
      "TurboQuant"
    ],
    "answerIndex": 0,
    "explanation": "RAG는 검색 증강 생성 방식이다. Fine-tuning은 모델 재학습, TurboQuant는 초고속 연산 기술이다.",
    "id": "ch6-term-quiz-5"
  },
  {
    "chapterId": "ch6",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「개인 생체 리듬과 상태 변화에 맞춰 식품 성분과 추천을 조정하는 서비스 방향」",
    "options": [
      "Bio-Sync",
      "목적형 식품 소비",
      "데이터 기반 ESG",
      "옴니채널"
    ],
    "answerIndex": 0,
    "explanation": "Bio-Sync는 생체 데이터 연동 맞춤형 식품 서비스다. 목적형 식품 소비는 건강 목표 기반 선택 트렌드다.",
    "id": "ch6-term-quiz-6"
  },
  {
    "chapterId": "ch6",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「초고속 연산 기술로 식품·바이오 산업의 데이터 분석과 혁신을 가속하는 기술」",
    "options": [
      "TurboQuant",
      "RAG",
      "Bio-Sync",
      "Kubernetes"
    ],
    "answerIndex": 0,
    "explanation": "TurboQuant는 교재가 언급한 식품·바이오 분야 초고속 연산 기술이다.",
    "id": "ch6-term-quiz-7"
  },
  {
    "chapterId": "ch6",
    "type": "term",
    "prompt": "\"맞춤형 기능성 식품\"의 의미는?",
    "options": [
      "개인 생체 데이터와 건강 목표에 맞춰 영양·기능성을 설계",
      "모든 소비자에게 같은 제품만 제공",
      "건강 데이터를 제품 설계에서 제외",
      "규제 정보를 AI 검색에서 배제"
    ],
    "answerIndex": 0,
    "explanation": "맞춤형 기능성 식품은 개인 건강 데이터와 AI를 활용한 맞춤 영양 솔루션으로 확장된다.",
    "id": "ch6-term-quiz-8"
  },
  {
    "chapterId": "ch6",
    "type": "term",
    "prompt": "\"청킹(Chunking)\"이 RAG에서 필요한 이유는?",
    "options": [
      "긴 문서를 작은 의미 단위로 나눠 검색 정확도를 높이기 위해",
      "문서를 삭제해 저장 공간을 줄이기 위해",
      "모든 데이터를 하나의 큰 단위로 묶기 위해",
      "검색 결과를 최신순으로 정렬하기 위해"
    ],
    "answerIndex": 0,
    "explanation": "청킹은 RAG에서 문서를 의미 단위로 분할해 검색 엔진이 관련성 높은 구간을 정확하게 찾을 수 있게 하는 전처리 과정이다.",
    "id": "ch6-term-quiz-9"
  },
  {
    "chapterId": "ch6",
    "type": "term",
    "prompt": "\"리랭킹(Re-ranking)\"의 역할은?",
    "options": [
      "검색된 후보 문서 중 질문에 가장 적합한 것을 재정렬해 답변 품질을 높임",
      "검색 결과를 무작위로 섞어 다양성을 높임",
      "문서를 작은 단위로 분할하는 전처리 과정",
      "출처 없는 문장을 우선 선택하는 방식"
    ],
    "answerIndex": 0,
    "explanation": "리랭킹은 초기 검색으로 가져온 후보 중 실제 질문 맥락과 가장 맞는 것을 재선별해 RAG 답변 품질을 높인다.",
    "id": "ch6-term-quiz-10"
  },
  {
    "chapterId": "ch6",
    "type": "term",
    "prompt": "\"그린워싱(Greenwashing)\"이란?",
    "options": [
      "실제 근거 없이 친환경적인 것처럼 과장·허위 홍보하는 행위",
      "탄소 배출량을 데이터로 측정해 보고하는 방식",
      "ESG 공급망 전반의 지표를 수집하는 방법",
      "식품 라벨에 영양 성분을 표시하는 기준"
    ],
    "answerIndex": 0,
    "explanation": "그린워싱은 데이터 기반 ESG가 중요해진 배경으로, 정량 근거 없는 친환경 주장에 대한 규제와 검증 필요성이 높아졌다.",
    "id": "ch6-term-quiz-11"
  },
  {
    "chapterId": "ch6",
    "type": "term",
    "prompt": "\"CGM\"이란?",
    "options": [
      "혈당을 실시간으로 연속 측정하는 웨어러블 기기",
      "식품 성분을 분석하는 실험실 장비",
      "탄소 배출량을 연속 모니터링하는 산업용 센서",
      "소비자 구매 행동 데이터를 수집하는 앱"
    ],
    "answerIndex": 0,
    "explanation": "CGM(연속 혈당 측정기)은 Bio-Sync와 목적형 식품 소비의 핵심 데이터 소스로, 개인 혈당 변화를 실시간으로 추적한다.",
    "id": "ch6-term-quiz-12"
  },
  {
    "chapterId": "ch7",
    "type": "term",
    "prompt": "\"디지털 트윈\"이란?",
    "options": [
      "현실 설비와 프로세스를 가상 공간에 구현하고 실시간 데이터로 연결한 모델",
      "단순 위치 지도",
      "고객 세그먼트 목록",
      "ERP 결산 화면"
    ],
    "answerIndex": 0,
    "explanation": "디지털 트윈은 현실과 가상을 연결해 시뮬레이션·예측·운영 최적화를 수행한다.",
    "id": "ch7-term-quiz-1"
  },
  {
    "chapterId": "ch7",
    "type": "term",
    "prompt": "\"피지컬 AI\"란?",
    "options": [
      "AI가 실제 물리 환경을 인지하고 행동하도록 하는 기술 영역",
      "문서 검색만 자동화하는 AI",
      "클라우드 비용만 분석하는 AI",
      "ERP 화면만 자동 클릭하는 RPA"
    ],
    "answerIndex": 0,
    "explanation": "피지컬 AI는 휴머노이드 등이 물리 공간을 인지·행동하게 하는 AI 영역이다.",
    "id": "ch7-term-quiz-2"
  },
  {
    "chapterId": "ch7",
    "type": "term",
    "prompt": "\"미들마일\"이란?",
    "options": [
      "물류 허브와 허브 사이의 중간 운송 구간",
      "고객 doorstep까지의 최종 배송",
      "ERP 내부 전표 처리",
      "VFX 후반 작업"
    ],
    "answerIndex": 0,
    "explanation": "미들마일은 허브 간 간선 운송 구간으로 자율주행 트럭의 핵심 적용 영역이다.",
    "id": "ch7-term-quiz-3"
  },
  {
    "chapterId": "ch7",
    "type": "term",
    "prompt": "물류 자동화에서 \"피지컬 AI\"가 연결되는 대표 사례는?",
    "options": [
      "휴머노이드가 현장 물리 공간에서 비정형 업무 수행",
      "ERP 전표 자동 입력",
      "고객 푸시 메시지 발송",
      "식품 규제 문서 검색"
    ],
    "answerIndex": 0,
    "explanation": "교재는 휴머노이드의 피지컬 AI 적용을 물류 DX의 핵심 변화로 본다.",
    "id": "ch7-term-quiz-4"
  },
  {
    "chapterId": "ch7",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「AI가 실제 물리 환경을 인지하고 행동하도록 하는 기술 영역」",
    "options": [
      "피지컬 AI",
      "RPA",
      "디지털 트윈",
      "Agentic AI"
    ],
    "answerIndex": 0,
    "explanation": "피지컬 AI는 물리 공간 인지·행동 AI다. 디지털 트윈은 현실-가상 모델, RPA는 규칙 자동화다.",
    "id": "ch7-term-quiz-5"
  },
  {
    "chapterId": "ch7",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「현실 설비와 프로세스를 가상 공간에 구현하고 실시간 데이터로 연결한 모델」",
    "options": [
      "디지털 트윈",
      "피지컬 AI",
      "미들마일",
      "Kubernetes"
    ],
    "answerIndex": 0,
    "explanation": "디지털 트윈은 현실-가상 연결 모델이다. 미들마일은 물류 운송 구간이다.",
    "id": "ch7-term-quiz-6"
  },
  {
    "chapterId": "ch7",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「물류 허브와 허브 사이의 중간 운송 구간」",
    "options": [
      "미들마일",
      "라스트마일",
      "Order-to-Cash",
      "Lateral Movement"
    ],
    "answerIndex": 0,
    "explanation": "미들마일은 허브 간 간선 운송이다. 라스트마일은 최종 배송 구간이다.",
    "id": "ch7-term-quiz-7"
  },
  {
    "chapterId": "ch8",
    "type": "term",
    "prompt": "\"유니파이드 커머스\"란?",
    "options": [
      "모든 채널의 상거래 로직과 데이터를 하나의 운영 체계로 통합",
      "온·오프라인 가격 정책을 분리",
      "채널별 고객 이력을 따로 관리",
      "대량 광고만 반복 발송"
    ],
    "answerIndex": 0,
    "explanation": "유니파이드 커머스는 채널 연결을 넘어 데이터와 거래 로직의 완전한 통합을 지향한다.",
    "id": "ch8-term-quiz-1"
  },
  {
    "chapterId": "ch8",
    "type": "term",
    "prompt": "\"Single Source of Truth\"란?",
    "options": [
      "조직이 동일하게 신뢰하는 단일 기준 데이터 원천",
      "각 채널마다 다른 재고 기준",
      "마케팅 문구만 통일",
      "외부 쿠키 추적 데이터"
    ],
    "answerIndex": 0,
    "explanation": "SSOT는 채널 간 재고·가격·고객 정보 불일치를 줄이는 통합 데이터 기준이다.",
    "id": "ch8-term-quiz-2"
  },
  {
    "chapterId": "ch8",
    "type": "term",
    "prompt": "\"에이전틱 커머스\"란?",
    "options": [
      "AI 에이전트가 사용자 의도를 파악해 탐색·구매를 지원하거나 수행",
      "모든 구매를 수동 상담으로 처리",
      "채널별 시스템을 완전 분리",
      "오프라인 매장만 운영"
    ],
    "answerIndex": 0,
    "explanation": "에이전틱 커머스는 AI가 고객 의도를 대신 수행하는 차세대 쇼핑 경험이다.",
    "id": "ch8-term-quiz-3"
  },
  {
    "chapterId": "ch8",
    "type": "term",
    "prompt": "\"옴니채널\"과 \"유니파이드 커머스\"의 관계로 적절한 것은?",
    "options": [
      "옴니채널 경험을 넘어 데이터·거래 로직까지 통합하는 다음 단계",
      "완전히 같은 개념",
      "유니파이드는 오프라인만 의미",
      "옴니채널은 ERP 전용 용어"
    ],
    "answerIndex": 0,
    "explanation": "유통은 옴니채널을 넘어 유니파이드 커머스로 데이터·로직 통합을 지향한다.",
    "id": "ch8-term-quiz-4"
  },
  {
    "chapterId": "ch8",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「조직이 동일하게 신뢰하는 단일 기준 데이터 원천」",
    "options": [
      "Single Source of Truth",
      "서드파티 쿠키",
      "옴니채널",
      "Cryptomining"
    ],
    "answerIndex": 0,
    "explanation": "SSOT는 통합 커머스의 데이터 기준 원천이다. 옴니채널은 고객 경험 전략이다.",
    "id": "ch8-term-quiz-5"
  },
  {
    "chapterId": "ch8",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「AI 에이전트가 사용자의 의도를 파악해 탐색과 구매를 지원하거나 수행하는 상거래」",
    "options": [
      "에이전틱 커머스",
      "유니파이드 커머스",
      "Amazon FBA",
      "그로스 마케팅"
    ],
    "answerIndex": 0,
    "explanation": "에이전틱 커머스는 AI가 구매 의도를 대신 수행하는 상거래다. FBA는 아마존 물류 서비스다.",
    "id": "ch8-term-quiz-6"
  },
  {
    "chapterId": "ch8",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「모든 채널의 상거래 로직과 데이터를 하나의 운영 체계로 통합하는 모델」",
    "options": [
      "유니파이드 커머스",
      "옴니채널",
      "Braze",
      "Clean Core"
    ],
    "answerIndex": 0,
    "explanation": "유니파이드 커머스는 데이터·거래 로직 통합 모델이다. 옴니채널은 접점 경험 전략이다.",
    "id": "ch8-term-quiz-7"
  },
  {
    "chapterId": "ch9",
    "type": "term",
    "prompt": "\"VLM\"이란?",
    "options": [
      "텍스트와 이미지, 영상 정보를 함께 이해하는 비전-언어 모델",
      "ERP 재무 모듈",
      "클라우드 위협 탐지 도구",
      "물류 경로 최적화 시스템"
    ],
    "answerIndex": 0,
    "explanation": "VLM은 멀티모달 콘텐츠를 맥락 있게 이해해 검색·추천·연결에 활용된다.",
    "id": "ch9-term-quiz-1"
  },
  {
    "chapterId": "ch9",
    "type": "term",
    "prompt": "\"공간 컴퓨팅\"이란?",
    "options": [
      "디지털 콘텐츠와 물리 공간·사용자 상호작용을 결합해 경험을 확장",
      "서버실 냉각만 최적화",
      "텍스트 문서만 처리",
      "ERP 결산 자동화"
    ],
    "answerIndex": 0,
    "explanation": "공간 컴퓨팅은 미디어 경험을 화면 밖의 공간적 상호작용으로 확장한다.",
    "id": "ch9-term-quiz-2"
  },
  {
    "chapterId": "ch9",
    "type": "term",
    "prompt": "\"감성 컴퓨팅\"이란?",
    "options": [
      "사용자 감정과 반응 맥락을 인식·활용해 콘텐츠 경험을 조정",
      "GPU 온도만 측정",
      "모든 사용자에게 같은 콘텐츠 노출",
      "콘텐츠 검색을 금지"
    ],
    "answerIndex": 0,
    "explanation": "감성 컴퓨팅은 사용자 감정·반응을 추천과 큐레이션에 반영할 수 있게 한다.",
    "id": "ch9-term-quiz-3"
  },
  {
    "chapterId": "ch9",
    "type": "term",
    "prompt": "\"콘텐츠 신뢰 인프라\"가 필요한 이유는?",
    "options": [
      "합성·생성형 콘텐츠의 출처·저작권·진위 검증",
      "모든 콘텐츠를 수기로만 제작",
      "VLM 사용을 금지",
      "추천 알고리즘만 있으면 충분"
    ],
    "answerIndex": 0,
    "explanation": "AI 생성 콘텐츠 확산으로 진위·출처·권리 검증 인프라가 핵심이 된다.",
    "id": "ch9-term-quiz-4"
  },
  {
    "chapterId": "ch9",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「디지털 콘텐츠와 물리 공간·사용자 상호작용을 결합해 경험을 확장하는 컴퓨팅」",
    "options": [
      "공간 컴퓨팅",
      "감성 컴퓨팅",
      "VLM",
      "피지컬 AI"
    ],
    "answerIndex": 0,
    "explanation": "공간 컴퓨팅은 3D·공간 기반 상호작용을 확장한다. 감성 컴퓨팅은 감정·반응 활용이다.",
    "id": "ch9-term-quiz-5"
  },
  {
    "chapterId": "ch9",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「사용자 감정과 반응 맥락을 인식·활용해 콘텐츠 경험과 추천을 조정하는 기술」",
    "options": [
      "감성 컴퓨팅",
      "공간 컴퓨팅",
      "초개인화 큐레이션",
      "Bio-Sync"
    ],
    "answerIndex": 0,
    "explanation": "감성 컴퓨팅은 감정·반응 맥락을 추천에 반영한다. 초개인화 큐레이션은 취향 기반 추천이다.",
    "id": "ch9-term-quiz-6"
  },
  {
    "chapterId": "ch9",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「텍스트와 이미지, 영상 정보를 함께 이해하는 비전-언어 모델」",
    "options": [
      "VLM",
      "RAG",
      "Agentic AI",
      "Fiori"
    ],
    "answerIndex": 0,
    "explanation": "VLM은 멀티모달 비전-언어 모델이다. RAG는 검색 증강 생성 방식이다.",
    "id": "ch9-term-quiz-7"
  },
  {
    "chapterId": "ch9",
    "type": "term",
    "prompt": "\"VR\", \"AR\", \"MR\"을 올바르게 구분한 것은?",
    "options": [
      "VR은 완전 가상 몰입, AR은 현실 위 디지털 겹침, MR은 현실과 디지털의 상호작용",
      "VR은 현실 위 디지털 겹침, AR은 완전 가상, MR은 음성 인터페이스",
      "세 가지는 동일한 기술의 다른 이름",
      "MR만 엔터테인먼트에 쓰이고 VR·AR은 산업 전용"
    ],
    "answerIndex": 0,
    "explanation": "VR은 완전 몰입형 가상환경, AR은 현실에 디지털 정보를 오버레이, MR은 현실과 가상이 실시간 상호작용하는 혼합 환경이다.",
    "id": "ch9-term-quiz-8"
  },
  {
    "chapterId": "ch9",
    "type": "term",
    "prompt": "\"비가시적 워터마킹\"이 콘텐츠 신뢰에서 필요한 이유는?",
    "options": [
      "사람 눈에 보이지 않는 식별 정보를 삽입해 출처·저작권을 검증할 수 있기 때문",
      "콘텐츠 화질을 낮춰 무단 복사를 방지하기 위해",
      "생성형 AI의 답변 속도를 높이기 위해",
      "스트리밍 영상의 압축률을 개선하기 위해"
    ],
    "answerIndex": 0,
    "explanation": "비가시적 워터마킹은 AI 생성 콘텐츠 확산 시대에 출처 추적·저작권 검증의 핵심 기술로, 콘텐츠 신뢰 인프라의 구성 요소다.",
    "id": "ch9-term-quiz-9"
  },
  {
    "chapterId": "ch10",
    "type": "term",
    "prompt": "\"Dwell Time\"이란?",
    "options": [
      "공격자가 침투 후 탐지되기 전까지 내부에 머무는 시간",
      "GPU 학습에 걸리는 시간",
      "VFX 렌더링 소요 시간",
      "고객 앱 체류 시간"
    ],
    "answerIndex": 0,
    "explanation": "Dwell Time이 길수록 공격자가 권한 확대와 데이터 유출 등 피해를 키울 수 있다.",
    "id": "ch10-term-quiz-1"
  },
  {
    "chapterId": "ch10",
    "type": "term",
    "prompt": "\"Cryptomining\" 공격이란?",
    "options": [
      "탈취한 클라우드 자원으로 암호화폐를 채굴해 비용 피해를 유발하는 공격",
      "고객 데이터를 암호화해 보호하는 방식",
      "ERP 재무 데이터를 채굴하는 작업",
      "테스트 자동화 방식"
    ],
    "answerIndex": 0,
    "explanation": "Cryptomining은 탈취된 클라우드 컴퓨팅 자원을 악용해 채굴 비용 피해를 만든다.",
    "id": "ch10-term-quiz-2"
  },
  {
    "chapterId": "ch10",
    "type": "term",
    "prompt": "\"Trailvisi:ON\"의 정의로 가장 적절한 것은?",
    "options": [
      "AWS 환경의 이상행위와 위협 탐지를 지원하는 보안 가시성 솔루션",
      "고객 메시징 자동화 플랫폼",
      "VFX 통합 제작 플랫폼",
      "식품 규제 검색 도구"
    ],
    "answerIndex": 0,
    "explanation": "Trailvisi:ON은 AWS 활동 로그 기반으로 위협과 이상행위 가시성을 높이는 솔루션이다.",
    "id": "ch10-term-quiz-3"
  },
  {
    "chapterId": "ch10",
    "type": "term",
    "prompt": "Trailvisi:ON의 추진 방향으로 교재가 제시한 것은?",
    "options": [
      "이상 탐지를 넘어 지능형 자율 보안 솔루션으로 확장",
      "로그 조회만 제공하고 해석은 하지 않음",
      "클라우드 보안 도구 연계를 줄임",
      "위협 탐지보다 수동 보고서만 제공"
    ],
    "answerIndex": 0,
    "explanation": "교재는 Trailvisi:ON이 자율 탐지·대응 중심의 지능형 보안 솔루션으로 발전하는 로드맵을 제시한다.",
    "id": "ch10-term-quiz-4"
  },
  {
    "chapterId": "ch10",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「공격자가 침투 후 탐지되기 전까지 내부에 머무는 시간」",
    "options": [
      "Dwell Time",
      "Lateral Movement",
      "MTTR",
      "API 가시성"
    ],
    "answerIndex": 0,
    "explanation": "Dwell Time(체류 시간)은 침투 후 탐지까지의 시간이다. MTTR은 복구 시간, API 가시성은 클라우드 행위 추적 능력이다.",
    "id": "ch10-term-quiz-5"
  },
  {
    "chapterId": "ch10",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「탈취한 클라우드 자원으로 암호화폐를 채굴해 비용 피해를 유발하는 공격」",
    "options": [
      "Cryptomining",
      "Dwell Time",
      "Ransomware",
      "Phishing"
    ],
    "answerIndex": 0,
    "explanation": "Cryptomining은 클라우드 자원 탈취 후 채굴 비용 피해를 일으키는 공격 유형이다.",
    "id": "ch10-term-quiz-6"
  },
  {
    "chapterId": "ch10",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「AWS 환경의 이상행위와 위협 탐지를 지원하는 보안 가시성 솔루션」",
    "options": [
      "Trailvisi:ON",
      "CloudTrail",
      "GuardDuty",
      "O’testlab"
    ],
    "answerIndex": 0,
    "explanation": "Trailvisi:ON은 CJ올리브네트웍스의 AWS 이상행위·위협 탐지 솔루션이다. CloudTrail·GuardDuty는 AWS 기본 서비스 이름으로 헷갈리기 쉽다.",
    "id": "ch10-term-quiz-7"
  },
  {
    "chapterId": "ch10",
    "type": "term",
    "prompt": "\"API 가시성\"이란?",
    "options": [
      "클라우드에서 권한 변경·자원 생성 등 API 활동을 추적해 이상행위를 파악하는 능력",
      "고객 앱 UI 요소를 자동 인식하는 기능",
      "ERP 재무 전표를 실시간 조회하는 기능",
      "VFX 렌더링 큐를 모니터링하는 기능"
    ],
    "answerIndex": 0,
    "explanation": "클라우드에서는 API 활동이 보안 경계가 되므로 API 가시성이 위협 탐지의 핵심이다.",
    "id": "ch10-term-quiz-8"
  },
  {
    "chapterId": "ch10",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「클라우드에서 권한 변경·자원 생성 등 API 활동을 추적해 이상행위를 파악하는 능력」",
    "options": [
      "API 가시성",
      "Dwell Time",
      "CloudTrail",
      "Cryptomining"
    ],
    "answerIndex": 0,
    "explanation": "API 가시성은 클라우드 보안 경계인 API 활동 추적 능력이다. CloudTrail은 AWS 로그 서비스 이름이다.",
    "id": "ch10-term-quiz-9"
  },
  {
    "chapterId": "ch10",
    "type": "term",
    "prompt": "\"IAM\"이 클라우드 보안에서 중요한 이유는?",
    "options": [
      "계정·역할·권한이 클라우드의 실질적 보안 경계가 되기 때문",
      "IAM은 온프레미스 방화벽을 대체하는 물리 장비",
      "클라우드 비용 청구를 자동화하는 기능",
      "API 호출 로그를 장기 보관하는 스토리지 서비스"
    ],
    "answerIndex": 0,
    "explanation": "IAM(Identity and Access Management)은 클라우드에서 누가 무엇에 접근할 수 있는지를 제어하는 핵심 보안 체계로, 계정·역할·권한이 실질적 경계가 된다.",
    "id": "ch10-term-quiz-10"
  },
  {
    "chapterId": "ch10",
    "type": "term",
    "prompt": "\"CSPM\"이란?",
    "options": [
      "클라우드 환경의 보안 설정 취약점을 지속 모니터링하고 위험을 탐지하는 도구",
      "클라우드 서버의 물리 보안을 담당하는 장비",
      "ERP 재무 데이터 암호화를 관리하는 도구",
      "VFX 렌더링 자원을 배분하는 시스템"
    ],
    "answerIndex": 0,
    "explanation": "CSPM(Cloud Security Posture Management)은 잘못된 보안 설정·취약점을 자동으로 감지해 클라우드 보안 상태를 지속적으로 관리한다.",
    "id": "ch10-term-quiz-11"
  },
  {
    "chapterId": "ch10",
    "type": "term",
    "prompt": "\"SIEM\"이란?",
    "options": [
      "보안 이벤트 로그를 수집·분석해 위협을 탐지하는 보안 정보 및 이벤트 관리 플랫폼",
      "클라우드 자원을 자동 배포하는 오케스트레이션 도구",
      "코드 품질을 정적으로 분석하는 소프트웨어",
      "네트워크 패킷을 암호화하는 프로토콜"
    ],
    "answerIndex": 0,
    "explanation": "SIEM은 다양한 소스의 로그를 한 곳에 수집해 이상 패턴을 탐지하고 보안 사고에 신속히 대응하게 한다. Trailvisi:ON도 SIEM 연계를 활용한다.",
    "id": "ch10-term-quiz-12"
  },
  {
    "chapterId": "ch11",
    "type": "term",
    "prompt": "\"VFX\"란?",
    "options": [
      "현실 촬영으로 구현하기 어려운 장면을 만드는 시각 특수효과",
      "고객 행동 분석 도구",
      "ERP 재무 모듈",
      "클라우드 위협 탐지 솔루션"
    ],
    "answerIndex": 0,
    "explanation": "VFX(Visual Effects)는 영상 콘텐츠에서 현실 촬영으로 어려운 장면을 만드는 시각 특수효과다.",
    "id": "ch11-term-quiz-1"
  },
  {
    "chapterId": "ch11",
    "type": "term",
    "prompt": "\"제작 데이터 자산화\"의 의미는?",
    "options": [
      "프로젝트 종료 후 사라지던 제작 정보를 축적해 재활용 가능한 자산으로 만드는 것",
      "모든 제작 데이터를 프로젝트마다 삭제",
      "완성 영상만 저장하고 공정 데이터는 폐기",
      "외주 협업 기록을 남기지 않음"
    ],
    "answerIndex": 0,
    "explanation": "제작 데이터 자산화는 경험과 공정 데이터를 조직 자산으로 축적해 후속 프로젝트에 활용하는 것이다.",
    "id": "ch11-term-quiz-2"
  },
  {
    "chapterId": "ch11",
    "type": "term",
    "prompt": "\"VANTA VFX\"의 정의로 가장 적절한 것은?",
    "options": [
      "AI·데이터·플랫폼 기반 VFX 통합 제작 플랫폼",
      "고객 푸시 메시지 발송 도구",
      "식품 규제 검색 엔진",
      "물류 경로 최적화 시스템"
    ],
    "answerIndex": 0,
    "explanation": "VANTA VFX는 후반 제작과 VFX 공정을 AI, 데이터, 플랫폼으로 통합 관리하는 프로젝트다.",
    "id": "ch11-term-quiz-3"
  },
  {
    "chapterId": "ch11",
    "type": "term",
    "prompt": "VANTA VFX 플랫폼이 강조하는 운영 가치는?",
    "options": [
      "공정 가시성, 반복 작업 자동화, GPU 리소스 관리",
      "고객 세그먼트 자동 생성",
      "ERP 전표 자동 입력",
      "클라우드 계정 권한만 관리"
    ],
    "answerIndex": 0,
    "explanation": "VANTA VFX는 제작 진행률, 리소스, 공정 상태를 데이터로 가시화하고 자동화·자원 운영을 강화한다.",
    "id": "ch11-term-quiz-4"
  },
  {
    "chapterId": "ch11",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「프로젝트 종료 후 사라지던 제작 정보를 축적해 재활용 가능한 자산으로 만드는 것」",
    "options": [
      "제작 데이터 자산화",
      "GPU 리소스 관리",
      "No-Code 테스트",
      "Digital Core"
    ],
    "answerIndex": 0,
    "explanation": "제작 데이터 자산화는 VFX 공정 데이터를 조직 자산으로 축적하는 개념이다.",
    "id": "ch11-term-quiz-5"
  },
  {
    "chapterId": "ch11",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「VFX 렌더링 등 고성능 연산 자원의 할당과 활용을 데이터 기반으로 최적화하는 운영」",
    "options": [
      "GPU 리소스 관리",
      "AI Fabric",
      "제작 데이터 자산화",
      "베어메탈 서버"
    ],
    "answerIndex": 0,
    "explanation": "GPU 리소스 관리는 VANTA VFX에서 렌더링 자원 운영을 가시화·최적화하는 개념이다. AI Fabric은 AI 학습 네트워크다.",
    "id": "ch11-term-quiz-6"
  },
  {
    "chapterId": "ch11",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「AI·데이터·플랫폼 기반 VFX 통합 제작 플랫폼」",
    "options": [
      "VANTA VFX",
      "Adobe After Effects",
      "Unreal Engine",
      "Trailvisi:ON"
    ],
    "answerIndex": 0,
    "explanation": "VANTA VFX는 교재의 CJ올리브네트웍스 AI VFX 통합 플랫폼이다. 나머지는 일반 VFX/보안 도구 이름이다.",
    "id": "ch11-term-quiz-7"
  },
  {
    "chapterId": "ch12",
    "type": "term",
    "prompt": "\"Real Device Test Farm\"이란?",
    "options": [
      "실제 모바일·PC 기기로 구성된 테스트 장비 풀",
      "가상 음식점 목록",
      "마케팅 고객군 데이터",
      "클라우드 보안 정책 모음"
    ],
    "answerIndex": 0,
    "explanation": "실제 기기 테스트 팜은 다양한 OS·기기 환경에서 발생하는 품질 이슈를 검증하기 위한 장비 풀이다.",
    "id": "ch12-term-quiz-1"
  },
  {
    "chapterId": "ch12",
    "type": "term",
    "prompt": "\"No-Code 테스트\"의 장점은?",
    "options": [
      "비개발자도 화면 요소 기반으로 테스트 시나리오를 구성할 수 있음",
      "테스트 결과를 저장하지 않음",
      "모바일 테스트를 금지함",
      "품질 검증을 수동으로만 제한"
    ],
    "answerIndex": 0,
    "explanation": "No-Code 방식은 드래그 앤 드롭 등으로 테스트 작성 장벽을 낮춰 QA·현업 참여를 확대한다.",
    "id": "ch12-term-quiz-2"
  },
  {
    "chapterId": "ch12",
    "type": "term",
    "prompt": "\"O'testlab\"이 지원하는 테스트 환경으로 교재가 언급한 것은?",
    "options": [
      "Android, iOS, Windows PC",
      "ERP FI 모듈만",
      "AWS CloudTrail만",
      "VFX 렌더링 노드만"
    ],
    "answerIndex": 0,
    "explanation": "O'testlab은 모바일(Android, iOS)과 Windows PC 환경을 아우르는 통합 테스트 자동화 플랫폼이다.",
    "id": "ch12-term-quiz-3"
  },
  {
    "chapterId": "ch12",
    "type": "term",
    "prompt": "O'testlab의 AI 기반 UI 요소 인식이 주는 효과는?",
    "options": [
      "화면 변경에도 시나리오 작성·유지보수 부담을 줄임",
      "테스트 자동화를 중단함",
      "실제 기기 검증을 불가능하게 함",
      "결함 분석을 담당자 기억에만 의존"
    ],
    "answerIndex": 0,
    "explanation": "AI가 UI 요소를 인식하면 화면 변화에 대응하기 쉽고 비개발자도 시나리오를 구성할 수 있다.",
    "id": "ch12-term-quiz-4"
  },
  {
    "chapterId": "ch12",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「실제 모바일/PC 기기로 구성된 테스트 장비 풀」",
    "options": [
      "Real Device Test Farm",
      "Emulator Suite",
      "Selenium Grid",
      "Kubernetes Cluster"
    ],
    "answerIndex": 0,
    "explanation": "Real Device Test Farm은 O’testlab의 실제 기기 테스트 환경이다. 에뮬레이터·Selenium Grid는 유사하지만 다른 개념이다.",
    "id": "ch12-term-quiz-5"
  },
  {
    "chapterId": "ch12",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「개발자가 아니어도 화면 요소 인식과 드래그 앤 드롭으로 테스트를 구성하는 방식」",
    "options": [
      "No-Code 테스트",
      "UI 요소 인식",
      "Real Device Test Farm",
      "품질 Gate"
    ],
    "answerIndex": 0,
    "explanation": "No-Code 테스트는 비개발자도 시나리오를 구성하는 방식이다. UI 요소 인식은 그를 가능하게 하는 AI 기능이다.",
    "id": "ch12-term-quiz-6"
  },
  {
    "chapterId": "ch12",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「AI가 화면 구성 요소를 자동으로 찾아 테스트 시나리오 작성·유지보수를 돕는 기능」",
    "options": [
      "UI 요소 인식",
      "No-Code 테스트",
      "Cryptomining",
      "RAG"
    ],
    "answerIndex": 0,
    "explanation": "UI 요소 인식은 O’testlab의 AI 기반 화면 인식 기능이다.",
    "id": "ch12-term-quiz-7"
  },
  {
    "chapterId": "ch13",
    "type": "term",
    "prompt": "\"Braze\"의 역할은?",
    "options": [
      "고객 메시징, 캠페인 자동화, 개인화 마케팅 실행",
      "프로덕트 내 고객 행동 분석",
      "AWS 위협 탐지",
      "VFX 렌더링"
    ],
    "answerIndex": 0,
    "explanation": "Braze는 세그먼트와 행동에 맞춘 메시징 및 캠페인 실행에 강점이 있는 마테크 플랫폼이다.",
    "id": "ch13-term-quiz-1"
  },
  {
    "chapterId": "ch13",
    "type": "term",
    "prompt": "\"Amplitude\"의 역할은?",
    "options": [
      "프로덕트 내 고객 행동 분석과 실험 지원",
      "개인화 메시지 발송 실행",
      "클라우드 이상행위 탐지",
      "테스트 자동화"
    ],
    "answerIndex": 0,
    "explanation": "Amplitude는 고객 행동 데이터 분석, 퍼널, 실험을 지원하는 프로덕트 분석 도구다.",
    "id": "ch13-term-quiz-2"
  },
  {
    "chapterId": "ch13",
    "type": "term",
    "prompt": "\"서드파티 쿠키\" 약화가 마케팅에 준 영향은?",
    "options": [
      "외부 추적 기반 광고 효율이 약해지고 자사 행동 데이터 활용이 중요해짐",
      "모든 광고 비용이 0원이 됨",
      "고객 행동 분석이 불필요해짐",
      "앱 푸시가 법적으로 금지됨"
    ],
    "answerIndex": 0,
    "explanation": "쿠키·ATT 제한으로 외부 추적 의존도가 낮아지고 자사 데이터 기반 리텐션·개인화가 중요해졌다.",
    "id": "ch13-term-quiz-3"
  },
  {
    "chapterId": "ch13",
    "type": "term",
    "prompt": "\"그로스 마케팅\"의 정의로 가장 적절한 것은?",
    "options": [
      "고객 행동 데이터를 기반으로 제품 경험과 전환을 지속 개선하는 성장 방법론",
      "대량 광고만 반복 발송하는 방식",
      "오프라인 매장만 운영하는 전략",
      "데이터 분석 없이 감으로만 의사결정"
    ],
    "answerIndex": 0,
    "explanation": "그로스 마케팅은 PM, 개발, 데이터, 마케팅이 함께 실험하고 학습하는 성장 방법론이다.",
    "id": "ch13-term-quiz-4"
  },
  {
    "chapterId": "ch13",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「고객 메시징, 캠페인 자동화, 개인화 마케팅 실행 플랫폼」",
    "options": [
      "Braze",
      "Amplitude",
      "Google Analytics",
      "Salesforce CRM"
    ],
    "answerIndex": 0,
    "explanation": "Braze는 메시징·캠페인 실행 마테크다. Amplitude는 행동 분석, Google Analytics는 웹 분석 도구다.",
    "id": "ch13-term-quiz-5"
  },
  {
    "chapterId": "ch13",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「프로덕트 내 고객 행동 분석과 실험을 지원하는 분석 플랫폼」",
    "options": [
      "Amplitude",
      "Braze",
      "Adobe Campaign",
      "Amazon Prime"
    ],
    "answerIndex": 0,
    "explanation": "Amplitude는 프로덕트 분석·실험 플랫폼이다. Braze는 실행, Amazon Prime은 유통·멤버십 서비스명이다.",
    "id": "ch13-term-quiz-6"
  },
  {
    "chapterId": "ch13",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「온·오프라인 등 모든 접점에서 일관되고 끊김 없는 고객 경험을 제공하는 전략」",
    "options": [
      "옴니채널",
      "유니파이드 커머스",
      "Amazon FBA",
      "그로스 마케팅"
    ],
    "answerIndex": 0,
    "explanation": "옴니채널은 접점 간 일관 경험 전략이다. 유니파이드 커머스는 데이터·로직 통합 모델, FBA는 아마존 물류 서비스명이다.",
    "id": "ch13-term-quiz-7"
  },
  {
    "chapterId": "ch13",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「제3자가 브라우저에 저장해 사용자 행동을 추적하는 데이터로, 규제로 활용이 제한되고 있다」",
    "options": [
      "서드파티 쿠키",
      "First-party Data",
      "IDFA",
      "옴니채널"
    ],
    "answerIndex": 0,
    "explanation": "서드파티 쿠키는 외부 추적용 데이터다. First-party Data는 자사 수집 데이터, IDFA는 iOS 광고 식별자다.",
    "id": "ch13-term-quiz-8"
  },
  {
    "chapterId": "ch13",
    "type": "term",
    "prompt": "다음 설명에 해당하는 용어는?\n\n「고객 행동 데이터를 기반으로 제품 경험과 전환을 지속 개선하는 성장 방법론」",
    "options": [
      "그로스 마케팅",
      "브랜드 마케팅",
      "퍼formance Max",
      "Clean Core"
    ],
    "answerIndex": 0,
    "explanation": "그로스 마케팅은 데이터·실험 기반 성장 방법론이다. Performance Max는 Google 광고 상품명이다.",
    "id": "ch13-term-quiz-9"
  }
]

export const dxInsightQuestions = [
  ['ch1', 'AX 전환의 성숙도를 판단할 때 가장 적절한 기준은?', ['AI 도구 사용률이 높고 챗봇 접점이 많다', '데이터 기반 업무가 AI 실행 흐름까지 연결된다', '전사 문서를 모두 디지털 파일로 보관한다', '반복 업무를 정해진 규칙으로 자동 처리한다'], 1, 'AX는 AI가 업무 판단과 실행 구조에 내재화되는 전환이다.'],
  ['ch2', 'Clean Core 전략을 가장 잘 설명한 것은?', ['핵심 코어를 표준화하고 확장은 분리한다', '현업 요청마다 코어 코드를 직접 고친다', '업그레이드보다 단기 개발 속도만 본다', '표준 프로세스보다 개별 예외를 우선한다'], 0, 'Clean Core는 핵심 ERP를 표준에 가깝게 유지해 확장성과 업그레이드성을 높인다.'],
  ['ch3', 'Zero Trust에서 “항상 검증”의 의미는?', ['최초 인증 후 내부 사용자를 계속 신뢰한다', '접근 맥락과 권한을 지속적으로 확인한다', 'VPN 접속자는 모든 자원에 접근시킨다', '내부망과 외부망을 명확히 나누면 충분하다'], 1, 'Zero Trust는 위치가 아니라 신원, 기기, 권한, 행위 맥락을 계속 검증한다.'],
  ['ch4', '품질 Gate의 핵심 목적은?', ['결함을 마지막 단계에서 한 번에 찾는다', '리스크가 다음 단계로 전이되는 것을 막는다', '테스트 시간을 줄여 배포 속도만 높인다', '품질 판단을 담당자 감각에 맡긴다'], 1, '품질 Gate는 단계별 기준으로 품질 리스크를 선제적으로 차단한다.'],
  ['ch5', 'AI Fabric이 해결하려는 병목은?', ['사용자 화면 렌더링 지연만 줄인다', 'GPU 간 데이터 동기화 지연을 줄인다', 'ERP 전표 입력 처리 지연만 줄인다', '고객 메시지 발송 지연만 줄인다'], 1, 'AI Fabric은 대규모 GPU 클러스터 내부의 동-서 트래픽 병목을 줄인다.'],
  ['ch6', '식품 전문 RAG가 중요한 이유는?', ['규제와 품질 답변에 근거와 출처가 필요하다', '창의적인 광고 문구만 빠르게 만들면 충분하다', '내부 지식을 AI에서 완전히 배제해야 한다', '검색 없이 생성 답변만 쓰는 것이 안전하다'], 0, '식품·바이오 영역은 규제, 품질, 안전 근거가 중요하므로 RAG가 유효하다.'],
  ['ch7', '디지털 트윈이 단순 대시보드와 구분되는 점은?', ['현실 데이터와 가상 검증을 운영에 되돌린다', '현재 상태를 화면 중심으로만 표시한다', '센서 데이터 없이 수동 입력만 사용한다', '운영 의사결정과 연결되지 않는 구조다'], 0, '디지털 트윈은 현실과 가상 사이의 데이터 순환과 예측·제어가 핵심이다.'],
  ['ch8', '유니파이드 커머스의 핵심 조건은?', ['데이터와 거래 로직을 하나의 체계로 통합한다', '온라인과 오프라인 가격 정책을 분리한다', '고객 이력을 채널마다 따로 관리한다', '재고 정보 동기화를 수동으로 유지한다'], 0, '유니파이드 커머스는 모든 접점의 상거래 로직과 데이터를 통합한다.'],
  ['ch9', 'VLM이 콘텐츠 운영에 주는 핵심 가치는?', ['장면의 의미를 이해해 검색과 재활용을 돕는다', '영상 파일을 단순 압축해 저장 공간만 줄인다', '텍스트 정보만 처리하고 시각 정보는 제외한다', '콘텐츠와 커머스 연결 가능성을 낮춘다'], 0, 'VLM은 이미지·영상의 맥락을 이해해 검색, 태깅, 추천, 커머스 연결에 활용된다.'],
  ['ch10', 'Trailvisi:ON이 주목하는 클라우드 위험은?', ['권한과 API 행위 기반의 이상 활동', '오프라인 출입증 발급 오류 신호', '마케팅 캠페인 반응 저하 신호', 'VFX 렌더링 품질 저하 신호'], 0, '클라우드에서는 인증 정보와 API 활동이 주요 보안 경계가 된다.'],
  ['ch11', 'VANTA VFX가 플랫폼이어야 하는 이유는?', ['제작 공정·리소스·데이터를 통합 관리한다', 'VFX 작업을 단일 작업자가 혼자 완료한다', '제작 데이터를 프로젝트마다 모두 폐기한다', '외주 협업 상태는 품질과 무관하게 본다'], 0, 'VFX 제작은 공정, 리소스, 협업이 복잡하므로 플랫폼 기반 관리가 필요하다.'],
  ['ch12', "O'testlab이 단순 매크로와 다른 점은?", ['AI 인식, 실제 기기, 결과 분석을 통합한다', '좌표 클릭만 반복하고 결과를 저장하지 않는다', '모바일 테스트를 수동으로만 수행한다', 'PC 환경 검증을 의도적으로 제외한다'], 0, "O'testlab은 테스트 생성, 수행, 실제 기기 검증, 결과 분석을 통합한다."],
  ['ch13', 'Braze와 Amplitude 연계의 핵심은?', ['행동 분석과 개인화 메시징 실행을 연결한다', '고객 행동 분석과 캠페인 실행을 분리한다', '모든 고객에게 같은 메시지를 반복 발송한다', '프로덕트 데이터를 마케팅에서 제외한다'], 0, 'Amplitude는 행동 분석, Braze는 개인화 메시징 실행을 담당해 분석-실행 흐름을 만든다.'],
].map(([chapterId, prompt, options, answerIndex, explanation], index) => ({
  id: `dx-q-${index + 1}`,
  chapterId,
  type: 'multiple',
  prompt,
  options,
  answerIndex,
  explanation,
}))

export function getChapterMeta(chapterId) {
  return dxInsightParts.flatMap((part) => part.chapters.map((chapter) => ({ ...chapter, partId: part.id, partTitle: part.title }))).find((chapter) => chapter.id === chapterId)
}

export function buildTermQuestions() {
  return dxInsightTermQuestions.map((question) => ({
    ...question,
    options: [...question.options],
  }))
}
