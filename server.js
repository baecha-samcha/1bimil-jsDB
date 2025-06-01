const express = require("express");
const app = express();
const PORT = 3000;

// 템플릿 엔진 설정
app.set("view engine", "pug");
app.set("views", "./views");

// public 폴더 정적 파일(css, 이미지 등) 사용
app.use(express.static("public"));

// 기본 라우트
app.get("/", (req, res) => {
  res.render("index", { title: "1급비밀" });
});

// 포트 리스닝
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

app.get("/mypage", (req, res) => {
  res.render("mypage", { title: "마이페이지" });
});

app.get("/board", (req, res) => {
  const posts = [];


  res.render("board", { title: "글 게시판", posts });
});

app.get("/board/:id", (req, res) => {
  const post = {};

  res.render("post", { title: post.title, post });
});

app.get("/write", (req, res) => {
  res.render("write", { title: "글쓰기" });
});

app.post("/write", (req, res) => {
  // 나중에 DB 처리하면 여기에서 저장
  res.send("작성 완료 (임시)");
});

app.get("/admin", (req, res) => {
  res.render("admin", { title: "관리자 페이지" });
});

app.get("/photo", (req, res) => {
  const photos = [];

  res.render("photo", { title: "사진 게시판", photos });
});


app.get("/photo/write", (req, res) => {
  console.log("🔥 photo-write 진입"); // 추가
  res.render("photo-write", { title: "사진 등록" });
});


app.get("/photo", (req, res) => {
  res.render("photo", { title: "사진 게시판" });
});

app.get("/photo/write", (req, res) => {
  res.render("photo-write", { title: "사진 등록" });
});

app.post("/photo/write", (req, res) => {
  // 실제 업로드는 생략. 그냥 완료 처리
  res.send("사진 등록 완료!");
});

app.get("/emoji", (req, res) => {
  const emojis = [];
  res.render("emoji", { title: "이모티콘", emojis });
});

app.get("/emoji/:id", (req, res) => {
  res.render("emoji-detail", { title: "이모티콘 상세" });
});

app.get("/emoji-write", (req, res) => {
  res.render("emoji-write", { title: "이모티콘 만들기" });
});

app.post("/emoji-write", (req, res) => {
  res.send("이모티콘 생성 완료 (임시)");
});

app.get("/login", (req, res) => {
  res.render("login", { title: "로그인" });
});

app.post("/login", (req, res) => {
  // 실제 로그인 로직은 나중에 구현
  res.send("로그인 처리됨 (임시)");
});
