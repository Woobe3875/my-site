/* ============================================================
   blog-features.js
   UI 모듈 통합 + Supabase 데이터베이스 & 영단어 퀴즈 시스템
   ============================================================ */

/* ============================================================
   [UI] ① 다크 모드 전환 (즉시 실행)
   ============================================================ */
(function initTheme() {
  const STORAGE_KEY = "theme";
  const toggleBtn   = document.getElementById("theme-toggle");
  const root        = document.documentElement;

  function getPreferredTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (toggleBtn) {
      toggleBtn.setAttribute("aria-label", theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환");
      const label = toggleBtn.querySelector(".toggle-label");
      if (label) label.textContent = theme === "dark" ? "라이트 모드" : "다크 모드";
    }
  }

  function toggleTheme() {
    const current = root.getAttribute("data-theme") || "light";
    const next    = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  applyTheme(getPreferredTheme());
  if (toggleBtn) toggleBtn.addEventListener("click", toggleTheme);

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) applyTheme(e.matches ? "dark" : "light");
  });
})();

/* ============================================================
   [UI] ② 맨 위로 가기 버튼 (즉시 실행)
   ============================================================ */
(function initScrollToTop() {
  const btn = document.getElementById("scroll-to-top");
  if (!btn) return;
  const SHOW_THRESHOLD = 300;
  function onScroll() {
    if (window.scrollY > SHOW_THRESHOLD) btn.classList.add("visible");
    else btn.classList.remove("visible");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  onScroll();
})();


/* ============================================================
   [UI] ③ 목차 및 코드 렌더링 (본문 변경 시 재실행을 위해 전역화)
   ============================================================ */
window.initTOC = function() {
  const sidebar = document.getElementById("toc-sidebar");
  if (!sidebar) return;
  const contentEl = document.getElementById("post-body"); // 본문 영역
  if (!contentEl) return;

  const headings = Array.from(contentEl.querySelectorAll("h2, h3"));
  if (headings.length === 0) { sidebar.style.display = "none"; return; }
  else { sidebar.style.display = "block"; }

  headings.forEach((h, i) => {
    if (!h.id) h.id = h.textContent.trim().toLowerCase().replace(/[\s]+/g, "-").replace(/[^\w\uAC00-\uD7A3-]/g, "") || `heading-${i}`;
  });

  const ul = sidebar.querySelector("ul") || document.createElement("ul");
  ul.innerHTML = ""; 

  headings.forEach((h) => {
    const level = parseInt(h.tagName[1], 10);
    const li    = document.createElement("li");
    li.dataset.level = level;
    const a = document.createElement("a");
    a.href        = `#${h.id}`;
    a.textContent = h.textContent.trim();
    a.dataset.id  = h.id;

    a.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.getElementById(h.id);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.pushState(null, "", `#${h.id}`);
      }
    });
    li.appendChild(a); ul.appendChild(li);
  });
  if (!sidebar.querySelector("ul")) sidebar.appendChild(ul);

  const tocLinks = Array.from(sidebar.querySelectorAll("a"));
  if(window.tocObserver) window.tocObserver.disconnect(); // 이전 감시자 초기화
  
  window.tocObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        tocLinks.forEach((a) => a.classList.remove("toc-active"));
        const activeLink = sidebar.querySelector(`a[data-id="${entry.target.id}"]`);
        if (activeLink) {
          activeLink.classList.add("toc-active");
          activeLink.scrollIntoView({ block: "nearest" });
        }
      }
    });
  }, { rootMargin: "-10% 0px -70% 0px", threshold: 0 });

  headings.forEach((h) => window.tocObserver.observe(h));
};

