/**
 * Admin Dashboard Logic (Authentication, Chart.js Visualizations, Excel Export, Data Table, Sorting, Deleting, Subjective Toggle)
 */

let surveyResponses = [];
let currentFeedbackTab = 'q8'; // 8번 문항으로 기본 탭 설정
let adminPassword = '';

// 정렬 및 선택 상태 관리 전역 변수
let sortColumn = 'submittedAt';
let sortOrder = 'none'; // 'none' | 'asc' | 'desc'
let selectedResponseIds = [];
let activeDeleteId = null;  // 개별 삭제 대상 ID
let activeDeleteIds = [];  // 일괄 삭제 대상 ID 배열
let showAllSubjective = false; // 주관식 전체 보기 여부

// Chart.js 인스턴스 참조 보관용 객체
const charts = {
  metricsAvg: null,
  eduDates: null,
  liked: null,
  improved: null
};

// 상단 대형 네비게이션 탭 전환 제어
function switchNavTab(tabKey) {
  const tabDashboard = document.getElementById("tabContentDashboard");
  const tabTable = document.getElementById("tabContentTable");
  const btnDashboard = document.getElementById("navTabDashboard");
  const btnTable = document.getElementById("navTabTable");

  if (!tabDashboard || !tabTable || !btnDashboard || !btnTable) return;

  if (tabKey === 'dashboard') {
    tabDashboard.style.display = "flex";
    tabTable.style.display = "none";
    btnDashboard.classList.add("active");
    btnTable.classList.remove("active");

    // 숨겨진 컨테이너에서 드러날 때 차트가 찌그러지는 현상 리사이즈로 예방
    setTimeout(() => {
      Object.keys(charts).forEach(key => {
        if (charts[key]) {
          charts[key].resize();
          charts[key].update();
        }
      });
    }, 50);
  } else if (tabKey === 'table') {
    tabDashboard.style.display = "none";
    tabTable.style.display = "flex";
    btnDashboard.classList.remove("active");
    btnTable.classList.add("active");
    
    // 테이블 다시 그리기
    renderTable();
  }

  lucide.createIcons();
}

document.addEventListener("DOMContentLoaded", () => {
  // Lucide 아이콘 초기화
  lucide.createIcons();

  // 세션 스토리지에 암호 정보가 있는 경우 자동 로그인 시도
  const savedPw = sessionStorage.getItem("admin_pw");
  if (savedPw) {
    document.getElementById("inputPassword").value = savedPw;
    verifyAdmin();
  }

  // 비밀번호 입력창에서 Enter 감지
  document.getElementById("inputPassword").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      verifyAdmin();
    }
  });
});

// 관리자 인증 시도
async function verifyAdmin() {
  const pwInput = document.getElementById("inputPassword");
  const loginOverlay = document.getElementById("loginOverlay");
  const adminContainer = document.getElementById("adminContainer");
  const errorMsg = document.getElementById("loginErrorMsg");
  const loginBtn = document.querySelector(".btn-login");
  const originalHtml = loginBtn.innerHTML;

  const pw = pwInput.value.trim();
  if (!pw) return;

  // 로딩 상태 표기
  loginBtn.disabled = true;
  loginBtn.innerHTML = `<span class="spinner"></span> 인증 중...`;
  errorMsg.style.display = "none";

  try {
    const responses = await window.dbService.getResponses(pw);
    
    // 인증 성공 처리
    adminPassword = pw;
    sessionStorage.setItem("admin_pw", pw);
    surveyResponses = responses;
    
    // UI 전환
    loginOverlay.classList.remove("active");
    adminContainer.style.display = "flex";
    
    // 대시보드 그리기
    renderDashboard();
    
  } catch (error) {
    console.error("인증 실패:", error);
    errorMsg.innerText = error.message || "비밀번호가 올바르지 않습니다.";
    errorMsg.style.display = "block";
    
    // 흔들림 이펙트
    const loginCard = document.querySelector(".login-card");
    loginCard.style.animation = "none";
    setTimeout(() => {
      loginCard.style.animation = "shake 0.4s ease";
    }, 10);
    
    pwInput.value = "";
    pwInput.focus();
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = originalHtml;
  }
}

