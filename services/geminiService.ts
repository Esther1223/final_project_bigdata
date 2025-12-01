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
    time: `${item.startTime}-${item.endTime}`
  }));

  const prompt = `
    你是「大學生行程壓力分析師」，語氣輕鬆、幽默、像朋友一樣（使用台灣大學生用語）。
    目前透過演算法計算出的基礎壓力指數是：${calculatedStressScore} (滿分100)。
    
    請分析以下一週行程 JSON，並給出更深入的見解：
    ${JSON.stringify(scheduleSummary)}

    請回傳 JSON 格式：
    1. stressScore: 根據你的 AI 判斷，修正後的壓力指數 (0-100)。如果行程真的很滿，不要客氣給高分。
    2. peakStressDay: 哪一天看起來最崩潰？(例如: "Mon", "Tue"...)
    3. riskFactors: 3個潛在風險 (例如：睡眠不足、連上6小時課、完全沒休息)。
    4. suggestions: 3個具體改善建議 (例如：週三空堂去睡覺、打工排太滿了)。
    5. encouragement: 一句有點好笑但在理的鼓勵。
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
            encouragement: { type: Type.STRING }
          },
          required: ["stressScore", "peakStressDay", "riskFactors", "suggestions", "encouragement"]
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