// Firebase 데이터베이스 참조 가져오기
const database = firebase.database();

// 이름 해석 결과를 Firebase에 저장하는 함수
function saveAnalysisToFirebase(name, analysis) {
    // 고유 ID 생성
    const analysisId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    
    // Firebase에 저장
    database.ref('analyses/' + analysisId).set({
        name: name,
        analysis: analysis,
        timestamp: Date.now()
    });
    
    console.log('Firebase에 저장 완료:', analysisId);
    return analysisId;
}

// Firebase에서 이름 해석 결과를 가져오는 함수
function loadAnalysisFromFirebase(analysisId) {
    return new Promise((resolve, reject) => {
        database.ref('analyses/' + analysisId).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    console.log('Firebase에서 데이터 로드 성공');
                    resolve(snapshot.val());
                } else {
                    console.log('Firebase에 해당 ID의 데이터 없음');
                    reject(new Error('분석 결과를 찾을 수 없습니다.'));
                }
            })
            .catch((error) => {
                console.error('Firebase 로드 오류:', error);
                reject(error);
            });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const nameInput = document.getElementById('nameInput');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultSection = document.getElementById('resultSection');
    const characterAnalyses = document.getElementById('characterAnalyses');
    const fullNameAnalysis = document.getElementById('fullNameAnalysis');
    const errorMsg = document.getElementById('errorMsg');
    const kakaoShareBtn = document.getElementById('kakaoShareBtn');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const linkCopiedMsg = document.getElementById('linkCopiedMsg');
    
    // 카카오 SDK 초기화 (자신의 앱 키로 변경 필요)
    try {
        Kakao.init('YOUR_KAKAO_APP_KEY'); // 실제 서비스에서는 본인의 카카오 개발자 앱 키로 교체
        console.log('Kakao SDK initialized');
    } catch (error) {
        console.error('Kakao SDK initialization failed:', error);
    }
    
    // 분석 결과 데이터 저장 변수
    let currentAnalysisData = null;
    let currentNameSounds = '';
    
    // 서버 API 엔드포인트
    const API_ENDPOINT = '/api/analyze-name';
    
    analyzeBtn.addEventListener('click', async function() {
        // 입력값 가져오기
        const nameValue = nameInput.value.trim();
        
        // 입력값 검증
        if (!nameValue) {
            errorMsg.textContent = '이름을 입력해주세요.';
            return;
        }
        
        // 한자 이름 형식 검증 (간단한 검증)
        const nameParts = nameValue.split(' ');
        if (nameParts.length < 1) {
            errorMsg.textContent = '올바른 형식으로 입력해주세요.';
            return;
        }
        
        // 오류 메시지 초기화
        errorMsg.textContent = '';
        
        // 버튼 비활성화
        analyzeBtn.disabled = true;
        
        // 로딩 표시
        loadingIndicator.style.display = 'block';
        resultSection.style.display = 'none';
        
        try {
            // AI를 통한 이름 분석 요청
            const analysisResults = await analyzeNameWithAI(nameParts);
            
            // 분석 데이터 저장
            currentAnalysisData = analysisResults;
            
            // 한자음 결합
            currentNameSounds = nameParts.map(part => part.slice(-1)).join('');
            
            // 분석 결과 표시
            displayAnalysisResults(analysisResults, nameParts);
            
            // URL 파라미터 업데이트
            updateURLWithAnalysis(nameValue, analysisResults);
            
            // 로딩 숨기고 결과 표시
            loadingIndicator.style.display = 'none';
            resultSection.style.display = 'block';
        } catch (error) {
            console.error('분석 중 오류 발생:', error);
            errorMsg.textContent = '이름 분석 중 오류가 발생했습니다. 다시 시도해 주세요. ' + error.message;
            loadingIndicator.style.display = 'none';
        } finally {
            // 버튼 활성화
            analyzeBtn.disabled = false;
        }
    });
    
    // Enter 키 입력 이벤트 처리
    nameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            analyzeBtn.click();
        }
    });
    
