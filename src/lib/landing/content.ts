import type { Lang } from "./lang";

// Landing page copy. Edit text here; both languages share the same shape.
// The "1시간 / 1 hour" room limit mirrors ROOM_TTL_MINUTES in src/lib/config.ts.

export interface LandingContent {
  meta: { title: string; description: string };
  nav: { features: string; how: string; start: string; menu: string };
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    create: string;
    join: string;
    note: string;
    hostCaption: string;
    participantCaption: string;
    lamps: [string, string, string];
    hostAlt: string;
    participantAlt: string;
  };
  where: {
    title: string;
    intro: string;
    items: { title: string; text: string; examples: string[] }[];
    extra: string;
  };
  features: { title: string; intro: string; items: { title: string; text: string }[] };
  how: { title: string; intro: string; steps: { title: string; text: string }[] };
  cta: { title: string; text: string; button: string };
  footer: { tagline: string };
}

const ko: LandingContent = {
  meta: {
    title: "TapCue - 현장에서 말 없이, 탭 한 번으로 요청하세요",
    description:
      "공연, 촬영, 예배 현장에서 가입 없이 QR 하나로 참가하고, 탭 한 번으로 요청을 보내면 호스트가 확인해 주는 실시간 신호 도구예요.",
  },
  nav: { features: "기능", how: "사용 방법", start: "시작하기", menu: "메뉴" },
  hero: {
    badge: "라이브, 촬영, 예배 현장용",
    title: "현장에서 말 없이, 탭 한 번으로 요청하고 확인받으세요",
    subtitle:
      "무대, 음향, 조명, 영상 팀이 서로 방해하지 않고 요청을 주고받아요. 가입 없이 QR로 참가하고, 호스트가 확인하면 바로 알려드려요.",
    create: "방 만들기",
    join: "코드로 참가",
    note: "가입 없이 무료로 쓰고, 방은 1시간 뒤 자동으로 닫혀요.",
    hostCaption: "호스트 화면(태블릿)",
    participantCaption: "참가자 화면(휴대폰)",
    lamps: ["접수", "확인", "완료"],
    hostAlt: "TapCue 호스트 화면: 공지 보내기와 대기 중인 요청",
    participantAlt: "TapCue 참가자 화면: 요청 버튼과 내 요청 상태",
  },
  where: {
    title: "이런 현장에 잘 맞아요",
    intro: "말하기 어려운 순간에도, 필요한 요청을 조용히 정확하게 전달해요.",
    items: [
      {
        title: "공연 · 라이브 이벤트",
        text: "무대 위 연주자와 음향, 조명, 진행 크루가 소리 없이 요청을 주고받아요.",
        examples: ["모니터 더 크게", "화면 확인해 주세요"],
      },
      {
        title: "스튜디오 · 촬영 · 방송",
        text: "녹음과 촬영 중에도 방해 없이 출연자와 스태프가 신호를 보내요.",
        examples: ["마이크 확인", "조명 조금 낮춰 주세요"],
      },
      {
        title: "교회 · 예배 미디어팀",
        text: "찬양팀, 음향, 영상 팀이 예배 흐름을 끊지 않고 요청해요.",
        examples: ["인이어 더 크게", "자막 확인"],
      },
    ],
    extra: "세미나, 워크숍, 밋업, 수업에서도 똑같이 쓸 수 있어요.",
  },
  features: {
    title: "꼭 필요한 기능만 담았어요",
    intro: "복잡한 설정 없이, 현장에서 바로 쓰도록 만들었어요.",
    items: [
      {
        title: "실시간 요청 · 확인 · 완료",
        text: "참가자가 보낸 요청은 호스트 화면에 바로 떠요. 호스트가 확인하고 완료하면 참가자도 상태를 실시간으로 봐요.",
      },
      {
        title: "가입 없이 QR · 링크 · 코드로 참가",
        text: "QR을 찍거나 링크를 열거나 코드를 입력하면 끝이에요. 앱 설치도, 계정도 필요 없어요.",
      },
      {
        title: "내 방에 맞는 요청 버튼",
        text: "호스트가 방의 요청 버튼을 직접 고치고, 참가자는 자기만의 버튼도 따로 만들 수 있어요.",
      },
      {
        title: "모두에게 공지",
        text: "호스트가 한 번에 공지를 보내면 모든 참가자 화면에 떠요. 받은 공지는 목록으로 다시 볼 수 있어요.",
      },
      {
        title: "접속 인원과 연결 상태",
        text: "지금 몇 명이 연결돼 있는지, 내 연결은 괜찮은지 한눈에 보여요.",
      },
      {
        title: "1시간 뒤 자동 종료 (무료)",
        text: "방은 만든 지 1시간이 지나면 자동으로 닫혀요. 정리할 것이 남지 않아요.",
      },
    ],
  },
  how: {
    title: "사용 방법은 3단계",
    intro: "1분이면 현장에 준비가 끝나요.",
    steps: [
      { title: "방 만들기", text: "호스트가 방을 만들어요. 가입도 로그인도 없어요." },
      { title: "QR · 링크 공유", text: "QR 코드나 링크, 참가 코드를 팀원에게 보여 주고 공유해요." },
      { title: "요청 보내고 처리하기", text: "참가자는 탭 한 번으로 요청하고, 호스트는 확인하고 완료해요." },
    ],
  },
  cta: {
    title: "지금 시작하기",
    text: "방을 만들고 QR만 보여 주세요. 가입은 필요 없어요.",
    button: "시작하기",
  },
  footer: { tagline: "터치 한 번으로 보내는 현장 실시간 신호" },
};

