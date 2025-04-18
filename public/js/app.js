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
        주어진 한자 이름에 대해 각 글자의 의미와 전체 이름의 의미를 깊이 있게 분석해주세요. 
        각 글자의 해석은 100-150자, 전체 이름 해석은 약 500자 분량으로 작성해 주세요.`;
        
        const userMessage = `다음은 한자 이름 정보입니다:
        전체 이름: ${fullName}
        각 글자 정보:
        ${nameInfo.map(char => `${char.index}번째 글자: ${char.sound} (${char.meaning})`).join('\n')}
        
        위 정보를 바탕으로 다음을 제공해주세요:
        1. 각 글자별 의미와 상징성에 대한 해석 (각 100-150자)
        2. 전체 이름에 대한 종합적인 해석 (약 500자)
        
        결과는 다음 JSON 형식으로 반환해주세요:
        {
          "characters": [
            {
              "sound": "글자1",
              "meaning": "뜻1",
              "analysis": "글자1에 대한 분석"
            },
            ...
          ],
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
        // 문자 분석 섹션 초기화
        characterAnalyses.innerHTML = '';
        
        // 각 글자 분석 표시
        results.characters.forEach((charInfo, index) => {
            const analysis = document.createElement('div');
            analysis.className = 'character-analysis';
            analysis.innerHTML = `
                <h3>${index + 1}번째 글자: ${charInfo.sound} (${charInfo.meaning})</h3>
                <p>${charInfo.analysis}</p>
            `;
            
            characterAnalyses.appendChild(analysis);
        });
        
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
        
        // 각 글자별 분석 생성
        const characters = nameInfo.map(char => {
            return {
                sound: char.sound,
                meaning: char.meaning,
                analysis: generateCharacterAnalysis(char.meaning, char.sound)
            };
        });
        
        // 전체 이름 분석 생성
        const fullNameAnalysis = generateFullNameAnalysis(nameInfo, fullName, fullMeanings);
        
        return {
            characters,
            fullNameAnalysis
        };
    }
    
    // 각 글자별 분석 생성 (시뮬레이션용)
    function generateCharacterAnalysis(meaning, sound) {
        // 특정 한자 뜻에 따른 분석 (시뮬레이션)
        if (meaning.includes('검을')) {
            return `'${sound}(${meaning})'은(는) 검은색이나 어둠을 상징하는 글자로, 깊이와 신비로움을 나타냅니다. 이 글자는 심오한 지혜와 통찰력을 가진 사람을 의미하며, 겉으로 드러나지 않는 내면의 강인함을 상징합니다. 어둠 속에서도 진실을 찾아내는 능력과 깊은 사고력을 지닌 사람을 암시합니다.`;
        } else if (meaning.includes('마루')) {
            return `'${sound}(${meaning})'은(는) 높은 곳이나 정상을 의미하는 글자로, 탁월함과 성취를 상징합니다. 이 글자가 이름에 있다는 것은 뛰어난 리더십과 목표를 달성하는 능력을 가질 것임을 암시합니다. 어떤 분야에서든 최고를 추구하며 높은 이상과 포부를 가지고 살아가는 사람임을 나타냅니다.`;
        } else if (meaning.includes('굳셀')) {
            return `'${sound}(${meaning})'은(는) 견고함과 강인함을 나타내는 글자로, 흔들리지 않는 의지와 결단력을 상징합니다. 이 글자는 어떤 어려움에도 굴하지 않는 강한 정신력의 소유자임을 나타냅니다. 외부의 압력이나 유혹에도 자신의 원칙을 지키며 꿋꿋이 자신의 길을 걸어가는 굳건한 성품을 의미합니다.`;
        } else if (meaning.includes('별빛')) {
            return `'${sound}(${meaning})'은(는) 밤하늘의 별을 상징하는 글자로, 밝은 지혜와 희망을 의미합니다. 이 글자가 이름에 있으면 어둠 속에서도 방향을 제시하는 안내자 역할을 할 수 있음을 암시합니다. 주변 사람들에게 영감과 빛을 주며, 어려운 상황에서도 희망을 잃지 않는 밝은 성품을 지닌 사람을 나타냅니다.`;
        } else if (meaning.includes('나무')) {
            return `'${sound}(${meaning})'은(는) 생명력과 성장을 상징하는 글자로, 끊임없이 발전하고 성장하는 사람을 의미합니다. 이 글자는 단단한 뿌리와 같은 안정성과 함께 유연성도 갖추고 있음을 나타냅니다. 역경 속에서도 끊임없이 성장하며, 자신뿐만 아니라 주변 사람들에게도 풍요로운 그늘을 제공하는 포용력을 지닌 사람임을 의미합니다.`;
        } else if (meaning.includes('물흐를')) {
            return `'${sound}(${meaning})'은(는) 물의 흐름처럼 유연하고 적응력이 뛰어남을 상징하는 글자입니다. 이 글자는 상황에 맞게 변화할 수 있는 지혜와 끊임없이 앞으로 나아가는 진취적인 성향을 나타냅니다. 장애물을 만나도 그것을 우회하여 결국 목표에 도달하는 물의 지혜를 가진 사람임을 의미합니다.`;
        } else if (meaning.includes('쇠')) {
            return `'${sound}(${meaning})'은(는) 금속의 강인함과 단단함을 상징하는 글자입니다. 이 글자는 견고한 의지와 결단력, 그리고 흔들리지 않는 원칙을 가진 사람을 나타냅니다. 어떤 역경에도 굴하지 않고 자신의 가치를 지켜나가는 강인한 정신력을 지닌 사람임을 의미합니다.`;
        } else if (meaning.includes('물')) {
            return `'${sound}(${meaning})'은(는) 물처럼 맑고 깨끗한 마음과 유연한 적응력을 상징하는 글자입니다. 이 글자는 상황에 따라 유연하게 대처하는 지혜와 지속적으로 앞으로 나아가는 진취적인 성향을 나타냅니다. 주변 환경에 자연스럽게 적응하면서도 자신만의 방향성을 잃지 않는 균형 잡힌 성격을 의미합니다.`;
        } else if (meaning.includes('남쪽')) {
            return `'${sound}(${meaning})'은(는) 남쪽의 따뜻함과 밝은 빛을 상징하는 글자입니다. 이 글자는 밝고 활기찬 에너지와 열정을 가진 사람을 나타냅니다. 주변 사람들에게 따뜻한 에너지를 전하며 어려운 상황에서도 긍정적인 태도로 빛을 발하는 사람임을 의미합니다.`;
        } else {
            // 기본 분석 (기타 한자 의미에 대한 일반적인 분석)
            return `'${sound}(${meaning})'은(는) ${meaning}의 의미를 가진 글자로, 삶의 중요한 가치와 덕목을 상징합니다. 이 글자는 이름의 주인에게 특별한 개성과 운명을 부여합니다. 한자의 깊은 의미처럼 풍부한 내면세계와 특별한 재능을 지닌 사람으로, 주변 사람들에게 긍정적인 영향력을 발휘할 수 있는 잠재력을 지니고 있습니다.`;
        }
    }
    
    // 전체 이름 분석 생성 (시뮬레이션용)
    function generateFullNameAnalysis(nameInfo, fullName, fullMeanings) {
        // 한자음 결합
        const sounds = nameInfo.map(char => char.sound).join('');
        
        // 이름 전체의 의미와 상징성을 분석
        const analysis = `${sounds}(${fullMeanings})이라는 이름은 매우 깊은 의미와 상징성을 담고 있습니다. 각 글자가 가진 개별적인 의미가 조화롭게 어우러져 독특한 개성과 운명의 길을 암시합니다.

이 이름의 주인은 타고난 지혜와 통찰력으로 주변 사람들에게 영감을 주는 사람입니다. 첫 번째 글자에서 나타나는 특성이 이름 전체의 기반을 형성하며, 다음 글자들이 이를 보완하고 발전시키는 형태로 조화를 이룹니다. 삶의 여정에서 마주하는 다양한 도전을 극복할 수 있는 내면의 강인함과 결단력을 지니고 있으며, 이는 이름에 담긴 한자의 깊은 의미에서 잘 드러납니다.

특히 이 이름은 높은 이상과 목표를 향해 끊임없이 노력하는 성향을 나타내며, 어려움 속에서도 자신의 길을 찾아가는 지혜를 상징합니다. 삶에서 마주하는 다양한 상황에 유연하게 대처하면서도 자신의 핵심 가치와 원칙은 굳건히 지키는 균형 잡힌 성격을 가질 가능성이 높습니다. 이는 삶의 다양한 분야에서 균형 잡힌 성취를 이루는 원동력이 될 것입니다.

이 이름이 지닌 글자들의 조합은 지적인 능력과 감성적인 풍요로움이 균형을 이루는 복합적인 성격을 형성합니다. 다양한 관점에서 문제를 바라볼 수 있는 유연한 사고방식과 함께, 확고한 원칙과 가치관을 지키는 굳건함도 함께 갖추고 있어, 주변 사람들에게 신뢰와 존경을 받을 수 있는 자질을 갖추고 있습니다.

${sounds}님은 삶의 여정에서 이름이 가진 의미를 충실히 살아내며, 자신의 잠재력을 최대한 발휘하여 의미 있는 삶을 살아갈 것입니다. 이름에 담긴 특별한 에너지와 의미가 평생 동안 긍정적인 영향력으로 작용하여, 풍요롭고 가치 있는 인생을 이끌어 나갈 것입니다.`;
        
        return analysis;
    }
});