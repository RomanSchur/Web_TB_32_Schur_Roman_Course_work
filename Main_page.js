document.addEventListener('DOMContentLoaded', function() {
    const logUser = localStorage.getItem('loggedInUser');
    const isLog = localStorage.getItem('isLoggedIn');
        if (!logUser && !isLog) {
        alert('Потрібну зареєструватись,або увійти у ваш обліковий запис.');
        window.location.href = 'LoginANDregistration.html';
        return;
    }
    let currentUser = null;

    if (logUser) {
        try {
            currentUser = JSON.parse(logUser);
        } catch (e) {
            console.error("Помилка розбору даних користувача з localStorage:", e);
            localStorage.removeItem('loggedInUser');
            localStorage.removeItem('isLoggedIn');
        }
    }
    const newsListContainer = document.getElementById('newsList');
    const categoryFilterSelect = document.getElementById('categoryFilter');
    const userInfoContainer = document.getElementById('userInfo');

    const addNewsModal = document.getElementById('addNewsModal');
    const close = document.getElementById('closeAddNewsModal');
    const addNews = document.getElementById('addNewsForm');
    const CategorySelect = document.getElementById('newsCategory');
    const addNewsMessage = document.getElementById('addNewsFormMessage');

    function displayUserInfo() {
        let greeting = `<span class="user-greeting">Вітаємо, ${currentUser.fullName}!</span>`;
        let adminControls = '';
        if (currentUser && currentUser.roleId === 1) {//перевірка на адміна
            adminControls = '<button id="addNewsBtn" class="admin-button">Додати новину</button>';
        }
        if (userInfoContainer) {userInfoContainer.innerHTML = `${greeting}${adminControls}<button id="logoutButton">Вийти</button>`;}

        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', function() {
                localStorage.removeItem('loggedInUser');
                localStorage.removeItem('isLoggedIn');
                window.location.href = 'LoginANDregistration.html';
            });
        }
        const addNews = document.getElementById('addNewsBtn');
        if (addNews) {
            addNews.addEventListener('click', function() {
                if (addNewsModal) {
                    addNewsModal.style.display = 'block';
                    populateCategoriesInForm();
                } else {
                    console.error("вікно 'addNewsModal' не знайдено");
                }
            });
        }
    }
    async function populateCategoriesInForm() {
        if (!CategorySelect) { // Використано нове ім'я
            console.error("Елемент select 'newsCategory' для форми додавання новини не знайдено.");
            return;
        }
        while (CategorySelect.options.length > 1) {
            CategorySelect.remove(1);
        }
        if (CategorySelect.options.length === 0 || CategorySelect.options[0].value !== "") {
            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.textContent = "Оберіть категорію...";
            defaultOption.disabled = true;
            defaultOption.selected = true;
            CategorySelect.insertBefore(defaultOption, CategorySelect.firstChild);
        }
        try {
            const response = await fetch('http://localhost:3001/api/categories');
            const categoriesData = await response.json();
            if (categoriesData.success ) {
                categoriesData.data.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    CategorySelect.appendChild(option);
                });
            } else {
                console.error('Не вдалося завантажити категорії для форми:', categoriesData);
                if(addNewsMessage) addNewsMessage.textContent = 'Помилка завантаження категорій.';
            }
        } catch (error) {
            console.error('Не вдалося завантажити категорії для форми:', error);
            if(addNewsMessage) {
                addNewsMessage.textContent = `Помилка завантаження категорій: ${error.message}`;
                addNewsMessage.style.color = 'red';
            }
        }
    }

    if (addNewsModal) {
        if (close) {
            close.onclick = function() {
                addNewsModal.style.display = 'none';
                if(addNews) addNews.reset();
                if(addNewsMessage) addNewsMessage.textContent = '';
            }
        }
        window.onclick = function(event) {
            if (event.target == addNewsModal) {
                addNewsModal.style.display = 'none';
                if(addNews) addNews.reset();
                if(addNewsMessage) addNewsMessage.textContent = '';
            }
        }
        if (addNews) {
            addNews.addEventListener('submit',async function(event) {
                event.preventDefault();
                if(addNewsMessage) {
                    addNewsMessage.textContent = 'Обробка додавання...';
                    addNewsMessage.style.color = 'inherit';
                }
                const formData = new FormData(addNews);
                if (currentUser && currentUser.id) {
                    formData.append('author_id', currentUser.id);
                } else {
                    if(addNewsMessage) {
                        addNewsMessage.textContent = 'Помилка: не вдалося визначити автора.';
                        addNewsMessage.style.color = 'red';
                    }
                    return;
                }
                if (!formData.get('newsTitle') || !formData.get('newsContent') || !formData.get('newsCategory')) {
                    if(addNewsMessage) {
                        addNewsMessage.textContent = 'Заголовок, зміст та категорія є обов\'язковими.';
                        addNewsMessage.style.color = 'red';
                    }
                    return;
                }
                try {
                    const response = await fetch('http://localhost:3001/api/news', {
                        method: 'POST',
                        body: formData
                    });
                    const result = await response.json();
                    if (result.success) {
                        if(addNewsMessage) {
                            addNewsMessage.textContent = result.message || 'Новину успішно додано!';
                            addNewsMessage.style.color = 'green';
                        }
                        addNews.reset();
                        fetchAndDisplayNews(categoryFilterSelect ? categoryFilterSelect.value : '', document.getElementById('searchInput').value);
                        setTimeout(() => {
                            addNewsModal.style.display = 'none';
                            if(addNewsMessage) addNewsMessage.textContent = '';
                        }, 2000);
                    } else {
                        if(addNewsMessage) {
                            addNewsMessage.textContent = result.message || 'Помилка при додаванні новини.';
                            addNewsMessage.style.color = 'red';
                        }
                    }
                } catch (error) {
                    console.error('Помилка відправки форми додавання новини:', error);
                    if(addNewsMessage) {
                        addNewsMessage.textContent = `Серверна помилка: ${error.message}`;
                        addNewsMessage.style.color = 'red';
                    }
                }
            });
        }
    } else {
        console.warn("Елементи модального вікна для додавання новин не знайдені на сторінці.");
    }

    async function fetchCategoriesForFilter() {
        if (!categoryFilterSelect) {
            return;
        }
        try {
            const response = await fetch('http://localhost:3001/api/categories');
            const categoriesData = await response.json();
            if (categoriesData.success && Array.isArray(categoriesData.data)) {
                categoriesData.data.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    categoryFilterSelect.appendChild(option);
                });
            }  else {
                console.error('Не вдалося завантажити категорії для фільтра (неправильний формат або неуспіх):', categoriesData);
            }
        } catch (error) {
            console.error('Не вдалося завантажити категорії для фільтра:', error);
        }
    }
    async function fetchAndDisplayNews(categoryId = '', searchTerm = '') {
        if (!newsListContainer) {
            return;
        }
        newsListContainer.innerHTML = '<p>Завантаження новин...</p>';
        let apiUrl = 'http://localhost:3001/api/news';
        const queryParams = [];
        if (categoryId) queryParams.push(`categoryId=${categoryId}`);
        if (searchTerm) queryParams.push(`search=${encodeURIComponent(searchTerm)}`);
        if(queryParams.length > 0) apiUrl += '?' + queryParams.join('&');

        try {
            const response = await fetch(apiUrl);
            const newsData = await response.json();
            newsListContainer.innerHTML = '';

            if (newsData.success && Array.isArray(newsData.data) && newsData.data.length > 0) {
                newsData.data.forEach(news => {
                    const newsItemDiv = document.createElement('div');
                    newsItemDiv.classList.add('news-item');
                    const authorName = news.author_name ? ` <span class="news-author">(Автор: ${news.author_name})</span>` : '';
                    newsItemDiv.innerHTML = `<h3>${news.title}</h3>${authorName}`;
                    newsItemDiv.addEventListener('click', () => {
                        window.location.href = `Full_news_page.html?id=${news.id}`;
                    });
                    newsListContainer.appendChild(newsItemDiv);
                });
            } else if (newsData.success && newsData.data.length === 0) {
                newsListContainer.innerHTML = '<p>Новин за обраними критеріями не знайдено.</p>';
            } else {
                newsListContainer.innerHTML = '<p>Не вдалося завантажити новини.</p>';
            }
        } catch (error) {
            if (newsListContainer) newsListContainer.innerHTML = `<p>Помилка при завантаженні новин: ${error.message}.</p>`;
        }
    }
    if (categoryFilterSelect) {
        categoryFilterSelect.addEventListener('change', function() {
            const selectedCategoryId = this.value;
            const searchInput = document.getElementById('searchInput');
            const currentSearchTerm = searchInput ? searchInput.value : '';
            fetchAndDisplayNews(selectedCategoryId, currentSearchTerm);
        });
    }
    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');

    function performSearch() {
        const searchTerm = searchInput ? searchInput.value : '';
        const currentCategoryId = categoryFilterSelect ? categoryFilterSelect.value : '';
        fetchAndDisplayNews(currentCategoryId, searchTerm);
    }

    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') performSearch();
        });
    }
    displayUserInfo();
    fetchCategoriesForFilter();
    fetchAndDisplayNews();
});