// 대시보드 데이터 새로고침
async function loadDashboardData() {
  const refreshBtn = document.querySelector(".btn-refresh");
  const originalHtml = refreshBtn.innerHTML;
  
  refreshBtn.disabled = true;
  refreshBtn.innerHTML = `<i data-lucide="refresh-cw" class="spin-animation"></i> 로딩 중...`;
  lucide.createIcons();

  try {
    const responses = await window.dbService.getResponses(adminPassword);
    surveyResponses = responses;
    selectedResponseIds = []; // 선택 상태 초기화
    document.getElementById("selectAllCheckbox").checked = false;
    updateDeleteSelectedButton();
    renderDashboard();
  } catch (error) {
    console.error("새로고침 실패:", error);
    alert("데이터를 새로 불러오는 데 실패했습니다.");
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = originalHtml;
    lucide.createIcons();
  }
}

// 대시보드 렌더링 총괄
function renderDashboard() {
  renderMetrics();
  renderCharts();
  renderFeedback();
  renderTable(); 
}

// 1. 핵심 스코어 카드 갱신
function renderMetrics() {
  const count = surveyResponses.length;
  document.getElementById("metricTotalResponses").innerText = count;

  if (count === 0) {
    document.getElementById("metricAvgSatisfaction").innerHTML = `0.0 <span class="max-val">/ 5.0</span>`;
    document.getElementById("metricNPS").innerHTML = `0.0 <span class="max-val">/ 5.0</span>`;
    document.getElementById("metricAvgExpertise").innerHTML = `0.0 <span class="max-val">/ 5.0</span>`;
    return;
  }

  // 만족도(q1), 추천(q5), 강사전문성(q3) 평균 계산
  const sumQ1 = surveyResponses.reduce((acc, curr) => acc + (curr.q1 || 0), 0);
  const sumQ5 = surveyResponses.reduce((acc, curr) => acc + (curr.q5 || 0), 0);
  const sumQ3 = surveyResponses.reduce((acc, curr) => acc + (curr.q3 || 0), 0);

  const avgQ1 = (sumQ1 / count).toFixed(1);
  const avgQ5 = (sumQ5 / count).toFixed(1);
  const avgQ3 = (sumQ3 / count).toFixed(1);

  document.getElementById("metricAvgSatisfaction").innerHTML = `${avgQ1} <span class="max-val">/ 5.0</span>`;
  document.getElementById("metricNPS").innerHTML = `${avgQ5} <span class="max-val">/ 5.0</span>`;
  document.getElementById("metricAvgExpertise").innerHTML = `${avgQ3} <span class="max-val">/ 5.0</span>`;
}

