/**
 * Survey Logic (Typeform Style Navigation & Validation)
 */

let currentStep = 0;
const totalSteps = 11; // 웰컴 화면(0)과 제출 완료 화면(12)을 제외한 질문 수 (1 ~ 11)

document.addEventListener("DOMContentLoaded", () => {
  // Lucide 아이콘 초기화
  lucide.createIcons();

  // 첫 화면으로 포커스
  updateProgress();
  setupEventListeners();
});

// 진행 상황 게이지 업데이트
function updateProgress() {
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");
  
  if (currentStep === 0) {
    progressBar.style.width = "0%";
    progressText.innerText = "0%";
  } else if (currentStep > totalSteps) {
    progressBar.style.width = "100%";
    progressText.innerText = "100%";
  } else {
    const percentage = Math.round((currentStep / totalSteps) * 100);
    progressBar.style.width = `${percentage}%`;
    progressText.innerText = `${percentage}%`;
  }
}

// 이벤트 리스너 설정
function setupEventListeners() {
  // 1. 키보드 Enter 단축키 지원
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      // 텍스트 영역(textarea)에서의 Enter는 줄바꿈을 해야 하므로 제외
      if (document.activeElement.tagName === "TEXTAREA") {
        return;
      }
      e.preventDefault();
      
      const currentCard = document.querySelector(`.survey-card[data-step="${currentStep}"]`);
      if (currentStep === 0) {
        nextStep();
      } else if (currentStep <= totalSteps) {
        validateAndNext(currentStep);
      }
    }
  });

  // 2. 6번(Q6) 기타 체크박스 활성화 감지
  const q6Checkboxes = document.querySelectorAll('input[name="q6"]');
  const q6EtcCheck = document.getElementById("q6EtcCheck");
  const inputQ6Etc = document.getElementById("inputQ6Etc");
  
  q6Checkboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      // '없음' 선택 시 다른 모든 체크박스 해제
      if (cb.value === "없음" && cb.checked) {
        q6Checkboxes.forEach(other => {
          if (other.value !== "없음") {
            other.checked = false;
          }
        });
        inputQ6Etc.disabled = true;
        inputQ6Etc.value = "";
      } else if (cb.value !== "없음" && cb.checked) {
        // 다른 항목 선택 시 '없음' 체크 해제
        const noneCb = Array.from(q6Checkboxes).find(other => other.value === "없음");
        if (noneCb) noneCb.checked = false;
      }
      
      if (q6EtcCheck) {
        inputQ6Etc.disabled = !q6EtcCheck.checked;
        if (q6EtcCheck.checked) {
          inputQ6Etc.focus();
        } else {
          inputQ6Etc.value = "";
        }
      }
    });
  });

  // 3. 7번(Q7) 기타 체크박스 활성화 감지
  const q7Checkboxes = document.querySelectorAll('input[name="q7"]');
  const q7EtcCheck = document.getElementById("q7EtcCheck");
  const inputQ7Etc = document.getElementById("inputQ7Etc");
  
  q7Checkboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      // '없음' 선택 시 다른 모든 체크박스 해제
      if (cb.value === "없음" && cb.checked) {
        q7Checkboxes.forEach(other => {
          if (other.value !== "없음") {
            other.checked = false;
          }
        });
        inputQ7Etc.disabled = true;
        inputQ7Etc.value = "";
      } else if (cb.value !== "없음" && cb.checked) {
        // 다른 항목 선택 시 '없음' 체크 해제
        const noneCb = Array.from(q7Checkboxes).find(other => other.value === "없음");
        if (noneCb) noneCb.checked = false;
      }
      
      if (q7EtcCheck) {
        inputQ7Etc.disabled = !q7EtcCheck.checked;
        if (q7EtcCheck.checked) {
          inputQ7Etc.focus();
        } else {
          inputQ7Etc.value = "";
        }
      }
    });
  });

  // 4. 라디오 버튼 선택 시 0.4초 후 자동으로 다음 스텝 이동 (더 빠른 작성 경험 제공)
  const autoNextRadios = document.querySelectorAll('.scale-item input, .options-grid input[type="radio"]');
  autoNextRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      setTimeout(() => {
        // 현재 선택된 라디오의 Step이 현재 진행중인 Step인 경우에만 이동
        const card = radio.closest('.survey-card');
        const stepNum = parseInt(card.getAttribute('data-step'));
        if (stepNum === currentStep) {
          validateAndNext(stepNum);
        }
      }, 350);
    });
  });
}

// 스텝 전환 연출 (애니메이션 처리)
function transitionCard(fromStep, toStep) {
  const fromCard = document.querySelector(`.survey-card[data-step="${fromStep}"]`);
  const toCard = document.querySelector(`.survey-card[data-step="${toStep}"]`);
  
  if (!fromCard || !toCard) return;

  // 1. 퇴장 애니메이션 적용
  fromCard.classList.remove("slide-down-in");
  fromCard.classList.add("slide-up-out");

  // 2. 애니메이션이 끝난 후 스텝 상태 전환
  setTimeout(() => {
    fromCard.classList.remove("active", "slide-up-out");
    
    // 3. 진입할 카드 활성화 및 애니메이션 적용
    toCard.classList.add("active", "slide-down-in");
    currentStep = toStep;
    updateProgress();
    
    // 포커싱 자동 처리
    const textInput = toCard.querySelector('.tech-input, .tech-textarea');
    if (textInput) {
      textInput.focus();
    }
  }, 300);
}

