document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form-container');
    const registerForm = document.getElementById('register-form-container');
    const showRegisterButton = document.getElementById('showRegisterBtn');
    const showLoginButton = document.getElementById('showLoginBtn');
    const loginFormElement = document.getElementById('loginForm');
    const registerFormElement = document.getElementById('registerForm');
    const loginMessageElement = document.getElementById('loginMessage');
    const registerMessageElement = document.getElementById('registerMessage');

    function displayLoginForm() {
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
        if (registerMessageElement) registerMessageElement.textContent = '';
    }

    function displayRegisterForm() {
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
        if (loginMessageElement) loginMessageElement.textContent = '';
    }

    if (showRegisterButton) {
        showRegisterButton.addEventListener('click', function() {
            displayRegisterForm();
        });
    }

    if (showLoginButton) {
        showLoginButton.addEventListener('click', function() {
            displayLoginForm();
        });
    }

    if (loginFormElement) {
        loginFormElement.addEventListener('submit', async function(event) {
            event.preventDefault();
            if (loginMessageElement) {
                loginMessageElement.textContent = '';
                loginMessageElement.className = 'message';
            }
            const usernameInput = document.getElementById('loginUsername');
            const passwordInput = document.getElementById('loginPassword');
            const usernameValue = usernameInput ? usernameInput.value : '';
            const passwordValue = passwordInput ? passwordInput.value : '';

            if (usernameValue === '' || passwordValue === '') {
               if (loginMessageElement) {
                    loginMessageElement.textContent = 'Будь ласка, заповніть поля "Логін" та "Пароль".';
                    loginMessageElement.classList.add('error');
                }
                return;
            }
            if (loginMessageElement) {
                loginMessageElement.textContent = 'Перевірка даних...';
                loginMessageElement.classList.remove('error', 'success');
            }
            try {
                const response = await fetch('http://localhost:3001/api/login', {
                    method: 'POST', // Вказуємо HTTP-метод POST.
                    headers: { // Вказуємо заголовки запиту.
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({username: usernameValue,password: passwordValue})
                });
                const data = await response.json();
                if (data.success) {
                    if (loginMessageElement) {
                        loginMessageElement.textContent = data.message || 'Вхід успішний! Перенаправлення...';
                        loginMessageElement.classList.add('success');
                    }
                    if (data.user) {
                        localStorage.setItem('loggedInUser', JSON.stringify(data.user));
                    } else {
                        localStorage.setItem('isLoggedIn', 'true');
                    }
                    setTimeout(function() {
                        window.location.href = 'Main_page.html';
                    }, 1000);
                } else {
                    if (loginMessageElement) {
                        loginMessageElement.textContent = data.message || 'Помилка входу.';
                        loginMessageElement.classList.add('error');
                    }
                }
            } catch (error) {
                if (loginMessageElement) {
                    loginMessageElement.textContent = `Сталася помилка.`;
                    loginMessageElement.classList.add('error');
                }
            }
        });
    }
    if (registerFormElement) {
        registerFormElement.addEventListener('submit', async function(event) {
            event.preventDefault();
            if (registerMessageElement) {
                registerMessageElement.textContent = '';
                registerMessageElement.className = 'message';
            }
            const usernameInput = document.getElementById('registerUsername');
            const fullNameInput = document.getElementById('registerFullName');
            const passwordInput = document.getElementById('registerPassword');
            const confirmPasswordInput = document.getElementById('registerConfirmPassword');

            const usernameValue = usernameInput ? usernameInput.value : '';
            const fullNameValue = fullNameInput ? fullNameInput.value : '';
            const passwordValue = passwordInput ? passwordInput.value : '';
            const confirmPasswordValue = confirmPasswordInput ? confirmPasswordInput.value : '';

            if (usernameValue === '' || fullNameValue === '' || passwordValue === '' || confirmPasswordValue === '') {
                if (registerMessageElement) {
                    registerMessageElement.textContent = 'Будь ласка, заповніть усі поля для реєстрації.';
                    registerMessageElement.classList.add('error');
                }
                return;
            }
            if (passwordValue !== confirmPasswordValue) {
                if (registerMessageElement) {
                    registerMessageElement.textContent = 'Паролі не співпадають. Будь ласка, перевірте.';
                    registerMessageElement.classList.add('error');
                }
                return;
            }
            if (registerMessageElement) {
                registerMessageElement.textContent = 'Реєстрація обробляється...';
                registerMessageElement.classList.remove('error', 'success');
            }
            const userData = {
                username: usernameValue,
                full_name: fullNameValue,
                password: passwordValue
            };
            try {
                const response = await fetch('http://localhost:3001/api/register', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(userData)
                });
                if (!response.ok) {
                    let errorText = `Помилка сервера: ${response.status}`;
                    try {
                        const errorData = await response.json();
                        if (errorData && errorData.message) errorText = errorData.message;
                    } catch (e) {}
                    throw new Error(errorText);
                }
                const data = await response.json();
                if (data.success) {
                    if (registerMessageElement) {
                        registerMessageElement.textContent = data.message + ' Тепер можете увійти.';
                        registerMessageElement.classList.add('success');
                    }
                    if (registerFormElement) registerFormElement.reset();
                    setTimeout(function() {
                        displayLoginForm();
                        const loginUsernameField = document.getElementById('loginUsername');
                        if (loginUsernameField) loginUsernameField.value = usernameValue;
                    }, 2500);
                } else {
                    if (registerMessageElement) {
                        registerMessageElement.textContent = data.message || 'Помилка реєстрації.';
                        registerMessageElement.classList.add('error');
                    }
                }
            } catch (error) {
                console.error('Помилка під час відправки запиту на реєстрацію:', error);
                if (registerMessageElement) {
                    registerMessageElement.textContent = `Сталася помилка: ${error.message}. Спробуйте пізніше.`;
                    registerMessageElement.classList.add('error');
                }
            }
        });
    }
});