const en: LandingContent = {
  meta: {
    title: "TapCue - Send a request with one tap, no words needed",
    description:
      "A real-time signaling tool for live shows, shoots and worship services. Join with a QR code, no sign-up, send a request with one tap and the host confirms it.",
  },
  nav: { features: "Features", how: "How it works", start: "Get started", menu: "Menu" },
  hero: {
    badge: "For live events, shoots and worship",
    title: "Ask without a word. Send a request with one tap and get it confirmed.",
    subtitle:
      "Stage, sound, lighting and video crews pass requests along without disturbing anyone. Join by QR with no sign-up, and the host confirms each request right away.",
    create: "Create a room",
    join: "Join with a code",
    note: "Free, with no sign-up. Rooms close on their own after 1 hour.",
    hostCaption: "Host screen (tablet)",
    participantCaption: "Participant screen (phone)",
    lamps: ["Received", "Confirmed", "Done"],
    hostAlt: "TapCue host screen: announcements and a waiting request",
    participantAlt: "TapCue participant screen: request buttons and my request status",
  },
  where: {
    title: "Built for the moments you can't speak up",
    intro: "Get the right request to the right person, quietly and clearly.",
    items: [
      {
        title: "Live shows & events",
        text: "Performers on stage and the sound, lighting and production crew trade requests in silence.",
        examples: ["Monitor louder", "Check the screen"],
      },
      {
        title: "Studios, film & broadcast",
        text: "Talent and crew can signal each other during a take without interrupting it.",
        examples: ["Check my mic", "Lights a bit lower"],
      },
      {
        title: "Church & worship media teams",
        text: "Worship band, sound and video teams make requests without breaking the flow of the service.",
        examples: ["In-ear louder", "Check the lyrics"],
      },
    ],
    extra: "It works just as well for seminars, workshops, meetups and classes.",
  },
  features: {
    title: "Only what you actually need",
    intro: "No complicated setup. Made to work the moment you walk in.",
    items: [
      {
        title: "Live requests, confirmed and completed",
        text: "A request shows up on the host screen instantly. When the host confirms and completes it, the sender sees the status in real time.",
      },
      {
        title: "Join by QR, link or code, no sign-up",
        text: "Scan the QR, open the link or type the code. No app to install and no account to create.",
      },
      {
        title: "Request buttons that fit your room",
        text: "The host edits the room's request buttons, and each participant can add personal buttons of their own.",
      },
      {
        title: "Announcements to everyone",
        text: "The host sends one announcement and it appears on every participant's screen. Received announcements stay in a list.",
      },
      {
        title: "Who's connected, and your connection",
        text: "See how many people are connected and whether your own connection is healthy at a glance.",
      },
      {
        title: "Auto-closes after 1 hour (free)",
        text: "A room closes by itself one hour after it's created, so there's nothing to clean up.",
      },
    ],
  },
  how: {
    title: "How it works in 3 steps",
    intro: "Ready on site in about a minute.",
    steps: [
      { title: "Create a room", text: "The host creates a room. No sign-up, no login." },
      { title: "Share the QR or link", text: "Show or send the QR code, link or join code to your team." },
      { title: "Send and handle requests", text: "Participants request with one tap; the host confirms and completes." },
    ],
  },
  cta: {
    title: "Get started now",
    text: "Create a room and show the QR code. No sign-up needed.",
    button: "Get started",
  },
  footer: { tagline: "Real-time signals for the room, one tap at a time" },
};

export const LANDING_CONTENT: Record<Lang, LandingContent> = { ko, en };
