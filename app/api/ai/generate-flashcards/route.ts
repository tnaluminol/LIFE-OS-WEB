import { NextRequest, NextResponse } from 'next/server';
import { generateAiResponse } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { text, count = 10, preferredType = 'mixed' } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length < 15) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp nội dung văn bản ít nhất 15 ký tự' },
        { status: 400 }
      );
    }

    const systemPrompt = `Bạn là một chuyên gia giáo dục và AI soạn thảo đề thi / Flashcards thông minh theo chuẩn Spaced Repetition và Quizlet.
Nhiệm vụ của bạn là đọc kỹ đoạn văn bản hoặc lý thuyết được cung cấp, sau đó trích xuất ra đúng ${count} câu hỏi Flashcard / Trắc nghiệm theo yêu cầu:
- preferredType: "${preferredType}" (Nếu 'mixed': kết hợp cân bằng giữa 'flashcard_2sided', 'multiple_choice', 'fill_in_blank'. Nếu cụ thể một loại thì ưu tiên loại đó).
- Hỗ trợ công thức Toán/Lý/Hóa bằng chuẩn LaTeX (đặt trong $công thức$ hoặc $$công thức$$).
- Tạo câu hỏi có chất lượng sư phạm cao, rõ ràng, kèm giải thích chi tiết.

Bạn BẮT BUỘC phải phản hồi DUY NHẤT một JSON hợp lệ có cấu trúc sau (không thêm bất kỳ văn bản giải thích markdown nào khác ngoài JSON):
{
  "title": "Tiêu đề bộ thẻ ngắn gọn",
  "description": "Mô tả ngắn gọn nội dung kiến thức của bộ thẻ",
  "subject": "physics" | "math" | "chemistry" | "english" | "biology" | "history" | "informatics" | "general",
  "grade_level": "grade_10" | "grade_11" | "grade_12" | "university" | "ielts" | "other",
  "cards": [
    {
      "card_type": "flashcard_2sided" | "multiple_choice" | "fill_in_blank",
      "front_text": "Câu hỏi, thuật ngữ, công thức LaTeX $...$ hoặc từ vựng",
      "back_text": "Đáp án chi tiết hoặc giải thích",
      "options": [
        { "id": "A", "text": "Lựa chọn A" },
        { "id": "B", "text": "Lựa chọn B" },
        { "id": "C", "text": "Lựa chọn C" },
        { "id": "D", "text": "Lựa chọn D" }
      ],
      "correct_option": "A" (hoặc từ chính xác nếu là fill_in_blank),
      "explanation": "Lời giải thích chi tiết vì sao đúng",
      "hint": "Gợi ý ngắn gọn"
    }
  ]
}`;

    const userPrompt = `Nội dung tài liệu cần trích xuất thành ${count} câu Flashcards/Quiz:\n\n${text.slice(0, 4000)}`;

    const aiResponse = await generateAiResponse('learning', [
      { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` },
    ]);

    // Parse JSON
    let parsedData;
    try {
      const cleanJson = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    } catch {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse AI JSON output');
      }
    }

    return NextResponse.json(parsedData);
  } catch (err: any) {
    console.error('[API:generate-flashcards] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Lỗi khi tạo câu hỏi bằng AI' },
      { status: 500 }
    );
  }
}
