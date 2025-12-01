import { GoogleGenAI, Type } from "@google/genai";
import { ScheduleItem, AIAnalysisResult } from "../types";

const apiKey = process.env.API_KEY;

// Initialize Gemini Client
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const analyzeScheduleWithAI = async (
  schedule: ScheduleItem[],
  calculatedStressScore: number
): Promise<AIAnalysisResult> => {
  if (!ai) {
    throw new Error("API Key is missing.");
  }

  const model = "gemini-2.5-flash";
  
  // Simplify schedule for token efficiency
  const scheduleSummary = schedule.map(item => ({
    day: item.day,
    activity: item.name,
    type: item.type,
    duration: item.durationMinutes + " mins",
    time: `${item.startTime}-${item.endTime}`,
    note: item.note || ""
  }));

  const prompt = `
    你現在身兼兩職：
    1. 「大學生行程壓力分析師」：語氣輕鬆、幽默、像朋友一樣。
    2. 「智慧校園行事曆助理」：細心、條理分明。

    目前透過演算法計算出的基礎壓力指數是：${calculatedStressScore} (滿分100)。
    
    請分析以下一週行程 JSON，並回傳完整的 JSON 分析報告：
    ${JSON.stringify(scheduleSummary)}

    任務一：壓力分析
    1. stressScore: 修正後的壓力指數 (0-100)。
    2. peakStressDay: 哪一天最崩潰？
    3. riskFactors: 3個潛在風險。
    4. suggestions: 3個具體改善建議。
    5. encouragement: 一句有點好笑但在理的鼓勵。

    任務二：校園行事曆助理 (請根據備註與活動類型推斷)
    1. weeklySummary: 本週重點摘要 (一句話總結這週的主軸)。
    2. importantEvents: 整理重要時間點 (例如：考試、報告截止、打工、重要社團活動)。格式：{ date, time, title }。
    3. todoList: 根據行程推斷的待辦清單 (例如：看到"微積分"推斷"複習微積分"、看到"繳費"推斷"去超商")。
    4. reminders: 看看備註可能遺漏的提醒 (例如：繳費期限、作業期限、該帶的東西)。

    請回傳符合以下 Schema 的 JSON。
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            // Stress Part
            stressScore: { type: Type.NUMBER },
            peakStressDay: { type: Type.STRING },
            riskFactors: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            encouragement: { type: Type.STRING },

            // Calendar Assistant Part
            weeklySummary: { type: Type.STRING },
            importantEvents: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        date: { type: Type.STRING },
                        time: { type: Type.STRING },
                        title: { type: Type.STRING }
                    }
                }
            },
            todoList: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            },
            reminders: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
          },
          required: [
              "stressScore", "peakStressDay", "riskFactors", "suggestions", "encouragement",
              "weeklySummary", "importantEvents", "todoList", "reminders"
          ]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AIAnalysisResult;

  } catch (error) {
    console.error("AI Analysis failed", error);
    throw error;
  }
};