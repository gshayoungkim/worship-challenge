import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "365 가정예배 챌린지 🏠",
  description: "부활절 이후 13일간 가정예배 챌린지 - 매일 사진 인증과 출석체크로 예배 습관을 형성하세요!",
  openGraph: {
    title: "365 가정예배 챌린지 🏠",
    description: "부활절 이후 13일간 가정예배 챌린지 - 매일 사진 인증과 출석체크로 예배 습관을 형성하세요!",
    url: "https://365familyworship.com", 
    siteName: "365 가정예배 챌린지",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "365 가정예배 챌린지 로고",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Gaegu:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