// 2. Chart.js 시각화 차트 렌더링
function renderCharts() {
  const count = surveyResponses.length;
  
  // 기존 차트 파괴
  Object.keys(charts).forEach(key => {
    if (charts[key]) {
      charts[key].destroy();
      charts[key] = null;
    }
  });

  if (count === 0) return;

  const colorPrimary = '#0071e3'; // Apple Blue
  const colorSecondary = '#6e00f5'; // Tech Purple
  const colorAccent = '#30d158'; // Success Green
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();
  const gridColor = 'rgba(255, 255, 255, 0.08)';

  Chart.defaults.color = textColor;
  Chart.defaults.font.family = 'Inter, -apple-system, sans-serif';

  // --- 차트 1: 핵심 평가 지표 평균 (가로형 막대 차트) ---
  const indicatorSums = [0, 0, 0, 0, 0];
  surveyResponses.forEach(r => {
    indicatorSums[0] += r.q1 || 0;
    indicatorSums[1] += r.q2 || 0;
    indicatorSums[2] += r.q3 || 0;
    indicatorSums[3] += r.q4 || 0;
    indicatorSums[4] += r.q5 || 0;
  });
  
  const indicatorAvgs = indicatorSums.map(sum => (sum / count).toFixed(2));

  const ctx1 = document.getElementById('chartMetricsAvg').getContext('2d');
  charts.metricsAvg = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: ["전반적 만족도", "콘텐츠 깊이/난이도", "강사 전문성/소통", "부가자료 도움", "동료 추천의향"],
      datasets: [{
        label: '평균 점수 (5점 만점)',
        data: indicatorAvgs,
        backgroundColor: [colorPrimary, colorSecondary, colorAccent, '#ff9f0a', '#bf5af2'],
        borderRadius: 8,
        borderWidth: 0,
        barThickness: 18
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { 
          min: 0, 
          max: 5,
          grid: { color: gridColor },
          ticks: { stepSize: 1 }
        },
        y: { grid: { display: false } }
      }
    }
  });

  // --- 차트 2: 교육 일자별 응답 분포 (세로형 막대 차트) ---
  const dateCounts = {};
  surveyResponses.forEach(r => {
    dateCounts[r.eduDate] = (dateCounts[r.eduDate] || 0) + 1;
  });
  const dateLabels = Object.keys(dateCounts).sort();
  const dateValues = dateLabels.map(label => dateCounts[label]);

  const ctx2 = document.getElementById('chartEduDates').getContext('2d');
  charts.eduDates = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: dateLabels,
      datasets: [{
        label: '응답자 수 (명)',
        data: dateValues,
        backgroundColor: colorPrimary,
        borderRadius: 6,
        barThickness: 24
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { 
          beginAtZero: true, 
          grid: { color: gridColor },
          ticks: { stepSize: 1 }
        },
        x: { grid: { display: false } }
      }
    }
  });

  // --- 차트 3: 마음에 들었던 점 분석 (도넛 차트 - q6) ---
  const q6Counts = {};
  surveyResponses.forEach(r => {
    if (r.q6 && Array.isArray(r.q6)) {
      r.q6.forEach(val => {
        q6Counts[val] = (q6Counts[val] || 0) + 1;
      });
    }
  });
  const q6EtcCount = surveyResponses.filter(r => r.q6_etc && r.q6_etc.trim().length > 0).length;
  if (q6EtcCount > 0) {
    q6Counts["기타"] = q6EtcCount;
  }

  const q6Labels = Object.keys(q6Counts).sort((a,b) => q6Counts[b] - q6Counts[a]);
  const q6Values = q6Labels.map(label => q6Counts[label]);

  const ctx3 = document.getElementById('chartLikedFeatures').getContext('2d');
  charts.liked = new Chart(ctx3, {
    type: 'doughnut',
    data: {
      labels: q6Labels,
      datasets: [{
        data: q6Values,
        backgroundColor: [
          '#ff3b30', '#ff9f0a', '#34c759', '#0071e3', '#af52de', '#5856d6', '#545456', '#a1a1a6'
        ],
        borderWidth: 2,
        borderColor: '#121318'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { boxWidth: 12, font: { size: 10 } }
        }
      },
      cutout: '60%'
    }
  });

  // --- 차트 4: 개선 사항 분석 (도넛 차트 - q7) ---
  const q7Counts = {};
  surveyResponses.forEach(r => {
    if (r.q7 && Array.isArray(r.q7)) {
      r.q7.forEach(val => {
        q7Counts[val] = (q7Counts[val] || 0) + 1;
      });
    }
  });
  const q7EtcCount = surveyResponses.filter(r => r.q7_etc && r.q7_etc.trim().length > 0).length;
  if (q7EtcCount > 0) {
    q7Counts["기타"] = q7EtcCount;
  }

  const q7Labels = Object.keys(q7Counts).sort((a,b) => q7Counts[b] - q7Counts[a]);
  const q7Values = q7Labels.map(label => q7Counts[label]);

  const ctx4 = document.getElementById('chartImprovedFeatures').getContext('2d');
  charts.improved = new Chart(ctx4, {
    type: 'doughnut',
    data: {
      labels: q7Labels,
      datasets: [{
        data: q7Values,
        backgroundColor: [
          '#545456', '#ff453a', '#ff9f0a', '#30d158', '#0a84ff', '#bf5af2', '#64d2ff', '#a1a1a6'
        ],
        borderWidth: 2,
        borderColor: '#121318'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { boxWidth: 12, font: { size: 10 } }
        }
      },
      cutout: '60%'
    }
  });
}

