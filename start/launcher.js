(() => {
  const GAME_URL = "https://pepeant.github.io/diceland/";
  const EDGE_SCHEME_URL = `microsoft-edge:${GAME_URL}`;

  const envPill = document.getElementById("envPill");
  const toast = document.getElementById("toast");

  const btnMobile = document.getElementById("btnMobile");
  const btnEdge2 = document.getElementById("btnEdge2");
  const btnCopy = document.getElementById("btnCopy");
  const btnCopy2 = document.getElementById("btnCopy2");
  const btnInstall2 = document.getElementById("btnInstall2");

  const modalWrap = document.getElementById("modalWrap");
  const backdrop = document.getElementById("backdrop");
  const btnCloseModal = document.getElementById("btnCloseModal");
  const installBody = document.getElementById("installBody");

  const heroShot = document.getElementById("heroShot");
  const shotCaption = document.getElementById("shotCaption");
  const shotTabs = document.getElementById("shotTabs");

  const shots = {
    main: { src: "./assets/Mainscreen.PNG", label: "메인" },
    blackjack: { src: "./assets/game1.PNG", label: "블랙잭" },
    roulette: { src: "./assets/game2.PNG", label: "룰렛" },
    slot: { src: "./assets/game3.PNG", label: "슬롯" },
    russian: { src: "./assets/game4.PNG", label: "러시안룰렛" }
  };

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function detectEnv() {
    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    const isiOS = /iPhone|iPad|iPod/i.test(ua);
    const isKakao = /KAKAOTALK/i.test(ua);
    const isFB = /FBAN|FBAV/i.test(ua);
    const isInApp = isKakao || isFB;
    const isEdge = /Edg\//i.test(ua);
    const isChrome = /Chrome\//i.test(ua) && !isEdge;

    const parts = [];
    if (isInApp) parts.push("인앱 브라우저");
    if (isAndroid) parts.push("Android");
    if (isiOS) parts.push("iOS");
    if (isEdge) parts.push("Edge");
    if (isChrome) parts.push("Chrome");
    if (!parts.length) parts.push("브라우저");

    envPill.textContent = `${parts.join(" · ")}에서 실행 중`;
    envPill.style.borderColor = isInApp ? "rgba(245,158,11,.35)" : "rgba(255,255,255,.10)";
    envPill.style.background = isInApp ? "rgba(245,158,11,.08)" : "rgba(255,255,255,.03)";
    envPill.style.color = isInApp ? "#fbbf24" : "var(--muted)";
  }

  async function copyLink() {
    let notified = false;
    const notifySuccess = () => {
      if (notified) return;
      notified = true;
      showToast("Edge 실행 링크 복사 완료");
    };

    try {
      await navigator.clipboard.writeText(EDGE_SCHEME_URL);
      notifySuccess();
      return;
    } catch {
      // Continue to fallback.
    }

    const ta = document.createElement("textarea");
    ta.value = EDGE_SCHEME_URL;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      if (document.execCommand("copy")) {
        notifySuccess();
      } else {
        showToast("복사 실패: 수동으로 복사해 주세요.");
      }
    } catch {
      showToast("복사 실패: 수동으로 복사해 주세요.");
    } finally {
      document.body.removeChild(ta);
    }
  }

  function tryOpenEdge() {
    window.location.href = EDGE_SCHEME_URL;
    window.setTimeout(() => {
      if (document.visibilityState === "visible") {
        showToast("이 환경에서는 Edge 열기가 차단될 수 있어요. 링크를 복사해 브라우저 주소창에 붙여넣어 실행해 주세요.");
      }
    }, 900);
  }

  function openInstallModal() {
    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    const isiOS = /iPhone|iPad|iPod/i.test(ua);
    const isEdge = /Edg\//i.test(ua);

    let html = `
      <p><b>인앱브라우저면 ⋮ → 브라우저에서 열기</b>를 먼저 사용해 주세요.</p>
    `;

    if (isiOS) {
      html += `
        <p><b>iOS: Safari 권장 + 홈 화면에 추가</b></p>
        <ol>
          <li>Safari에서 ${GAME_URL} 접속</li>
          <li>공유 버튼(⬆︎) → <b>홈 화면에 추가</b></li>
          <li>아이콘으로 실행</li>
        </ol>
      `;
    } else if (isAndroid) {
      html += `
        <p><b>Android(Chrome/Edge): 설치 / 홈 화면에 추가</b></p>
        <ol>
          <li>${GAME_URL} 접속</li>
          <li>우측 상단 메뉴</li>
          <li><b>설치</b> 또는 <b>홈 화면에 추가</b> 선택</li>
          <li>아이콘으로 실행</li>
        </ol>
        <p>현재 브라우저: <b>${isEdge ? "Edge" : "Chrome/기타"}</b></p>
      `;
    } else {
      html += `
        <p><b>PC: 설치 아이콘 있으면 설치, 없으면 북마크</b></p>
        <ol>
          <li>${GAME_URL} 접속</li>
          <li>주소창 오른쪽 설치 아이콘 확인</li>
          <li>없다면 북마크로 저장</li>
        </ol>
      `;
    }

    installBody.innerHTML = html;
    modalWrap.classList.remove("hidden");
    modalWrap.setAttribute("aria-hidden", "false");
  }

  function closeInstallModal() {
    modalWrap.classList.add("hidden");
    modalWrap.setAttribute("aria-hidden", "true");
  }

  function setHeroShot(key) {
    const next = shots[key];
    if (!next || !heroShot) return;
    heroShot.src = next.src;
    heroShot.alt = `DiceLand ${next.label} 스크린샷`;
    if (shotCaption) {
      shotCaption.textContent = `미니게임 스크린샷 · ${next.label}`;
    }
  }

  function setupShots() {
    if (!shotTabs) return;
    shotTabs.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-shot]");
      if (!btn) return;

      shotTabs.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      btn.classList.add("active");

      const key = btn.getAttribute("data-shot");
      setHeroShot(key);
    });
  }

  detectEnv();
  setupShots();

  btnMobile?.addEventListener("click", tryOpenEdge);
  btnEdge2?.addEventListener("click", tryOpenEdge);
  btnCopy?.addEventListener("click", copyLink);
  btnCopy2?.addEventListener("click", copyLink);
  btnInstall2?.addEventListener("click", openInstallModal);
  btnCloseModal?.addEventListener("click", closeInstallModal);
  backdrop?.addEventListener("click", closeInstallModal);

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalWrap.classList.contains("hidden")) {
      closeInstallModal();
    }
  });
})();
