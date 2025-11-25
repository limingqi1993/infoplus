import { GoogleGenAI } from "@google/genai";
import { SourceLink, Language } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

interface SearchResult {
  text: string;
  sources: SourceLink[];
}

export const fetchTopicUpdate = async (topicQuery: string, language: Language): Promise<SearchResult> => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const modelId = "gemini-2.5-flash";
  
  const langInstruction = language === 'zh' 
    ? "Please write the summary strictly in Simplified Chinese (简体中文)." 
    : "Please write the summary strictly in English.";

  // Construct a prompt that encourages searching specific platforms as requested
  const prompt = `
    Please search for the latest information regarding this topic: "${topicQuery}".
    
    I need you to look for recent updates from:
    1. Professional news websites (Global and Chinese).
    2. Social media discussions if relevant (e.g., X/Twitter, Weibo, WeChat public accounts).
    
    Summarize the latest findings in a concise, engaging way (about 100-150 words). 
    Include dates of events if found.
    
    IMPORTANT CITATION FORMAT: 
    When you mention a fact, cite the source using a bracketed number like [1], [2], etc. corresponding to the order of information found. 
    Ensure these numbers appear inline within the text (e.g., "The event happened yesterday[1].").
    
    Format the output in Markdown. 
    If there is no recent news (last 48 hours), summarize the most relevant general status of the topic.
    
    ${langInstruction}
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // We do not use responseMimeType: 'application/json' because googleSearch is active
      },
    });

    const text = response.text || (language === 'zh' ? "未找到相关信息。" : "No information found.");
    
    // Extract grounding chunks for sources
    const sources: SourceLink[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({
            title: chunk.web.title,
            url: chunk.web.uri
          });
        }
      });
    }

    return {
      text,
      sources
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      text: language === 'zh' 
        ? "抱歉，暂时无法获取该主题的更新。请检查网络或API密钥。" 
        : "Sorry, I couldn't fetch updates for this topic at the moment. Please check your network or API key.",
      sources: []
    };
  }
};