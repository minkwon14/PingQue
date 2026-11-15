export interface TemplateOption {
  id: string;
  label: string;
}

export interface TemplateStep {
  id: string;
  title: string;
  options: TemplateOption[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  roles: string[];
  /** Participants pick one option per step in order; the last step is the action. */
  steps: TemplateStep[];
}

export const TEMPLATES: Template[] = [
  {
    id: "worship",
    name: "찬양팀 · 밴드",
    description: "연습·예배 중 모니터 요청",
    roles: ["인도자", "보컬", "건반", "일렉 기타", "어쿠스틱 기타", "베이스", "드럼"],
    steps: [
      {
        id: "item",
        title: "무엇을?",
        options: [
          { id: "vocal", label: "보컬" },
          { id: "keyboard", label: "키보드" },
          { id: "guitar", label: "기타" },
          { id: "bass", label: "베이스" },
          { id: "drums", label: "드럼" },
          { id: "click", label: "클릭" },
        ],
      },
      {
        id: "where",
        title: "어디에서?",
        options: [
          { id: "my-monitor", label: "내 모니터" },
          { id: "in-ear", label: "인이어" },
          { id: "main", label: "메인 스피커" },
        ],
      },
      {
        id: "action",
        title: "어떻게?",
        options: [
          { id: "louder", label: "더 크게 ↑" },
          { id: "quieter", label: "더 작게 ↓" },
          { id: "mute", label: "빼 주세요" },
          { id: "problem", label: "이상해요" },
        ],
      },
    ],
  },
  {
    id: "podcast",
    name: "팟캐스트",
    description: "녹음 중 마이크·헤드폰 요청",
    roles: ["진행자", "게스트"],
    steps: [
      {
        id: "item",
        title: "무엇을?",
        options: [
          { id: "my-mic", label: "내 마이크" },
          { id: "headphone", label: "헤드폰" },
          { id: "guest-mic", label: "게스트 마이크" },
        ],
      },
      {
        id: "action",
        title: "어떻게?",
        options: [
          { id: "louder", label: "더 크게 ↑" },
          { id: "quieter", label: "더 작게 ↓" },
          { id: "noise", label: "잡음이 있어요" },
          { id: "pause", label: "잠깐 멈춰요" },
        ],
      },
    ],
  },
  {
    id: "broadcast",
    name: "방송 · 촬영",
    description: "스튜디오 출연자·스태프 신호",
    roles: ["출연자", "진행", "카메라", "오디오", "PD"],
    steps: [
      {
        id: "item",
        title: "무엇을?",
        options: [
          { id: "prompter", label: "프롬프터" },
          { id: "in-ear", label: "인이어" },
          { id: "light", label: "조명" },
          { id: "audio", label: "오디오" },
        ],
      },
      {
        id: "action",
        title: "어떻게?",
        options: [
          { id: "ready", label: "준비됐어요" },
          { id: "wait", label: "잠시만요" },
          { id: "again", label: "다시 한 번" },
          { id: "problem", label: "문제 있어요" },
        ],
      },
    ],
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
