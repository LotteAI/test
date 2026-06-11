/**
 * Firebase Configuration and Initialization
 * 
 * * Firebase를 사용하려면 아래 firebaseConfig 객체에 프로젝트 정보를 입력해 주세요.
 * * 설정이 입력되지 않으면 자동으로 LocalStorage 모드(데모용)로 동작하여 백엔드 없이도 테스트가 가능합니다.
 */

const firebaseConfig = {
  apiKey: "AIzaSyABdowHKL2rRrE0SEvnJclSHNOpfqrSZM4",
  authDomain: "survey-17269.firebaseapp.com",
  projectId: "survey-17269",
  storageBucket: "survey-17269.firebasestorage.app",
  messagingSenderId: "658907572198",
  appId: "1:658907572198:web:7fa14d3e9fd04b83051827",
  measurementId: "G-YM83PVHJQ8"
};

// SHA-256 해시 검증용 해시값 (비밀번호: axteam1!)
const ADMIN_PASSWORD_HASH = "61b8255d09e55e9c7a91d41c88117d4e9e25a37aa2636e94426068fb130ac08d";

// SHA-256 해싱 함수 (Web Crypto API 사용)
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Firebase가 설정되었는지 감지
const isFirebaseEnabled = () => {
  return firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY";
};

let db = null;

// Firebase CDN 스크립트가 로드되었는지 확인 후 초기화
function initDatabase() {
  if (isFirebaseEnabled() && typeof firebase !== 'undefined') {
    try {
      // Firebase 앱 초기화
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.firestore();
      console.log("Firebase Firestore initialized successfully.");
      return { type: 'firebase', db };
    } catch (e) {
      console.error("Firebase initialization failed, falling back to LocalStorage:", e);
    }
  }
  
  console.log("Firebase is not configured. Using LocalStorage mode (Demo).");
  return { type: 'local', db: window.localStorage };
}

// 데이터베이스 연동 Helper 클래스
class DatabaseService {
  constructor() {
    const { type, db } = initDatabase();
    this.type = type;
    this.db = db;
    this.collectionName = "survey_responses";
  }

