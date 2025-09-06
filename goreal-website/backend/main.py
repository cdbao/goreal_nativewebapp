from flask import Flask, jsonify, request
from flask_cors import CORS
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import os
import google.generativeai as genai
from dotenv import load_dotenv  # <-- THÊM DÒNG NÀY

# Tải các biến từ file .env vào môi trường
load_dotenv()  # <-- THÊM DÒNG NÀY

app = Flask(__name__)
CORS(app)

# --- CẤU HÌNH ---
# Lấy API Key từ biến môi trường đã được tải từ file .env
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
model = None  # Khởi tạo model là None

if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-pro-latest")
        print("✅ Đã cấu hình Gemini API thành công!")
    except Exception as e:
        print(f"⚠️ Lỗi khi cấu hình Gemini: {e}")
else:
    print(
        " Cảnh báo: GEMINI_API_KEY chưa được thiết lập. Chatbot sẽ dùng câu trả lời mẫu."
    )

# ... (Toàn bộ phần code còn lại của main.py giữ nguyên không thay đổi) ...
WEBSITE_CONTENT_SHEET_NAME = "GoReal_Website_Content"
GOREAL_KNOWLEDGE_BASE = """
GoREAL là một dự án game giáo dục (EduGame) đột phá, kết hợp giữa nền tảng game Roblox và các thử thách ngoài đời thực. 
Mục tiêu chính là huấn luyện trẻ từ 8-15 tuổi phát triển toàn diện dựa trên 3 trụ cột:
1. Trí Tuệ (Wisdom): Các thử thách khuyến khích sự sáng tạo, tư duy logic, và giải quyết vấn đề như viết truyện ngắn, giải đố Sudoku, hoặc lập trình cơ bản.
2. Nghị Lực (Willpower): Các thử thách rèn luyện tính kỷ luật, sự kiên trì và những thói quen tốt như dọn dẹp phòng, dậy sớm, đọc sách mỗi ngày.
3. Thể Chất (Physical): Các thử thách khuyến khích vận động, tăng cường sức khỏe như chạy bộ, tập thể dục, chơi thể thao.
"""


def get_live_content():
    try:
        scope = [
            "https://spreadsheets.google.com/feeds",
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive.file",
            "https://www.googleapis.com/auth/drive",
        ]
        creds_path = os.path.join(
            os.path.dirname(__file__), "goreal-470006-ac9c0ea86e0c.json"
        )
        creds = ServiceAccountCredentials.from_json_keyfile_name(creds_path, scope)
        client = gspread.authorize(creds)
        sheet = client.open(WEBSITE_CONTENT_SHEET_NAME)

        hero_ws = sheet.worksheet("Hero")
        hero_data = dict(hero_ws.get_all_values()[1:])
        about_ws = sheet.worksheet("AboutCards")
        about_data = about_ws.get_all_records()
        how_ws = sheet.worksheet("HowToSteps")
        how_data_raw = how_ws.get_all_records()[0]
        how_data = {
            "title": how_data_raw.get("title"),
            "steps": [how_data_raw.get(f"step{i+1}") for i in range(4)],
        }
        chatbot_ws = sheet.worksheet("Chatbot")
        chatbot_data = dict(chatbot_ws.get_all_values()[1:])

        content = {
            "hero": hero_data,
            "about": about_data,
            "how_it_works": how_data,
            "chatbot": chatbot_data,
        }
        return content
    except Exception as e:
        print(f"LỖI: Không thể đọc dữ liệu từ Google Sheet! - {e}")
        return {"error": f"Could not retrieve content from CMS. Details: {e}"}


@app.route("/get-website-content", methods=["GET"])
def get_website_content():
    return jsonify(get_live_content())


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    return jsonify({"status": "success", "message": "Đăng ký thành công!"})


@app.route("/ask-goreal", methods=["POST"])
def ask_goreal():
    user_question = request.get_json().get("question", "")
    if not user_question:
        return jsonify({"answer": "Vui lòng đặt một câu hỏi."})

    if not model:
        return jsonify(
            {"answer": "Xin lỗi, chức năng chatbot chưa được cấu hình API Key."}
        )

    expert_prompt = f"""Bối cảnh: {GOREAL_KNOWLEDGE_BASE}
---
Dựa vào bối cảnh trên, hãy trả lời câu hỏi sau như một trợ lý thân thiện, nhiệt tình tên là GoREAL Helper. Câu trả lời cần ngắn gọn, dễ hiểu và chỉ tập trung vào các thông tin liên quan đến GoREAL. Nếu câu hỏi không liên quan đến bối cảnh, hãy trả lời một cách lịch sự rằng: "Tôi là trợ lý ảo của GoREAL và chỉ có thể cung cấp thông tin về dự án này thôi. Bạn có câu hỏi nào khác về GoREAL không?".
Câu hỏi của người dùng: "{user_question}"
Câu trả lời của GoREAL Helper:"""

    try:
        response = model.generate_content(expert_prompt)
        return jsonify({"answer": response.text})
    except Exception as e:
        print(f"LỖI: Không thể gọi Gemini API! - {e}")
        return jsonify({"answer": "Xin lỗi, tôi đang gặp một sự cố nhỏ."}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
