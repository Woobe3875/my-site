/* ============================================================
   blog-features.js
   GitHub Pages 블로그용 기능 스크립트 (Vanilla JS)
   ─────────────────────────────────────────────────────────────
   포함된 기능:
     1. 다크 모드 전환 (LocalStorage 기억)
     2. 자동 목차 생성 + 스크롤 하이라이트 (IntersectionObserver)
     3. 맨 위로 가기 버튼
     4. 코드 블록 복사 버튼 (Clipboard API)

   사용법:
     </body> 바로 위에 <script src="blog-features.js"></script>
   ============================================================ */

/* ============================================================
   ① 다크 모드 전환
   ─────────────────────────────────────────────────────────────
   - data-theme 속성을 <html> 태그에 적용
   - localStorage에 "theme" 키로 기억
   - 미디어 쿼리(prefers-color-scheme)도 존중
   ============================================================ */

(function initTheme() {
  const STORAGE_KEY = "theme"; // localStorage 키 이름
  const toggleBtn   = document.getElementById("theme-toggle");
  const root        = document.documentElement; // <html> 요소

  // ── 현재 적용할 테마 결정 ──────────────────────────────────
  function getPreferredTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved; // 저장된 값 우선
    // OS/브라우저 다크 모드 선호 체크
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  // ── 테마 적용 ─────────────────────────────────────────────
  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    // 버튼 접근성 레이블 갱신
    if (toggleBtn) {
      toggleBtn.setAttribute(
        "aria-label",
        theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"
      );
      // 텍스트 레이블 갱신
      const label = toggleBtn.querySelector(".toggle-label");
      if (label) label.textContent = theme === "dark" ? "라이트 모드" : "다크 모드";
    }
  }

  // ── 토글 ──────────────────────────────────────────────────
  function toggleTheme() {
    const current = root.getAttribute("data-theme") || "light";
    const next    = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next); // 기억
  }

  // ── 초기 적용 ─────────────────────────────────────────────
  applyTheme(getPreferredTheme());

  // ── 이벤트 바인딩 ─────────────────────────────────────────
  if (toggleBtn) {
    toggleBtn.addEventListener("click", toggleTheme);
  }

  // ── OS 테마 변경 감지 (사용자가 직접 저장하지 않은 경우만) ──
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(e.matches ? "dark" : "light");
      }
    });
})();


/* ============================================================
   ② 자동 목차 생성 (TOC)
   ─────────────────────────────────────────────────────────────
   - 포스트 본문 내 H2, H3 태그를 자동 수집
   - #toc-sidebar ul 에 링크 목록 생성
   - IntersectionObserver로 현재 섹션 하이라이트
   ============================================================ */

(function initTOC() {
  const sidebar = document.getElementById("toc-sidebar");
  if (!sidebar) return; // TOC 사이드바가 없으면 종료

  // 목차 수집 범위 – 포스트 본문 컨테이너 셀렉터를 환경에 맞게 수정하세요
  const CONTENT_SELECTOR = ".post-content, article, main, .content";
  const contentEl = document.querySelector(CONTENT_SELECTOR);
  if (!contentEl) return;

  // H2, H3 수집
  const headings = Array.from(
    contentEl.querySelectorAll("h2, h3")
  );
  if (headings.length === 0) {
    sidebar.style.display = "none"; // 헤딩 없으면 TOC 숨김
    return;
  }

  // ── 각 헤딩에 고유 id 부여 (없는 경우) ──────────────────
  headings.forEach((h, i) => {
    if (!h.id) {
      // 텍스트 → slug (한글 포함)
      const slug = h.textContent
        .trim()
        .toLowerCase()
        .replace(/[\s]+/g, "-")         // 공백 → 하이픈
        .replace(/[^\w\uAC00-\uD7A3-]/g, "") // 특수문자 제거 (한글 유지)
        || `heading-${i}`;
      h.id = slug;
    }
  });

  // ── TOC 목록 렌더링 ───────────────────────────────────────
  const ul = sidebar.querySelector("ul") || document.createElement("ul");
  ul.innerHTML = ""; // 초기화

  headings.forEach((h) => {
    const level = parseInt(h.tagName[1], 10); // 2 or 3
    const li    = document.createElement("li");
    li.dataset.level = level;

    const a = document.createElement("a");
    a.href        = `#${h.id}`;
    a.textContent = h.textContent.trim();
    a.dataset.id  = h.id;

    // 클릭 시 부드러운 스크롤 (CSS scroll-behavior: smooth 보완)
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.getElementById(h.id);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        // URL 해시 갱신 (히스토리 오염 없이)
        history.pushState(null, "", `#${h.id}`);
      }
    });

    li.appendChild(a);
    ul.appendChild(li);
  });

  // ul이 sidebar 안에 없으면 삽입
  if (!sidebar.querySelector("ul")) {
    sidebar.appendChild(ul);
  }

  // ── 스크롤 하이라이트 (IntersectionObserver) ─────────────
  // 화면 상단 10~30% 범위에 들어온 헤딩을 "active"로 표시
  const tocLinks = Array.from(sidebar.querySelectorAll("a"));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // 모든 링크에서 active 제거
          tocLinks.forEach((a) => a.classList.remove("toc-active"));
          // 현재 섹션 링크 활성화
          const activeLink = sidebar.querySelector(
            `a[data-id="${entry.target.id}"]`
          );
          if (activeLink) {
            activeLink.classList.add("toc-active");
            // TOC 자체 스크롤 – 활성 링크가 보이도록
            activeLink.scrollIntoView({ block: "nearest" });
          }
        }
      });
    },
    {
      // rootMargin: 화면 상단 -10% ~ -70% 범위에서 트리거
      rootMargin: "-10% 0px -70% 0px",
      threshold: 0,
    }
  );

  headings.forEach((h) => observer.observe(h));
})();


