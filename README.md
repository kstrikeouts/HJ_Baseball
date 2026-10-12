# HJ Baseball — 광주화정유소년야구단 대시보드

https://kstrikeouts.github.io/HJ_Baseball/

최신 대회 하나만 표시합니다.

## 구조

```
index.html          화면 틀
assets/app.css      스타일
assets/app.js       공통 엔진 (일정·라인업·날씨·카드 저장)
data/roster.json    선수 명단 (이름 + 등번호)
data/current.json   현재 표시 중인 대회
data/archive/       지난 대회 보관 (화면에는 표시 안 됨)
```

## 대회 교체

1. `data/current.json` 을 `data/archive/` 로 옮긴다
2. 새 대회 JSON 을 `data/current.json` 으로 저장한다

엔진 수정은 `assets/app.js` 한 곳만 고치면 된다.

## 개인정보

웹에 올리는 선수 정보는 **이름과 등번호만**.
생년월일·출신학교는 저장하지 않는다.