window.initCodeCopy = function() {
  const preElements = document.querySelectorAll("pre");
  if (preElements.length === 0) return;

  const ICON_COPY = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const ICON_CHECK = `<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;

  preElements.forEach((pre) => {
    if (pre.parentElement?.classList.contains("code-wrapper")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "code-wrapper";
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const codeEl = pre.querySelector("code");
    if (codeEl) {
      const langClass = Array.from(codeEl.classList).find((c) => c.startsWith("language-"));
      if (langClass) {
        const lang  = langClass.replace("language-", "");
        const badge = document.createElement("span");
        badge.className   = "code-lang-badge";
        badge.textContent = lang;
        wrapper.appendChild(badge);
      }
    }

    const copyBtn = document.createElement("button");
    copyBtn.className   = "copy-btn";
    copyBtn.innerHTML   = `${ICON_COPY}<span>복사</span>`;
    copyBtn.setAttribute("type", "button");
    wrapper.appendChild(copyBtn);

    copyBtn.addEventListener("click", async () => {
      const textToCopy = codeEl ? codeEl.innerText : pre.innerText;
      try { await navigator.clipboard.writeText(textToCopy); } 
      catch {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy; textarea.style.position = "fixed"; textarea.style.opacity = "0";
        document.body.appendChild(textarea); textarea.select(); document.execCommand("copy"); document.body.removeChild(textarea);
      }
      copyBtn.innerHTML = `${ICON_CHECK}<span>복사됨!</span>`;
      copyBtn.classList.add("copied"); copyBtn.disabled = true;
      setTimeout(() => {
        copyBtn.innerHTML = `${ICON_COPY}<span>복사</span>`;
        copyBtn.classList.remove("copied"); copyBtn.disabled = false;
      }, 2000);
    });
  });
};


/* ============================================================
   [DATA] ④ 클라우드 DB 연동 및 단어 퀴즈 통합 로직
   ============================================================ */

// 💡 Supabase 인증 정보
const SUPABASE_URL = 'https://본인의프로젝트주소.supabase.co';
const SUPABASE_KEY = '본인의_anon_public_키값';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let quizState = { isActive: false, words: [], currentIdx: 0, score: 0, showResult: false, lastAnswerCorrect: false, currentInputValue: '' };

async function getDBItem(key) {
  const { data, error } = await supabaseClient.from('blog_storage').select('value').eq('id', key).single();
  if (error || !data) return null;
  return data.value;
}

async function setDBItem(key, value) {
  const { error } = await supabaseClient.from('blog_storage').upsert({ id: key, value: value });
  if (error) console.error('DB 저장 실패:', error);
}

// ── 본문 로드 & 단어장 분기 처리 ──
window.loadContent = async function(pageId) {
  const content = await getDBItem('blog_content') || {};
  const d = content[pageId] || null;
  const navItem = document.querySelector(`.nav-item[data-page="${pageId}"] .nav-label`);
  const pageTitle = navItem ? navItem.innerText.trim() : '';

  // 1. 단어장 시스템 작동 조건
  if (pageTitle === '영어 단어장' || pageId === 'wordbook') {
    document.getElementById('post-category').innerText = 'Study';
    document.getElementById('post-title').innerText    = '나만의 영어 단어장 📝';
    document.getElementById('post-date').innerText     = quizState.isActive ? '🔥 퀴즈 테스트 진행 중' : '실시간 단어 암기 모드';
    
    let words = d && d.wordList ? d.wordList : [];

    if (quizState.isActive) {
      if (quizState.currentIdx >= quizState.words.length) {
        let scorePercent = Math.round((quizState.score / quizState.words.length) * 100);
        let feedback = "훌륭합니다! 완벽하게 외우셨네요! 🎉";
        if (scorePercent < 50) feedback = "조금 더 연습해 볼까요? 💪";
        else if (scorePercent < 90) feedback = "아까운 오답이 있네요! 복습해 봐요! 👍";

        document.getElementById('post-body').innerHTML = `
          <div class="quiz-container text-center">
            <h2>🏆 퀴즈 테스트 결과</h2>
            <p class="quiz-score-text">${quizState.words.length}문제 중 <strong>${quizState.score}</strong>문제 적중!</p>
            <div class="quiz-progress-bar-container"><div class="quiz-progress-bar" style="width: ${scorePercent}%"></div></div>
            <p class="quiz-feedback">${feedback}</p>
            <button class="quiz-btn primary" onclick="exitQuiz('${pageId}')">단어장으로 돌아가기</button>
          </div>
        `;
        return;
      }

      const currentWord = quizState.words[quizState.currentIdx];
      let actionHtml = !quizState.showResult ? `
          <div class="quiz-input-group">
            <input type="text" id="quiz-answer-input" placeholder="뜻을 정확하게 입력하세요" onkeydown="if(event.key==='Enter') submitQuizAnswer('${pageId}')" value="${quizState.currentInputValue}">
            <button class="quiz-btn primary" onclick="submitQuizAnswer('${pageId}')">정답 확인</button>
          </div>
        ` : `
          <div class="quiz-result-box ${quizState.lastAnswerCorrect ? 'correct' : 'wrong'}">
            <p class="result-status">${quizState.lastAnswerCorrect ? '⭕ 정답입니다!' : '❌ 아쉽게도 틀렸습니다!'}</p>
            <p class="result-detail">제출한 답변: <strong>${quizState.currentInputValue}</strong></p>
            <p class="result-detail">올바른 정답: <strong style="text-decoration: underline;">${currentWord.meaning}</strong></p>
          </div>
          <button class="quiz-btn success" onclick="nextQuizQuestion('${pageId}')">
            ${quizState.currentIdx === quizState.words.length - 1 ? '🎉 종합 결과 보기' : '다음 문제 풀기 ➡️'}
          </button>
        `;

      document.getElementById('post-body').innerHTML = `
        <div class="quiz-container">
          <div class="quiz-header"><span>🎯 영단어 퀴즈 자가진단</span><span class="quiz-count">진행도: ${quizState.currentIdx + 1} / ${quizState.words.length}</span></div>
          <div class="quiz-card-box"><h1 class="quiz-question-word">${currentWord.word}</h1></div>
          ${actionHtml}
          <div style="text-align: right; margin-top: 24px;"><button class="quiz-btn danger-outline" onclick="exitQuiz('${pageId}')">퀴즈 나가기 (포기)</button></div>
        </div>
      `;
      if (!quizState.showResult) setTimeout(() => document.getElementById('quiz-answer-input')?.focus(), 50);
      return;
    }

    document.getElementById('post-body').innerHTML = `
      <div class="wordbook-actions">
        <p style="margin:0;">카드를 클릭하면 단어 뜻이 보입니다. 등록된 단어로 무작위 테스트를 볼 수 있습니다.</p>
        <button class="quiz-start-btn" onclick="startQuizMode('${pageId}')">🎯 퀴즈 테스트 시작</button>
      </div>
      <div class="wordbook-container">
        <div class="word-inputs">
          <input type="text" id="input-word" placeholder="English Word" onkeydown="if(event.key==='Enter') addWordToBook('${pageId}')">
          <input type="text" id="input-meaning" placeholder="뜻" onkeydown="if(event.key==='Enter') addWordToBook('${pageId}')">
          <button onclick="addWordToBook('${pageId}')">추가</button>
        </div>
        <div class="card-grid">
          ${words.map((w, idx) => `
            <div class="word-card" onclick="this.classList.toggle('flipped')">
              <button class="card-del-btn" onclick="event.stopPropagation(); delWordFromBook('${pageId}', ${idx})">×</button>
              <div class="card-inner"><div class="card-front">${w.word}</div><div class="card-back">${w.meaning}</div></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    return;
  }

  // 2. 일반 포스트 렌더링 시스템
  if (!d) {
    document.getElementById('post-category').innerText = '새 글';
    document.getElementById('post-title').innerText    = '새 페이지';
    document.getElementById('post-body').innerHTML     = '<p>내용을 작성해 주세요.</p>';
  } else {
    document.getElementById('post-category').innerText = d.category || '';
    document.getElementById('post-title').innerText    = d.title    || '';
    document.getElementById('post-date').innerText     = d.date     || '';
    document.getElementById('post-body').innerHTML     = d.body     || '';
  }

  // 본문 렌더링 완료 후 UI 편의기능(복사, 목차) 재설정 트리거
  if(window.initCodeCopy) window.initCodeCopy();
  if(window.initTOC) window.initTOC();
}

// ── 단어 관리 함수 ──
window.addWordToBook = async function(pageId) {
  const word = document.getElementById('input-word').value.trim();
  const meaning = document.getElementById('input-meaning').value.trim();
  if(!word || !meaning) return alert('단어와 뜻을 입력하세요!');
  const content = await getDBItem('blog_content') || {};
  if (!content[pageId]) content[pageId] = { category: 'Study', title: '나만의 영어 단어장 📝', date: '실시간 단어 암기 모드', body: '' };
  if (!content[pageId].wordList) content[pageId].wordList = [];
  content[pageId].wordList.push({ word, meaning });
  await setDBItem('blog_content', content);
  window.loadContent(pageId);
};

window.delWordFromBook = async function(pageId, index) {
  if(!confirm('삭제하시겠습니까?')) return;
  const content = await getDBItem('blog_content') || {};
  content[pageId].wordList.splice(index, 1);
  await setDBItem('blog_content', content);
  window.loadContent(pageId);
};

// ── 퀴즈 엔진 함수 ──
window.startQuizMode = async function(pageId) {
  const content = await getDBItem('blog_content') || {};
  const words = content[pageId]?.wordList || [];
  if (words.length === 0) return alert("단어를 먼저 추가해 주세요!");
  quizState = { isActive: true, words: words.map(a => ({sort: Math.random(), val: a})).sort((a,b)=>a.sort-b.sort).map(a=>a.val), currentIdx: 0, score: 0, showResult: false, currentInputValue: '' };
  window.loadContent(pageId);
};

window.submitQuizAnswer = function(pageId) {
  const inputEl = document.getElementById('quiz-answer-input');
  if (!inputEl || !inputEl.value.trim()) return alert('뜻을 적어주세요!');
  quizState.currentInputValue = inputEl.value.trim();
  const correct = quizState.words[quizState.currentIdx].meaning.toLowerCase().replace(/\s+/g, '');
  if (quizState.currentInputValue.toLowerCase().replace(/\s+/g, '') === correct) { quizState.score++; quizState.lastAnswerCorrect = true; } 
  else { quizState.lastAnswerCorrect = false; }
  quizState.showResult = true;
  window.loadContent(pageId);
};

window.nextQuizQuestion = function(pageId) { quizState.currentIdx++; quizState.showResult = false; quizState.currentInputValue = ''; window.loadContent(pageId); };
window.exitQuiz = function(pageId) { quizState.isActive = false; window.loadContent(pageId); };