// URL에서 파라미터 확인 및 처리
function checkURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const analysisId = urlParams.get('id');
    const name = urlParams.get('name');
    
    if (analysisId) {
        console.log('URL에서 분석 ID 발견:', analysisId);
        
        // 로딩 표시
        loadingIndicator.style.display = 'block';
        
        // Firebase에서 데이터 로드 시도
        loadAnalysisFromFirebase(analysisId)
            .then((data) => {
                console.log('Firebase에서 데이터 로드됨');
                
                // 입력창에 이름 설정
                nameInput.value = data.name;
                
                // 분석 데이터 저장
                currentAnalysisData = data.analysis;
                
                // 한자음 결합
                const nameParts = data.name.split(' ');
                currentNameSounds = nameParts.map(part => part.slice(-1)).join('');
                
                // 분석 결과 표시
                displayAnalysisResults(data.analysis, nameParts);
                
                // 로딩 숨기기
                loadingIndicator.style.display = 'none';
                
                // 결과 섹션 표시
                resultSection.style.display = 'block';
                
                // 결과 섹션으로 스크롤
                setTimeout(() => {
                    resultSection.scrollIntoView({ behavior: 'smooth' });
                }, 500);
            })
            .catch((error) => {
                console.error('Firebase 데이터 로드 오류:', error);
                loadingIndicator.style.display = 'none';
                
                // ID로 로드 실패 시 name 파라미터로 시도
                if (name) {
                    nameInput.value = name;
                    analyzeBtn.click();
                }
            });
    } else if (name) {
        // 기존 name 파라미터 처리
        nameInput.value = name;
        analyzeBtn.click();
    }
}
    
    // 페이지 로드 시 URL 파라미터 확인
    checkURLParameters();
    