// 3. 주관식 피드백 리스트 출력
function renderFeedback() {
  const container = document.getElementById("feedbackList");
  container.innerHTML = "";

  let listHtml = "";

  if (currentFeedbackTab === 'q8') {
    // 8. 현업 활용 필요 요소
    const items = surveyResponses.filter(r => r.q8 && r.q8.trim().length > 0);
    if (items.length === 0) {
      listHtml = `<p class="no-feedback">작성된 의견이 없습니다.</p>`;
    } else {
      items.forEach(r => {
        listHtml += createFeedbackCard(r.name, r.submittedAt, r.q8);
      });
    }
  } else if (currentFeedbackTab === 'q9') {
    // 9. 교육 소감
    const items = surveyResponses.filter(r => r.q9 && r.q9.trim().length > 0);
    if (items.length === 0) {
      listHtml = `<p class="no-feedback">작성된 교육 소감이 없습니다.</p>`;
    } else {
      items.forEach(r => {
        listHtml += createFeedbackCard(r.name, r.submittedAt, r.q9);
      });
    }
  } else if (currentFeedbackTab === 'etc') {
    // 기타 의견 (Q6기타, Q7기타 모음)
    const items = surveyResponses.filter(r => 
      (r.q6_etc && r.q6_etc.trim().length > 0) || 
      (r.q7_etc && r.q7_etc.trim().length > 0)
    );
    
    if (items.length === 0) {
      listHtml = `<p class="no-feedback">작성된 주관식 기타 의견이 없습니다.</p>`;
    } else {
      items.forEach(r => {
        let content = "";
        if (r.q6_etc) content += `<strong>[마음에 든 점 기타]</strong> ${r.q6_etc}\n`;
        if (r.q7_etc) content += `<strong>[개선점 기타]</strong> ${r.q7_etc}`;
        
        listHtml += createFeedbackCard(r.name, r.submittedAt, content);
      });
    }
  }

  container.innerHTML = listHtml;
}

