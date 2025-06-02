const express = require("express");
const { supabase } = require("./supabase");
const path = require("path");
const cookieParser = require("cookie-parser");
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

require("dotenv").config();

const app = express();
const PORT = 3000;

app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 템플릿 엔진 설정
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// 정적 파일 제공
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 🔹 홈
app.get("/", (req, res) => {
  res.render("index", { title: "1급비밀" });
});

app.get("/mypage", async (req, res) => {
  const { user_id } = req.cookies;

  if (!user_id) {
    return res.status(401).send("로그인이 필요합니다.");
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("username, nickname, password")
    .eq("id", user_id)
    .single();

  const maskedPassword = "●".repeat(user.password.length);

  // 🔹 이모지 목록 가져오기 (없으면 []로)
  const { data: emojis, error: emojiErr } = await supabase
    .from("emojis")
    .select("*")
    .eq("user_id", user_id); // ← 조건은 필요에 따라

  res.render("mypage", {
    title: "마이페이지",
    user,
    maskedPassword,
    emojis: emojis || [],  // ← 이 줄이 핵심!
  });
});

app.post("/mypage/username", async (req, res) => {
  const user_id = req.cookies.user_id;
  const { new_username } = req.body;
  if (!user_id) return res.redirect("/login");

  const { error } = await supabase
    .from("users")
    .update({ username: new_username })
    .eq("id", user_id);

  if (error) return res.status(500).send("아이디 변경 실패");

  res.cookie("user_id", user_id, { httpOnly: true });
  res.redirect("/mypage");
});

app.post("/mypage/nickname", async (req, res) => {
  const user_id = req.cookies.user_id;
  const { new_nickname } = req.body;
  if (!user_id) return res.redirect("/login");

  const { error } = await supabase
    .from("users")
    .update({ nickname: new_nickname })
    .eq("id", user_id);

  if (error) return res.status(500).send("닉네임 변경 실패");

  res.cookie("nickname", new_nickname, { httpOnly: true });
  res.redirect("/mypage");
});

app.post("/mypage/password", async (req, res) => {
  const user_id = req.cookies.user_id;
  const { new_password } = req.body;
  if (!user_id) return res.redirect("/login");

  const { error } = await supabase
    .from("users")
    .update({ password: new_password })
    .eq("id", user_id);

  if (error) return res.status(500).send("비밀번호 변경 실패");

  res.redirect("/mypage");
});


// 🔹 글 게시판 (임시)
app.get("/board", (req, res) => {
  const posts = [];
  res.render("board", { title: "글 게시판", posts });
});

app.get("/board/:id", (req, res) => {
  const post = {};
  res.render("post", {
    title: post.title,
    item: post,
    type: "post", // ← 이거 필수!
    comments: commentsWithNickname,
});

});

app.get("/write", (req, res) => {
  res.render("write", { title: "글쓰기" });
});

app.post("/write", (req, res) => {
  res.send("작성 완료 (임시)");
});

// 🔹 관리자
app.get("/admin", (req, res) => {
  res.render("admin", { title: "관리자 페이지" });
});

app.get("/photo", async (req, res) => {
  const { data: photos, error } = await supabase
    .from("photos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ 사진 목록 오류:", error.message);
    return res.status(500).send("사진 목록을 불러올 수 없습니다.");
  }

  res.render("photo", { title: "사진 게시판", photos });
});

app.get("/photo/:id", async (req, res) => {
  const { id } = req.params;
  const user_id = req.cookies.user_id; // ← 로그인 상태면 이거 있음

  const { data: photo, error } = await supabase
    .from("photos")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !photo) {
    console.error("❌ 상세 페이지 오류:", error?.message);
    return res.status(404).send("사진을 찾을 수 없습니다.");
  }

  const { data: commentsRaw } = await supabase
    .from("comments")
    .select("*")
    .eq("target_type", "photo")
    .eq("target_id", id)
    .order("created_at", { ascending: true });

  const commentsSafe = commentsRaw || [];
  const userIds = [...new Set(commentsSafe.map(c => c.user_id).filter(Boolean))];

  const { data: users } = await supabase
    .from("users")
    .select("id, nickname")
    .in("id", userIds);

  const userMap = Object.fromEntries(users.map(u => [u.id, u.nickname]));

  const commentsWithNickname = commentsSafe.map(c => ({
    ...c,
    nickname: userMap[c.user_id] || "알 수 없음",
  }));

  // ✅ 이모지 불러오기
  let emojis = [];
  if (user_id) {
    const { data: emojiData } = await supabase
      .from("emojis")
      .select("*")
      .eq("user_id", user_id);

    emojis = emojiData || [];
  }

  res.render("photo-detail", {
    title: photo.title,
    item: photo,
    type: "photo",
    comments: commentsWithNickname,
    emojis, // ← 이 줄만 추가하면 끝!
  });
});

