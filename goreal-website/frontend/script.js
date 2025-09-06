document.addEventListener('DOMContentLoaded', () => {
    
    // !!! QUAN TRỌNG: SAU KHI TRIỂN KHAI, BẠN SẼ THAY THẾ URL NÀY !!!
   const API_BASE_URL = 'http://127.0.0.1:5001';
   //const API_BASE_URL = 'https://goreal-470006.de.r.appspot.com';
    
    // --- Lấy và hiển thị nội dung động ---
    const fetchContent = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/get-website-content`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            populateContent(data);
            return data; // Trả về data để dùng cho chatbot
        } catch (error) {
            console.error('Failed to fetch website content:', error);
            document.getElementById('hero-title').innerText = 'Chào mừng đến với GoREAL!';
        }
    };

    const populateContent = (data) => {
        // Hero Section
        document.getElementById('hero-title').innerText = data.hero.title;
        document.getElementById('hero-description').innerText = data.hero.description;
        document.getElementById('hero-image-tag').src = data.hero.image_url;

        // About Section
        const aboutContainer = document.getElementById('about-container');
        aboutContainer.innerHTML = ''; 
        data.about.forEach(item => {
            const card = document.createElement('div');
            card.className = 'about-card';
            card.innerHTML = `<div class="icon">${item.icon}</div><h3>${item.title}</h3><p>${item.description}</p>`;
            aboutContainer.appendChild(card);
        });

        // How It Works Section
        document.getElementById('how-title').innerText = data.how_it_works.title;
        const stepsContainer = document.getElementById('how-steps-container');
        stepsContainer.innerHTML = '';
        data.how_it_works.steps.forEach(step => {
            const stepCard = document.createElement('div');
            stepCard.className = 'step-card';
            stepCard.innerText = step;
            stepsContainer.appendChild(stepCard);
        });
    };
    
    // --- Xử lý form đăng ký ---
    const registerForm = document.getElementById('register-form');
    const formMessage = document.getElementById('form-message');

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = {
            roblox_username: document.getElementById('roblox-username').value,
            parent_email: document.getElementById('parent-email').value,
            password: document.getElementById('password').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Registration failed');
            formMessage.innerText = result.message;
            formMessage.style.color = 'green';
            registerForm.reset();
        } catch (error) {
            formMessage.innerText = `Lỗi: ${error.message}`;
            formMessage.style.color = 'red';
        }
    });

    // --- LOGIC: CHATBOT ---
    const chatHistory = document.getElementById('chat-history');
    const chatInput = document.getElementById('chat-input');
    const chatSendButton = document.getElementById('chat-send-button');

    const addMessageToHistory = (message, sender) => {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}-message`;
        messageElement.innerText = message;
        chatHistory.appendChild(messageElement);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    };

    const handleSendMessage = async () => {
        const question = chatInput.value.trim();
        if (question === '') return;

        addMessageToHistory(question, 'user');
        chatInput.value = '';
        const typingIndicator = 'GoREAL Helper đang suy nghĩ...';
        addMessageToHistory(typingIndicator, 'bot');

        try {
            const response = await fetch(`${API_BASE_URL}/ask-goreal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question })
            });
            const data = await response.json();
            
            chatHistory.removeChild(chatHistory.lastChild); // Xóa "đang suy nghĩ"
            addMessageToHistory(data.answer, 'bot');

        } catch (error) {
            console.error('Chatbot error:', error);
            chatHistory.removeChild(chatHistory.lastChild); // Xóa "đang suy nghĩ"
            addMessageToHistory('Xin lỗi, tôi đang gặp sự cố kết nối.', 'bot');
        }
    };
    
    chatSendButton.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });

    // --- Chạy các hàm khởi tạo ---
    fetchContent().then(data => {
        if (data && data.chatbot) {
            addMessageToHistory(data.chatbot.welcome_message, 'bot');
        }
    });
});