// 피드백 카드 HTML 템플릿 생성기
function createFeedbackCard(name, dateStr, content) {
  const formattedDate = new Date(dateStr).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <div class="feedback-card">
      <div class="feedback-meta">
        <span class="feedback-name">${name} 응답자</span>
        <span class="feedback-date">${formattedDate}</span>
      </div>
      <div class="feedback-content">${content}</div>
    </div>
  `;
}

// 피드백 탭 전환
function switchFeedbackTab(tabKey) {
  currentFeedbackTab = tabKey;
  
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    btn.classList.remove("active");
  });

  event.target.classList.add("active");

  renderFeedback();
}

// 4. 데이터 표(Table) 렌더링 및 3단계 정렬 기능 (주관식 열 바인딩 추가)
function renderTable() {
  const tableBody = document.getElementById("tableBody");
  const tableElement = document.getElementById("surveyTable");
  
  if (!tableBody || !tableElement) return;
  tableBody.innerHTML = "";

  const count = surveyResponses.length;
  if (count === 0) {
    tableBody.innerHTML = `<tr><td colspan="14" class="no-feedback" style="text-align:center;">설문 데이터가 존재하지 않습니다.</td></tr>`;
    return;
  }

  // 1. 정렬 기준에 맞춰 데이터 복사 및 정렬
  let displayData = [...surveyResponses];

  if (sortOrder !== 'none') {
    displayData.sort((a, b) => {
      let valA = a[sortColumn];
      let valB = b[sortColumn];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else if (sortColumn === 'submittedAt') {
        comparison = new Date(valA) - new Date(valB);
      } else {
        comparison = String(valA).localeCompare(String(valB), 'ko-KR');
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  // 2. 정렬 아이콘 헤더 업데이트
  const headers = ['name', 'eduDate', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6_etc', 'q7_etc', 'q8', 'q9', 'submittedAt'];
  headers.forEach(header => {
    const iconSpan = document.getElementById(`sort-${header}`);
    if (iconSpan) {
      if (sortColumn === header) {
        if (sortOrder === 'asc') iconSpan.innerHTML = ' ▲';
        else if (sortOrder === 'desc') iconSpan.innerHTML = ' ▼';
        else iconSpan.innerHTML = '';
      } else {
        iconSpan.innerHTML = '';
      }
    }
  });

  // 3. 테이블 행 생성
  displayData.forEach(r => {
    const dateStr = new Date(r.submittedAt).toLocaleDateString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const isChecked = selectedResponseIds.includes(r.id);

    // 큰따옴표가 들어가도 깨지지 않도록 치환 이스케이프
    const q6_etc = (r.q6_etc || '').replace(/"/g, '&quot;');
    const q7_etc = (r.q7_etc || '').replace(/"/g, '&quot;');
    const q8 = (r.q8 || '').replace(/"/g, '&quot;');
    const q9 = (r.q9 || '').replace(/"/g, '&quot;');

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" class="row-checkbox" data-id="${r.id}" ${isChecked ? 'checked' : ''} onchange="handleRowCheckboxChange('${r.id}', this.checked)"></td>
      <td><strong>${r.name}</strong></td>
      <td>${r.eduDate}</td>
      <td>${r.q1}</td>
      <td>${r.q2}</td>
      <td>${r.q3}</td>
      <td>${r.q4}</td>
      <td>${r.q5}</td>
      <!-- 주관식 데이터 셀 및 마우스 호버 전체 노출 title 속성 -->
      <td class="subjective-col" title="${q6_etc || '-'}">${r.q6_etc || '-'}</td>
      <td class="subjective-col" title="${q7_etc || '-'}">${r.q7_etc || '-'}</td>
      <td class="subjective-col" title="${q8 || '-'}">${r.q8 || '-'}</td>
      <td class="subjective-col" title="${q9 || '-'}">${r.q9 || '-'}</td>
      <td><span class="feedback-date">${dateStr}</span></td>
      <td>
        <button class="btn-row-delete" onclick="openDeleteModal('${r.id}')" title="삭제">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  lucide.createIcons();
}

// 주관식 답변 펼쳐보기 / 말줄임 토글 제어
function toggleSubjectiveView() {
  const table = document.getElementById("surveyTable");
  const btn = document.getElementById("btnToggleSubjective");
  if (!table || !btn) return;

  showAllSubjective = !showAllSubjective;

  if (showAllSubjective) {
    table.classList.add("expanded-mode");
    btn.innerHTML = `<i data-lucide="minimize-2"></i> 주관식 말줄임 보기`;
  } else {
    table.classList.remove("expanded-mode");
    btn.innerHTML = `<i data-lucide="maximize-2"></i> 주관식 전체 보기`;
  }

  lucide.createIcons();
}

// 컬럼 헤더 클릭 시 정렬 핸들링
function handleSort(column) {
  if (sortColumn === column) {
    if (sortOrder === 'none') sortOrder = 'asc';
    else if (sortOrder === 'asc') sortOrder = 'desc';
    else sortOrder = 'none';
  } else {
    sortColumn = column;
    sortOrder = 'asc';
  }
  renderTable();
}

// 체크박스 전체 선택 / 해제
function toggleSelectAll(masterCb) {
  const rowCheckboxes = document.querySelectorAll(".row-checkbox");
  const isChecked = masterCb.checked;
  
  selectedResponseIds = [];
  rowCheckboxes.forEach(cb => {
    cb.checked = isChecked;
    if (isChecked) {
      const id = cb.getAttribute("data-id");
      selectedResponseIds.push(id);
    }
  });
  updateDeleteSelectedButton();
}

// 개별 행 체크박스 감지
function handleRowCheckboxChange(id, isChecked) {
  if (isChecked) {
    if (!selectedResponseIds.includes(id)) {
      selectedResponseIds.push(id);
    }
  } else {
    selectedResponseIds = selectedResponseIds.filter(item => item !== id);
  }

  const allRowCbs = document.querySelectorAll(".row-checkbox");
  const selectAllCb = document.getElementById("selectAllCheckbox");
  
  if (selectAllCb) {
    selectAllCb.checked = (allRowCbs.length > 0 && selectedResponseIds.length === allRowCbs.length);
  }
  updateDeleteSelectedButton();
}

// '선택 삭제' 상단 버튼 디자인 상태 업데이트
function updateDeleteSelectedButton() {
  const btn = document.getElementById("btnDeleteSelected");
  const countSpan = document.getElementById("selectedCount");
  
  if (btn && countSpan) {
    const count = selectedResponseIds.length;
    countSpan.innerText = count;
    btn.disabled = count === 0;
  }
}

// 개별 삭제 모달 열기
function openDeleteModal(id) {
  activeDeleteId = id;
  activeDeleteIds = [];
  
  document.getElementById("deleteModalMsg").innerText = "정말 이 응답 데이터를 삭제하시겠습니까?";
  document.getElementById("deleteModal").classList.add("active");
}

// 일괄 삭제 모달 열기
function openBatchDeleteModal() {
  if (selectedResponseIds.length === 0) return;
  activeDeleteId = null;
  activeDeleteIds = [...selectedResponseIds];
  
  document.getElementById("deleteModalMsg").innerText = `정말 선택한 ${activeDeleteIds.length}개의 응답 데이터를 모두 일괄 삭제하시겠습니까?`;
  document.getElementById("deleteModal").classList.add("active");
}

// 모달 닫기
function closeDeleteModal() {
  document.getElementById("deleteModal").classList.remove("active");
  activeDeleteId = null;
  activeDeleteIds = [];
}

// 실제 삭제 승인 실행
async function confirmDelete() {
  const confirmBtn = document.getElementById("btnConfirmDelete");
  const originalHtml = confirmBtn.innerHTML;

  confirmBtn.disabled = true;
  confirmBtn.innerHTML = `<span class="spinner"></span> 삭제 중...`;

  try {
    if (activeDeleteId) {
      await window.dbService.deleteResponse(activeDeleteId);
    } else if (activeDeleteIds.length > 0) {
      await window.dbService.deleteResponses(activeDeleteIds);
    }

    closeDeleteModal();
    
    selectedResponseIds = [];
    document.getElementById("selectAllCheckbox").checked = false;
    updateDeleteSelectedButton();
    
    await loadDashboardData();
    
  } catch (error) {
    console.error("데이터 삭제 실패:", error);
    alert("데이터를 삭제하는 데 실패했습니다. 네트워크 상태 및 파이어베이스 설정을 확인해 주세요.");
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = originalHtml;
  }
}

// 5. SheetJS를 활용한 엑셀 파일 다운로드
function downloadExcel() {
  if (surveyResponses.length === 0) {
    alert("다운로드할 데이터가 없습니다.");
    return;
  }

  const excelData = surveyResponses.map((r, index) => {
    const formattedDate = new Date(r.submittedAt).toLocaleString('ko-KR');
    return {
      "번호": surveyResponses.length - index,
      "성함": r.name || "",
      "참여 교육 일자": r.eduDate || "",
      "Q1. 전반적 만족도": r.q1 || 0,
      "Q2. 콘텐츠 깊이/난이도": r.q2 || 0,
      "Q3. 강사 전문성/소통": r.q3 || 0,
      "Q4. 부가자료 도움": r.q4 || 0,
      "Q5. 동료 추천의향": r.q5 || 0,
      "Q6. 마음에 든 항목": (r.q6 || []).join(", "),
      "Q6. 마음에 든 항목 (기타)": r.q6_etc || "",
      "Q7. 개선 필요 항목": (r.q7 || []).join(", "),
      "Q7. 개선 필요 항목 (기타)": r.q7_etc || "",
      "Q8. 현업 활용 필요 요소": r.q8 || "",
      "Q9. 교육 소감 및 피드백": r.q9 || "",
      "제출 시간": formattedDate
    };
  });

  // SheetJS 워크시트 생성
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  
  // 컬럼 너비 자동 설정
  const colWidths = [
    { wch: 6 },  // 번호
    { wch: 10 }, // 성함
    { wch: 15 }, // 참여 교육 일자
    { wch: 18 }, // Q1
    { wch: 22 }, // Q2
    { wch: 22 }, // Q3
    { wch: 18 }, // Q4
    { wch: 18 }, // Q5
    { wch: 30 }, // Q6
    { wch: 30 }, // Q6 기타
    { wch: 30 }, // Q7
    { wch: 30 }, // Q7 기타
    { wch: 45 }, // Q8 현업 활용
    { wch: 45 }, // Q9 소감
    { wch: 22 }  // 제출 시간
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "만족도 조사 결과");

  XLSX.writeFile(workbook, "AXer_Incubator_Survey_Results.xlsx");
}

// 흔들림 애니메이션 CSS 추가
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }
  .spin-animation {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