app.get("/photo/write", (req, res) => {
  res.render("photo-write", { title: "사진 등록" });
});

// 🔹 사진 등록 처리
app.post("/photo/write", async (req, res) => {
  const { title, description } = req.body;

  const { error } = await supabase.from("photos").insert([
    {
      title,
      description: description?.split("\n") || [],
      likes: 0,
      dislikes: 0,
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error("❌ 등록 실패:", error.message);
    return res.status(500).send("사진 등록 실패");
  }

  res.redirect("/photo");
});

// 🔹 좋아요 처리
app.post("/photo/:id/like", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("photos")
    .update({})
    .eq("id", id)
    .increment({ likes: 1 });

  if (error) {
    console.error("❌ 좋아요 실패:", error.message);
    return res.status(500).send("좋아요 실패");
  }

  res.redirect("/photo");
});

// 🔹 싫어요 처리
app.post("/photo/:id/dislike", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("photos")
    .update({})
    .eq("id", id)
    .increment({ dislikes: 1 });

  if (error) {
    console.error("❌ 싫어요 실패:", error.message);
    return res.status(500).send("싫어요 실패");
  }

  res.redirect("/photo");
});

app.get("/emoji", async (req, res) => {
  const { data: emojis } = await supabase.from("emoji_sets").select("*");
  res.render("emoji", {
    title: "이모티콘",
    emojis,
    success: req.query.success,
  });
});

app.get("/emoji/:id", async (req, res) => {
  const { id } = req.params;

  const { data: emojiSet, error } = await supabase
    .from("emoji_sets")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !emojiSet) {
    console.error("❌ 이모지 상세 오류:", error?.message);
    return res.status(404).send("이모지를 찾을 수 없습니다.");
  }
console.log("image_urls", emojiSet.image_urls, Array.isArray(emojiSet.image_urls));
  emojiSet.image_urls = emojiSet.image_urls ?? [];
  res.render("emoji-detail", {
    title: emojiSet.title,
    emoji: emojiSet,
  
  });
});

app.get("/emoji-write", (req, res) => {
  res.render("emoji-write", { 
    title: "이모티콘 만들기",
    success: req.query.success
  });
});

app.post("/emoji-write", upload.fields([
  { name: "cover", maxCount: 1 },
  { name: "images", maxCount: 50 }
]), async (req, res) => {
  const title = req.body["emoji-title"];
  const explanation = req.body["explanation"];
  const cover = req.files.cover?.[0];
  const images = req.files.images || [];

  const image_urls = images.map(file => `/uploads/${file.filename}`);

  const { error } = await supabase.from("emoji_sets").insert([
    {
      title,
      explanation: explanation || null,
      cover_url: cover ? `/uploads/${cover.filename}` : null,
      image_urls: image_urls,  // ✅ 이 줄 추가
    },
  ]);


  if (error) {
    console.error("❌ 이모지 등록 실패:", error.message);
    return res.status(500).send("등록 실패");
  }

  res.redirect('/emoji?success=1');
});

app.get("/login", (req, res) => {
  res.render("login", { title: "로그인" });
});

app.post("/login", async (req, res) => {
  const { id, pw } = req.body;

  const { data: users, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", id)
    .eq("password", pw);

  if (error || users.length === 0) {
    return res.status(401).send("❌ 로그인 실패: 아이디 또는 비밀번호가 틀렸습니다.");
  }

  const user = users[0];

  // 로그인 성공 시 쿠키에 사용자 정보 저장
  res.cookie("user_id", user.id, { httpOnly: true });
  res.cookie("nickname", user.nickname, { httpOnly: true });

  res.redirect("/"); // 로그인 후 홈으로 이동
});


app.post("/:type/:id/comment", async (req, res) => {
  const { type, id: target_id } = req.params;
  const { comment: content } = req.body;
  const user_id = req.cookies.user_id;

  if (!['photo', 'post'].includes(type)) {
    return res.status(400).send("잘못된 타입입니다");
  }

  if (!user_id) {
    return res.status(401).send("로그인이 필요합니다");
  }

  const { error } = await supabase.from("comments").insert([
    {
      target_type: type,
      target_id,
      user_id, // 🔥 이 줄 추가!
      content,
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error("❌ 댓글 등록 실패:", error.message);
    return res.status(500).send("댓글 등록 실패");
  }

  res.redirect(`/${type}/${target_id}`);
});

// 🔹 서버 실행
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