/* ============================================================
   ③ 맨 위로 가기 버튼
   ─────────────────────────────────────────────────────────────
   - 스크롤 300px 이상 시 #scroll-to-top 버튼 표시
   - 클릭 → 부드럽게 맨 위로 스크롤
   ============================================================ */

(function initScrollToTop() {
  const btn = document.getElementById("scroll-to-top");
  if (!btn) return;

  const SHOW_THRESHOLD = 300; // 버튼이 나타날 스크롤 기준 (px)

  // ── 스크롤 이벤트: 표시 / 숨김 ───────────────────────────
  function onScroll() {
    if (window.scrollY > SHOW_THRESHOLD) {
      btn.classList.add("visible");
    } else {
      btn.classList.remove("visible");
    }
  }

  // 성능 최적화: passive 스크롤 리스너
  window.addEventListener("scroll", onScroll, { passive: true });

  // ── 클릭: 맨 위로 ────────────────────────────────────────
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // 초기 상태 반영 (페이지 새로고침 시 이미 스크롤된 경우)
  onScroll();
})();


/* ============================================================
   ④ 코드 블록 복사 버튼
   ─────────────────────────────────────────────────────────────
   - 페이지 내 모든 <pre> 태그를 .code-wrapper로 감싸기
   - 언어 뱃지(language-xxx 클래스 감지) 표시
   - 복사 버튼 삽입 + Clipboard API 연동
   ============================================================ */

(function initCodeCopy() {
  // Clipboard API 미지원 브라우저 대응
  if (!navigator.clipboard) {
    console.warn("Clipboard API를 지원하지 않는 환경입니다.");
  }

  const preElements = document.querySelectorAll("pre");
  if (preElements.length === 0) return;

  // ── SVG 아이콘 템플릿 ────────────────────────────────────
  const ICON_COPY = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>`;

  const ICON_CHECK = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>`;

  // ── 각 <pre> 처리 ────────────────────────────────────────
  preElements.forEach((pre) => {
    // 이미 래핑된 경우 스킵
    if (pre.parentElement?.classList.contains("code-wrapper")) return;

    // 래퍼 div 생성
    const wrapper = document.createElement("div");
    wrapper.className = "code-wrapper";
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    // ── 언어 뱃지 ──────────────────────────────────────────
    // <code class="language-javascript"> 형식 감지
    const codeEl = pre.querySelector("code");
    if (codeEl) {
      const langClass = Array.from(codeEl.classList).find((c) =>
        c.startsWith("language-")
      );
      if (langClass) {
        const lang  = langClass.replace("language-", "");
        const badge = document.createElement("span");
        badge.className   = "code-lang-badge";
        badge.textContent = lang;
        wrapper.appendChild(badge);
      }
    }

    // ── 복사 버튼 ──────────────────────────────────────────
    const copyBtn = document.createElement("button");
    copyBtn.className   = "copy-btn";
    copyBtn.innerHTML   = `${ICON_COPY}<span>복사</span>`;
    copyBtn.setAttribute("aria-label", "코드 복사");
    copyBtn.setAttribute("type", "button");
    wrapper.appendChild(copyBtn);

    // 복사 실행
    copyBtn.addEventListener("click", async () => {
      // 복사할 텍스트: <code> 내부 텍스트 우선, 없으면 pre 전체
      const textToCopy = codeEl
        ? codeEl.innerText
        : pre.innerText;

      try {
        // ── Clipboard API (모던 브라우저) ──────────────────
        await navigator.clipboard.writeText(textToCopy);
      } catch {
        // ── Fallback: execCommand (구형 브라우저) ──────────
        const textarea = document.createElement("textarea");
        textarea.value          = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.opacity  = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      // ── 복사 완료 피드백 ───────────────────────────────
      const spanEl = copyBtn.querySelector("span");
      copyBtn.innerHTML = `${ICON_CHECK}<span>복사됨!</span>`;
      copyBtn.classList.add("copied");
      copyBtn.disabled = true;

      // 2초 후 원래 상태로
      setTimeout(() => {
        copyBtn.innerHTML = `${ICON_COPY}<span>복사</span>`;
        copyBtn.classList.remove("copied");
        copyBtn.disabled = false;
      }, 2000);
    });
  });
})();
