import { GoogleGenAI } from "@google/genai";
import { SourceLink, Language } from "../types";

// NOTE: We do NOT initialize `ai` at the top level here.
// In a Vite/Browser environment, top-level execution happens before our `index.tsx` polyfill runs,
// which would cause a "process is not defined" crash.
// Instead, we initialize it lazily inside the function.

interface SearchResult {
  text: string;
  sources: SourceLink[];
}

export const fetchTopicUpdate = async (
  topicQuery: string, 
  language: Language,
  excludedSources: string[] = []
): Promise<SearchResult> => {
  // Vite 'define' plugin will replace process.env.API_KEY with the string literal of the key at build time.
  // If it is missing, it will be undefined.
  if (!process.env.API_KEY) {
    console.error("API Key is missing. Ensure VITE_API_KEY is set in Vercel.");
    return {
      text: language === 'zh' 
        ? "配置错误：系统未检测到 API 密钥。请检查 Vercel 环境变量设置 (VITE_API_KEY)，并重新部署应用。" 
        : "Configuration Error: API Key missing. Please check Vercel environment variables (VITE_API_KEY) and redeploy.",
      sources: []
    };
  }

  // Initialize the client strictly using the process.env.API_KEY as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-2.5-flash";
  
  const langInstruction = language === 'zh' 
    ? "Please write the summary strictly in Simplified Chinese (简体中文)." 
    : "Please write the summary strictly in English.";

  const exclusions = excludedSources.length > 0 
    ? `Please IGNORE and DO NOT use any information from the following sources/platforms: ${excludedSources.join(', ')}.`
    : "";

  // Construct a prompt that encourages searching specific platforms as requested
  const prompt = `
    Please search for the latest information regarding this topic: "${topicQuery}".
    
    I need you to look for recent updates from professional news websites and social media.
    ${exclusions}
    
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

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Extract error details for better debugging in UI
    const errorMessage = error.message || error.toString();
    const isQuotaError = errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("billing") || errorMessage.includes("400");
    const isAuthError = errorMessage.includes("403") || errorMessage.includes("key") || errorMessage.includes("permission");
    
    let userMessage = language === 'zh' 
        ? "抱歉，暂时无法获取该主题的更新。" 
        : "Sorry, I couldn't fetch updates for this topic at the moment.";

    // Generic link, but helpful
    const billingLink = "https://console.cloud.google.com/billing/linkedaccount?project=infopluse";

    if (isAuthError) {
        userMessage = language === 'zh' 
            ? `API 权限错误 (403)。您的项目可能未关联结算账户。\n\n**解决方法**：\n请访问 [Google Cloud Console](${billingLink}) 并为项目 "infopluse" 选择一个结算账户 (Billing Account)。`
            : `API Permission Error (403). Your project might not be linked to a billing account.\n\n**Fix**: Visit [Google Cloud Console](${billingLink}) and link a billing account to "infopluse".`;
    } else if (isQuotaError) {
        userMessage = language === 'zh' 
             ? `API 配额或结算错误 (Billing/Quota)。\nGoogle Cloud 要求项目必须关联有效的结算账户。\n\n**请点击修复**：\n[关联结算账户](${billingLink})`
             : `API Failure (Billing/Quota). Google Cloud requires a linked billing account.\n\n**Click to Fix**:\n[Link Billing Account](${billingLink})`;
    }

    // Append the raw error for clarity
    return {
      text: `⚠️ ${userMessage}\n\n(Error Details: ${errorMessage})`,
      sources: []
    };
  }
};