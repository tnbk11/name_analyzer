const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// OpenAI API 키는 환경 변수에서 가져옵니다
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 이름 분석 API 엔드포인트
app.post('/api/analyze-name', async (req, res) => {
    try {
        const { systemMessage, userMessage } = req.body;

        if (!systemMessage || !userMessage) {
            return res.status(400).json({ error: '필수 파라미터가 누락되었습니다.' });
        }

        if (!OPENAI_API_KEY) {
            return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
        }

        // OpenAI API 호출
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: systemMessage
                    },
                    {
                        role: "user",
                        content: userMessage
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API 오류:', errorData);
            return res.status(response.status).json({ 
                error: errorData.error?.message || '알 수 없는 오류가 발생했습니다.' 
            });
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            return res.status(500).json({ error: 'API 응답 형식이 올바르지 않습니다.' });
        }

        const content = data.choices[0].message.content;

        // JSON 형식으로 파싱 시도
        try {
            const result = JSON.parse(content);
            return res.json(result);
        } catch (parseError) {
            console.error('JSON 파싱 오류:', parseError);
            console.log('받은 텍스트:', content);
            
            // JSON 파싱 실패 시 텍스트 내용을 기반으로 응답 생성
            // 이 부분은 OpenAI API가 예상과 다른 형식을 반환할 경우를 대비한 처리
            return res.status(500).json({ 
                error: '응답을 처리할 수 없습니다. 다시 시도해 주세요.' 
            });
        }
    } catch (error) {
        console.error('서버 오류:', error);
        res.status(500).json({ error: '내부 서버 오류가 발생했습니다.' });
    }
});

// 모든 경로를 index.html로 리다이렉트 (SPA 지원)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});