// 다음 단계로 이동
function nextStep() {
  if (currentStep < totalSteps + 1) {
    transitionCard(currentStep, currentStep + 1);
  }
}

// 이전 단계로 이동
function prevStep() {
  if (currentStep > 0) {
    const fromCard = document.querySelector(`.survey-card[data-step="${currentStep}"]`);
    const toCard = document.querySelector(`.survey-card[data-step="${currentStep - 1}"]`);
    
    if (!fromCard || !toCard) return;

    // 이전으로 갈 때는 반대 방향으로 연출
    fromCard.classList.remove("slide-down-in");
    fromCard.style.animation = "slideDownIn 0.35s cubic-bezier(0.25, 0.8, 0.25, 1) reverse forwards";
    
    setTimeout(() => {
      fromCard.classList.remove("active");
      fromCard.style.animation = "";
      
      toCard.classList.add("active");
      toCard.style.animation = "slideUpOut 0.35s cubic-bezier(0.25, 0.8, 0.25, 1) reverse forwards";
      
      currentStep = currentStep - 1;
      updateProgress();
      
      setTimeout(() => {
        toCard.style.animation = "";
      }, 350);
    }, 300);
  }
}

// 유효성 검사 및 다음 이동
function validateAndNext(step) {
  const card = document.querySelector(`.survey-card[data-step="${step}"]`);
  const isRequired = card.getAttribute("data-required") === "true";
  
  if (!isRequired) {
    nextStep();
    return;
  }

  let isValid = false;
  
  // 1. 성함 (텍스트 입력) 검증
  if (step === 1) {
    const nameInput = document.getElementById("inputName");
    isValid = nameInput.value.trim().length > 0;
  }
  // 2. 참여 일자 및 만족도 라디오 버튼 검증
  else if (step === 2) {
    const checked = card.querySelector('input[name="eduDate"]:checked');
    isValid = checked !== null;
  }
  else if (step >= 3 && step <= 7) {
    const qNum = `q${step - 2}`;
    const checked = card.querySelector(`input[name="${qNum}"]:checked`);
    isValid = checked !== null;
  }
  // 3. 복수선택 체크박스 검증 (6번, 7번 질문)
  else if (step === 8 || step === 9) {
    const qNum = step === 8 ? "q6" : "q7";
    const checkedBoxes = card.querySelectorAll(`input[name="${qNum}"]:checked`);
    
    // 최소 1개 이상 선택
    isValid = checkedBoxes.length > 0;
    
    // 기타가 체크된 경우, 텍스트가 작성되었는지 확인
    const etcCheck = document.getElementById(`${qNum}EtcCheck`);
    const etcInput = document.getElementById(`input${qNum.toUpperCase()}Etc`);
    if (etcCheck && etcCheck.checked) {
      if (etcInput.value.trim().length === 0) {
        isValid = false;
        etcInput.focus();
      }
    }
  }

  if (isValid) {
    nextStep();
  } else {
    // 흔들림 에러 이펙트 부여
    const cardInner = card.querySelector(".card-inner");
    cardInner.style.animation = "none";
    setTimeout(() => {
      cardInner.style.animation = "shake 0.4s ease";
    }, 10);
  }
}

// 폼 데이터 전송
async function submitSurvey() {
  const submitBtn = document.querySelector(".btn-submit");
  const originalHtml = submitBtn.innerHTML;
  
  // 로딩 상태 연출
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner"></span> 제출 중...`;
  
  try {
    const data = parseFormData();
    await window.dbService.submitResponse(data);
    
    // 제출 성공 시 다음 스텝(제출 완료 화면 - 12번)으로 이동
    transitionCard(currentStep, 12);
  } catch (error) {
    console.error("설문 제출에 실패했습니다:", error);
    alert(error.message || "제출에 실패했습니다. 네트워크 상태 및 파이어베이스 설정을 확인하시고 다시 시도해 주세요.");
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHtml;
  }
}

// 폼 데이터를 데이터베이스에 보낼 객체로 가공
function parseFormData() {
  const name = document.getElementById("inputName").value.trim();
  const eduDate = document.querySelector('input[name="eduDate"]:checked').value;
  
  const q1 = parseInt(document.querySelector('input[name="q1"]:checked').value);
  const q2 = parseInt(document.querySelector('input[name="q2"]:checked').value);
  const q3 = parseInt(document.querySelector('input[name="q3"]:checked').value);
  const q4 = parseInt(document.querySelector('input[name="q4"]:checked').value);
  const q5 = parseInt(document.querySelector('input[name="q5"]:checked').value);
  
  // 6번 질문 마음에 들었던 점 파싱
  const q6Checked = document.querySelectorAll('input[name="q6"]:checked');
  const q6 = Array.from(q6Checked).map(cb => cb.value).filter(val => val !== "기타");
  const q6_etc = document.getElementById("inputQ6Etc").value.trim();
  
  // 7번 질문 개선점 파싱
  const q7Checked = document.querySelectorAll('input[name="q7"]:checked');
  const q7 = Array.from(q7Checked).map(cb => cb.value).filter(val => val !== "기타");
  const q7_etc = document.getElementById("inputQ7Etc").value.trim();
  
  const q8 = document.getElementById("inputQ8").value.trim();
  const q9 = document.getElementById("inputQ9").value.trim();

  return {
    name,
    eduDate,
    q1, q2, q3, q4, q5,
    q6,
    q6_etc,
    q7,
    q7_etc,
    q8,
    q9
  };
}

// CSS Shake Keyframes 추가를 위한 스타일 삽입
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }
  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 1s ease-in-out infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