  // 설문 응답 제출 (5초 타임아웃 적용으로 무한 대기 버그 방지)
  async submitResponse(data) {
    const responseData = {
      ...data,
      submittedAt: new Date().toISOString()
    };

    if (this.type === 'firebase' && this.db) {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("연결 시간 초과. Firebase Database 및 보안 규칙 설정을 확인해 주세요.")), 5000)
      );
      
      const submitPromise = this.db.collection(this.collectionName).add(responseData);
      
      return Promise.race([submitPromise, timeoutPromise]);
    } else {
      // LocalStorage 모드
      let responses = this.getLocalResponses();
      responses.push({
        id: 'local_' + Math.random().toString(36).substr(2, 9),
        ...responseData
      });
      localStorage.setItem(this.collectionName, JSON.stringify(responses));
      return { id: 'local_success' };
    }
  }

  // 설문 응답 전체 조회 (관리자용)
  async getResponses(password) {
    // 비밀번호 해시값 검증
    const inputHash = await sha256(password);
    if (inputHash !== ADMIN_PASSWORD_HASH) {
      throw new Error("비밀번호가 일치하지 않습니다.");
    }

    if (this.type === 'firebase' && this.db) {
      const snapshot = await this.db.collection(this.collectionName)
        .orderBy('submittedAt', 'desc')
        .get();
      
      const responses = [];
      snapshot.forEach(doc => {
        responses.push({ id: doc.id, ...doc.data() });
      });
      return responses;
    } else {
      // LocalStorage 모드에서 읽어오기
      return this.getLocalResponses().sort((a, b) => 
        new Date(b.submittedAt) - new Date(a.submittedAt)
      );
    }
  }

  // LocalStorage 데이터 헬퍼
  getLocalResponses() {
    const data = localStorage.getItem(this.collectionName);
    if (!data) {
      // 테스트를 위한 더미 데이터 28개 자동 생성 (로컬스토리지 모드일 때 시각화와 엑셀 확인용)
      const dummyData = this.generateDummyData();
      localStorage.setItem(this.collectionName, JSON.stringify(dummyData));
      return dummyData;
    }
    return JSON.parse(data);
  }

  // 더미 데이터 생성기 (로컬 테스트 및 시연용)
  generateDummyData() {
    const names = ["김민수", "이서연", "박준혁", "최지우", "정현우", "한소희", "윤도현"];
    const dates = [
      "6/11(목)", "6/18(목)", "6/25(목)", 
      "7/2(목)", "7/9(목)", "7/16(목)"
    ];
    
    const likedFeatures = [
      "강사의 강의 속도", "강사의 전달력 및 커뮤니케이션", "교육 자료 및 콘텐츠의 품질",
      "실무 적용 가능성", "실습 위주의 학습 방식", "개인 맞춤 피드백 제공", "교육 일정 및 진행 시간"
    ];
    
    const improvedFeatures = [
      "강사의 강의 속도", "강사의 전달력 및 커뮤니케이션", "교육 자료 및 콘텐츠의 난이도",
      "실무 적용 가능성", "실습 위주의 학습 방식", "개인 맞춤 피드백 부족", "교육 일정 및 진행 시간"
    ];

    const dummies = [];
    
    for (let i = 0; i < 28; i++) {
      const q6Count = Math.floor(Math.random() * 3) + 1;
      const q7Count = Math.floor(Math.random() * 2);
      
      const selectedLiked = [];
      while(selectedLiked.length < q6Count) {
        const item = likedFeatures[Math.floor(Math.random() * likedFeatures.length)];
        if(!selectedLiked.includes(item)) selectedLiked.push(item);
      }
      
      const selectedImproved = [];
      if (q7Count === 0) {
        selectedImproved.push("없음");
      } else {
        while(selectedImproved.length < q7Count) {
          const item = improvedFeatures[Math.floor(Math.random() * improvedFeatures.length)];
          if(!selectedImproved.includes(item) && item !== "없음") selectedImproved.push(item);
        }
      }

      dummies.push({
        id: `dummy_${i}`,
        name: names[i % names.length] + (Math.floor(i / names.length) + 1),
        eduDate: dates[Math.floor(Math.random() * dates.length)],
        q1: Math.floor(Math.random() * 2) + 4, // 4 or 5
        q2: Math.floor(Math.random() * 3) + 3, // 3, 4, 5
        q3: Math.floor(Math.random() * 2) + 4, // 4 or 5
        q4: Math.floor(Math.random() * 3) + 3, // 3, 4, 5
        q5: Math.floor(Math.random() * 2) + 4, // 4 or 5 (추천의향)
        q6: selectedLiked,
        q6_etc: Math.random() > 0.8 ? "트렌디한 실습 구성이 좋았습니다." : "",
        q7: selectedImproved,
        q7_etc: Math.random() > 0.9 ? "쉬는 시간이 약간 더 길었으면 좋겠습니다." : "",
        q8: Math.random() > 0.5 ? "실무 기획안 작성 시 템플릿과 방법론을 적용해 보겠습니다." : "",
        q9: Math.random() > 0.6 ? "인큐베이터 기획 교육이 실무에 매우 큰 도움이 되었습니다. 강사님의 전문적인 피드백 감사드립니다." : "",
        submittedAt: new Date(Date.now() - (30 - i) * 6 * 3600 * 1000).toISOString()
      });
    }
    return dummies;
  }

  // 개별 설문 응답 삭제
  async deleteResponse(id) {
    if (this.type === 'firebase' && this.db) {
      return this.db.collection(this.collectionName).doc(id).delete();
    } else {
      let responses = this.getLocalResponses();
      responses = responses.filter(r => r.id !== id);
      localStorage.setItem(this.collectionName, JSON.stringify(responses));
      return true;
    }
  }

  // 다중 설문 응답 선택 삭제 (Batch 일괄 처리)
  async deleteResponses(ids) {
    if (this.type === 'firebase' && this.db) {
      const batch = this.db.batch();
      ids.forEach(id => {
        const docRef = this.db.collection(this.collectionName).doc(id);
        batch.delete(docRef);
      });
      return batch.commit();
    } else {
      let responses = this.getLocalResponses();
      responses = responses.filter(r => !ids.includes(r.id));
      localStorage.setItem(this.collectionName, JSON.stringify(responses));
      return true;
    }
  }
}

// 글로벌 인스턴스 노출
window.dbService = new DatabaseService();
