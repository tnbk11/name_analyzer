document.addEventListener('DOMContentLoaded', function() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const nameInput = document.getElementById('nameInput');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultSection = document.getElementById('resultSection');
    const characterAnalyses = document.getElementById('characterAnalyses');
    const fullNameAnalysis = document.getElementById('fullNameAnalysis');
    const errorMsg = document.getElementById('errorMsg');
    
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
            
            // 분석 결과 표시
            displayAnalysisResults(analysisResults, nameParts);
            
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
        분석 결과는 친근하고 톡톡 튀는 대화체로 작성해 주세요.
        이모티콘을 적절히 사용하고, 문장은 짧고 읽기 쉽게 구성해 주세요.
        전체 이름 해석은 약 500자 분량으로 작성해 주세요.`;
        
        const userMessage = `다음은 한자 이름 정보입니다:
        전체 이름: ${fullName}
        각 글자 정보:
        ${nameInfo.map(char => `${char.index}번째 글자: ${char.sound} (${char.meaning})`).join('\n')}
        
        위 정보를 바탕으로 전체 이름에 대한 종합적인 해석 약 500자를 작성해 주세요.
        이모티콘을 사용하고 친근하고 톡톡 튀는 대화체로 작성해주세요.
        딱딱하거나 형식적인 문체는 피하고, 마치 친구에게 이야기하듯 재미있게 작성해주세요.
        
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
        
        // 전체 이름 분석 표시
        fullNameAnalysis.innerHTML = `<p>${results.fullNameAnalysis}</p>`;
        
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
        
        // 이모티콘 리스트
        const emojis = ['✨', '🌟', '💫', '🔮', '⭐', '🌈', '💎', '🌱', '🌊', '🍀', '🌞'];
        
        // 랜덤 이모티콘 선택
        function getRandomEmoji() {
            return emojis[Math.floor(Math.random() * emojis.length)];
        }
        
        // 이름 전체의 의미와 상징성을 분석
        const analysis = `${getRandomEmoji()} 안녕하세요, ${sounds}님! 당신의 멋진 이름을 분석해볼게요! ${getRandomEmoji()}

${sounds}(${fullMeanings})라는 이름은 정말 특별한 의미를 담고 있어요! 이 이름은 마치 퍼즐 조각처럼 각 글자의 의미가 모여 당신만의 독특한 이야기를 만들어내고 있답니다. ${getRandomEmoji()}

우와~ 당신은 타고난 통찰력을 가졌네요! ${getRandomEmoji()} 주변 사람들에게 영감을 주는 사람이라고 할 수 있어요. 첫 번째 글자부터 강한 에너지가 느껴져요. 그리고 나머지 글자들이 이를 더욱 빛나게 해주고 있죠!

인생의 여러 도전 앞에서도 무너지지 않는 내면의 강인함을 가지고 있어요. 정말 대단해요! ${getRandomEmoji()} 높은 목표를 향해 계속 나아가는 성향도 보여요. 어려운 상황에서도 항상 해결책을 찾아내는 지혜의 소유자랍니다!

유연하게 상황에 대처하면서도 자신의 핵심 가치는 절대 잃지 않는... 음~ 이런 균형 감각이 정말 멋져요! ${getRandomEmoji()} 이런 특별한 자질이 당신을 다양한 분야에서 빛나게 할 거예요.

${sounds}님의 이름은 마치 밤하늘의 별자리처럼 여러 빛나는 요소들이 모여 만들어진 작품 같아요! ${getRandomEmoji()} 이 멋진 이름과 함께 앞으로도 행복하고 의미 있는 삶을 살아가시길 바랄게요! ${getRandomEmoji()}`;
        
        return analysis;
    }
});