// URL 업데이트 함수
function updateURLWithAnalysis(name, analysis) {
    // 한자음 결합
    const nameParts = name.split(' ');
    const nameSound = nameParts.map(part => part.slice(-1)).join('');
    
    // Firebase에 저장하고 ID 받기
    const analysisId = saveAnalysisToFirebase(name, analysis);
    
    // URL 객체 생성
    const url = new URL(window.location.origin + window.location.pathname);
    
    // 파라미터 추가
    url.searchParams.set('id', analysisId);
    url.searchParams.set('user', nameSound);
    
    // URL 업데이트 (페이지 새로고침 없이)
    window.history.pushState({id: analysisId}, '', url);
    
    // 세션 스토리지에도 백업으로 저장 (옵션)
    sessionStorage.setItem('currentAnalysis', JSON.stringify(analysis));
    sessionStorage.setItem('currentName', name);
    
    // 메타태그 업데이트
    updateMetaTags(nameSound, analysis);
    
    return url.toString();
}
    
    // 메타 태그 업데이트 함수
    function updateMetaTags(nameSound, analysis) {
        // 타이틀 변경
        document.title = `${nameSound}님의 이름 해석 결과`;
        
        // 오픈그래프 메타태그 업데이트
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) {
            ogTitle.setAttribute('content', `${nameSound}님의 이름 해석입니다`);
        }
        
        // 설명 업데이트
        const plainText = analysis.fullNameAnalysis
            .replace(/\*\*/g, '')
            .replace(/•/g, '')
            .substring(0, 100) + '...';
        
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) {
            ogDesc.setAttribute('content', plainText);
        }
    }
    
    // 카카오톡 공유 버튼 클릭 이벤트
    kakaoShareBtn.addEventListener('click', function() {
        if (!currentAnalysisData || !currentNameSounds) {
            alert('먼저 이름을 분석해주세요.');
            return;
        }
        
        // 공유할 URL 생성
        const shareUrl = window.location.href;
        
        // 분석 내용에서 첫 100자 추출 (마크다운 태그 제거)
        const analysisText = currentAnalysisData.fullNameAnalysis;
        const plainText = analysisText
            .replace(/\*\*/g, '') // 볼드 태그 제거
            .replace(/•/g, '') // 불릿 포인트 제거
            .substring(0, 100) + '...';
        
        try {
            Kakao.Link.sendDefault({
                objectType: 'feed',
                content: {
                    title: `${currentNameSounds}님의 이름 해석입니다`,
                    description: plainText,
                    imageUrl: 'https://your-site.com/images/og-image.jpg', // 실제 이미지 URL로 변경 필요
                    link: {
                        mobileWebUrl: shareUrl,
                        webUrl: shareUrl
                    }
                },
                buttons: [
                    {
                        title: '자세히 보기',
                        link: {
                            mobileWebUrl: shareUrl,
                            webUrl: shareUrl
                        }
                    },
                    {
                        title: '나도 분석하기',
                        link: {
                            mobileWebUrl: window.location.origin + window.location.pathname,
                            webUrl: window.location.origin + window.location.pathname
                        }
                    }
                ]
            });
        } catch (error) {
            console.error('카카오 공유 오류:', error);
            alert('카카오톡 공유 기능을 사용할 수 없습니다. 링크 복사를 이용해주세요.');
        }
    });
    
    // 링크 복사 버튼 클릭 이벤트
    copyLinkBtn.addEventListener('click', function() {
        if (!currentAnalysisData) {
            alert('먼저 이름을 분석해주세요.');
            return;
        }
        
        // 현재 URL 복사
        const shareUrl = window.location.href;
        
        navigator.clipboard.writeText(shareUrl)
            .then(() => {
                // 복사 성공 메시지 표시
                linkCopiedMsg.classList.add('show');
                setTimeout(() => {
                    linkCopiedMsg.classList.remove('show');
                }, 2000);
            })
            .catch(err => {
                console.error('링크 복사 오류:', err);
                alert('링크 복사에 실패했습니다. 직접 URL을 복사해주세요.');
            });
    });
    
    // OpenAI API를 사용하여 이름 분석
    async function analyzeNameWithAI(nameParts) {
        // 한자 이름 정보 구성
        const nameInfo = nameParts.map((part, index) => {
            // 한자 뜻과 음을 분리 (마지막 글자가 음)
            const sound = part.slice(-1);
            const meaning = part.slice(0, -1);
            return { meaning, sound, index: index + 1 };
        });
        
        const fullName = nameInfo.map(char => char.sound).join('');
        const fullMeanings = nameInfo.map(char => char.meaning).join(', ');
        
        // API 요청을 위한 메시지 구성
        const systemMessage = `당신은 한자 이름 해석 전문가입니다. 
        주어진 한자 이름에 대해 전체 이름의 의미를 깊이 있게 분석해주세요.
        분석 결과는 친근하고 재미있는 대화체로 작성해 주세요.
        이모티콘은 적절히 약간만 사용하고, 항목별로 구분하여 작성해 주세요.
        각 항목은 반드시 '•' 기호로만 구분하여 가독성을 높여주세요 (다른 기호 사용하지 마세요).
        항목의 제목은 굵은 글씨체(볼드체)로 처리해주세요.
        전체 이름 해석은 약 1000자 분량으로 작성해 주세요.
        내용은 흥미롭고 독자의 관심을 끌 수 있도록 작성해주세요.`;
        
        const userMessage = `다음은 한자 이름 정보입니다:
        전체 이름: ${fullName}
        각 글자 정보:
        ${nameInfo.map(char => `${char.index}번째 글자: ${char.sound} (${char.meaning})`).join('\n')}
        
        위 정보를 바탕으로 전체 이름에 대한 종합적인 해석 약 1000자를 작성해 주세요.
        다음과 같은 항목으로 구분하여 분석해 주세요:
        
        1. 이름의 전체적인 의미와 에너지
        2. 성격과 잠재력
        3. 대인관계와 사회생활 특성
        4. 이름이 주는 특별한 재능이나 장점
        5. 주의하면 좋을 점
        6. 미래의 가능성
        
        각 항목의 제목은 반드시 볼드체(굵은 글씨체)로 표시하고, 모든 항목은 '•' 기호로만 시작하여 구분해 주세요.
        이모티콘은 적절히 약간만 사용하고, 친근하고 재미있는 대화체로 작성해 주세요.
        딱딱하거나 형식적인 문체는 피하고, 흥미로운 내용으로 구성해 주세요.
        
        결과는 다음 JSON 형식으로 반환해주세요:
        {
          "fullNameAnalysis": "전체 이름에 대한 분석"
        }`;
        
        try {
            // 개발/프로덕션 환경 확인
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') {
                // 개발 환경 또는 파일 직접 실행 시 시뮬레이션 함수 사용
                console.log('로컬 환경에서 실행 중 - 시뮬레이션 데이터 사용');
                return simulateAIAnalysis(nameInfo, fullName, fullMeanings);
            } else {
                // 프로덕션 환경에서는 서버 API 호출
                return await callServerAPI(systemMessage, userMessage);
            }
        } catch (error) {
            console.error('API 호출 오류:', error);
            throw new Error('AI 분석 중 오류가 발생했습니다: ' + error.message);
        }
    }
    
    // AI 분석 결과를 표시하는 함수
    function displayAnalysisResults(results, nameParts) {
        // 문자 분석 섹션은 숨김 처리
        characterAnalyses.style.display = 'none';
        
        // 전체 이름 분석 표시 + 면책 문구 추가
        fullNameAnalysis.innerHTML = `
            <p>${results.fullNameAnalysis}</p>

        `;
        
        // 결과 섹션까지 스크롤
        resultSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // 서버 측 API 호출 함수
    async function callServerAPI(systemMessage, userMessage) {
        try {
            // 서버 측에 요청을 보내는 부분
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    systemMessage: systemMessage,
                    userMessage: userMessage
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('API 응답 오류:', errorData);
                throw new Error(`API 응답 오류: ${errorData.error || '알 수 없는 오류'}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API 호출 오류:', error);
            throw error;
        }
    }
    
    //
// OpenAI API 호출을 시뮬레이션하는 함수 (개발 환경용)
    async function simulateAIAnalysis(nameInfo, fullName, fullMeanings) {
        // API 요청 시뮬레이션을 위한 지연
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 전체 이름 분석 생성
        const fullNameAnalysis = generateFullNameAnalysis(nameInfo, fullName, fullMeanings);
        
        return {
            fullNameAnalysis
        };
    }
    
    // 전체 이름 분석 생성 (시뮬레이션용)
    function generateFullNameAnalysis(nameInfo, fullName, fullMeanings) {
        // 한자음 결합
        const sounds = nameInfo.map(char => char.sound).join('');
        
        // 이름 전체의 의미와 상징성을 분석
        const analysis = `안녕하세요, ${sounds}님! 당신의 이름에 담긴 의미를 함께 살펴볼게요! ✨

**이름의 전체적인 의미와 에너지**

• ${sounds}(${fullMeanings})라는 이름은 매우 독특한 의미의 조합을 가지고 있습니다. 각 글자가 마치 퍼즐 조각처럼 완벽하게 맞물려 하나의 아름다운 그림을 완성하고 있어요.

• 이 이름에서는 강인함과, 지혜로움, 그리고 창의적인 에너지가 느껴집니다. 마치 오랜 시간 자연이 빚어낸 보석같은 균형감이 돋보이는 이름이죠.

• 한자의 깊은 의미들이 서로 어우러져 '내면의 깊이'와 '외적인 표현력'이 조화를 이루는 사람임을 암시합니다.

**성격과 잠재력**

• 당신은 강한 직관력과 통찰력을 가진 사람입니다. 주변 사람들이 미처 보지 못하는 것을 발견하는 능력이 있어요.

• 어려운 상황에서도 침착함을 유지하며 문제를 해결하는 현실적인 접근법을 선호합니다. 이것은 당신의 이름이 가진 단단함과 깊이에서 비롯된 특성이죠.

• 창의적인 사고와 논리적 분석력이 균형을 이루고 있어, 예술적 감각과 실용적인 문제해결 능력을 모두 갖추고 있습니다. 이런 다재다능함은 당신을 다양한 분야에서 빛나게 할 거예요. 🌟

**대인관계와 사회생활 특성**

• 소수의 깊은 인연을 중요시하는 경향이 있습니다. 겉으로는 차분하게 보일 수 있지만, 신뢰할 수 있는 사람들과는 깊은 유대감을 형성해요.

• 듣는 것을 잘하며, 상대방의 이야기에 진심으로 공감하는 능력이 있습니다. 이런 특성 때문에 사람들은 당신에게 자연스럽게 마음을 열게 됩니다.

• 갈등 상황에서는 중재자 역할을 할 때가 많습니다. 다양한 관점을 이해하고 조율하는 능력이 뛰어나기 때문이죠.

**이름이 주는 특별한 재능이나 장점**

• ${sounds}라는 이름은 특히 깊이 생각하고 분석하는 능력을 강화해줍니다. 복잡한 개념을 이해하고 정리하는 데 탁월한 재능이 있어요.

• 인내심과 끈기가 남다릅니다. 시작한 일은 끝까지 해내려는 의지가 강하며, 이는 장기적인 목표를 달성하는 데 큰 도움이 됩니다.

• 예술적 감각과 실용적 지혜가 공존하는 독특한 창의성을 지니고 있습니다. 이런 특성은 문제 해결에 새로운 접근법을 찾는 데 도움이 되죠.

**주의하면 좋을 점**

• 완벽주의 성향이 있어 때로는 스스로에게 지나치게 높은 기준을 적용할 수 있습니다. 가끔은 자신에게 여유를 주는 것이 중요해요.

• 깊은 생각에 빠져 실행을 미루는 경향이 있을 수 있습니다. 때로는 분석을 멈추고 행동으로 옮기는 용기가 필요할 때도 있어요.

• 다른 사람의 감정과 니즈에 너무 맞추다 보면 자신의 욕구를 무시할 수 있습니다. 자신의 필요와 균형을 맞추는 연습이 도움이 될 수 있어요.

**미래의 가능성**

• 당신의 이름이 지닌 에너지는 시간이 지날수록 더욱 빛을 발할 것입니다. 경험이 쌓일수록 이름에 담긴 지혜와 강인함이 더 깊어질 거예요.

• 다양한 분야에서 성취를 이룰 수 있는 잠재력을 가지고 있습니다. 특히 창의성과 분석력이 모두 필요한 영역에서 두각을 나타낼 수 있어요.

• 인생의 여정에서 만나는 다양한 도전들을 자신만의 방식으로 극복하며, 결국 균형 잡히고 풍요로운 삶을 이루게 될 것입니다. ✨

${sounds}님, 이름은 단순한 호칭 이상의 의미를 가집니다. 당신의 이름에 담긴 특별한 에너지가 인생의 여정에서 긍정적인 나침반이 되어주길 바랍니다!`;
        
        return analysis;
    }
});