document.addEventListener('DOMContentLoaded', function() {
    const pageContainer = document.querySelector('.page-container');
    const fullNewsContainer = document.getElementById('fullNewsContainer');
    const backButton = document.getElementById('backToMainPage');
    const ButtonsContainer = document.getElementById('ButtonsContainer');
    let currentUser = null;
    const UserData = localStorage.getItem('loggedInUser');
    if (UserData) {
        try {
            currentUser = JSON.parse(UserData);
        } catch (e) {
            console.error("Помилка розбору даних користувача з localStorage:", e);
            localStorage.removeItem('loggedInUser');
        }
    }
    function getNewsId() {
        const urlSearchParams = new URLSearchParams(window.location.search);
        const newsId = urlSearchParams.get('id');
        return newsId;
    }

    async function deleteNews(newsId) {
        if (!confirm('Ви впевнені, що хочете видалити цю новину?')) {
            return;
        }
        try {
            const response = await fetch(`http://localhost:3001/api/news/${newsId}`, {
                method: 'DELETE',
            });
            const result = await response.json();

            if (result.success) {
                alert(result.message || 'Новину успішно видалено.');
                window.location.href = 'Main_page.html';
            } else {
                alert(`Помилка при видаленні новини: ${result.message || 'Невідома помилка сервера.'}`);
            }
        } catch (error) {
            console.error('Помилка при відправці запиту на видалення новини:', error);
            alert(`Сталася помилка при спробі видалити новину: ${error.message}. Спробуйте пізніше.`);
        }
    }
    async function DisplayNews() {
        const newsId = getNewsId();

        if (!newsId) {
            if (fullNewsContainer) fullNewsContainer.innerHTML = '<p class="error-message">ID новини не вказано в адресі.</p>';
            return;
        }
        if (fullNewsContainer) fullNewsContainer.innerHTML = '<p class="loading-message">Завантаження повної новини, будь ласка, зачекайте...</p>';
        if (ButtonsContainer) ButtonsContainer.innerHTML = '';
        try {
            const apiUrl = `http://localhost:3001/api/news/${newsId}`;
            const response = await fetch(apiUrl);
            const result = await response.json();

            if (result.success && result.data) {
                const newsData = result.data;
                if (fullNewsContainer) fullNewsContainer.innerHTML = '';

                const existingCloseButton = pageContainer.querySelector('.close-button-container');
                if (existingCloseButton) existingCloseButton.remove();
                const closeButtonContainer = document.createElement('div');
                closeButtonContainer.classList.add('close-button-container');
                const closeButtonElement = document.createElement('button');
                closeButtonElement.classList.add('close-button');
                closeButtonElement.title = "Повернутися на попередню сторінку";
                closeButtonElement.onclick = function() { window.history.back(); };
                closeButtonContainer.appendChild(closeButtonElement);
                if (pageContainer.firstChild) {
                    pageContainer.insertBefore(closeButtonContainer, pageContainer.firstChild);
                } else {
                    pageContainer.appendChild(closeButtonContainer);
                }

                const newsHeaderDiv = document.createElement('div');
                newsHeaderDiv.classList.add('news-header');
                const newsTitleElement = document.createElement('h1');
                newsTitleElement.textContent = newsData.title || 'Без заголовка';
                newsHeaderDiv.appendChild(newsTitleElement);

                const newsBodyLayoutDiv = document.createElement('div');
                newsBodyLayoutDiv.classList.add('news-body-layout');
                const fullTextDiv = document.createElement('div');
                fullTextDiv.classList.add('full-text-column');
                const newsContentText = newsData.content || 'Текст новини відсутній.';
                const contentParagraphs = newsContentText.split('\n');
                contentParagraphs.forEach(function(paragraphText) {
                    if (paragraphText.trim() !== '') {
                        const pElement = document.createElement('p');
                        pElement.textContent = paragraphText;
                        fullTextDiv.appendChild(pElement);
                    }
                });
                newsBodyLayoutDiv.appendChild(fullTextDiv);

                if (newsData.photo_url) {
                    const photoDiv = document.createElement('div');
                    photoDiv.classList.add('photo-news-column');
                    const img = document.createElement('img');
                    if (newsData.photo_url.startsWith('/')) {
                        img.src = `http://localhost:3001${newsData.photo_url}`;
                    } else {
                        img.src = newsData.photo_url;
                    }
                    img.alt = `Фото: ${newsData.title || 'новини'}`;
                    photoDiv.appendChild(img);
                    newsBodyLayoutDiv.appendChild(photoDiv);
                }

                const newsFooterDiv = document.createElement('div');
                newsFooterDiv.classList.add('news-footer');
                const authorInfoDiv = document.createElement('div');
                authorInfoDiv.classList.add('author-info');
                authorInfoDiv.textContent = `Автор: ${newsData.author_name || 'Невідомий'}`;
                const dateInfoDiv = document.createElement('div');
                dateInfoDiv.classList.add('date-info');
                let publicationDateText;
                if (newsData.publication_date) {
                    const dateObject = new Date(newsData.publication_date);
                    publicationDateText = dateObject.toLocaleDateString('uk-UA', {
                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    });
                } else {
                    publicationDateText = 'Дата невідома';
                }
                dateInfoDiv.textContent = `Дата публікації: ${publicationDateText}`;
                newsFooterDiv.appendChild(authorInfoDiv);
                newsFooterDiv.appendChild(dateInfoDiv);

                if(fullNewsContainer){
                    fullNewsContainer.appendChild(newsHeaderDiv);
                    fullNewsContainer.appendChild(newsBodyLayoutDiv);
                    fullNewsContainer.appendChild(newsFooterDiv);
                }

                if (currentUser && currentUser.roleId === 1 && ButtonsContainer) {
                    const deleteButton = document.createElement('button');
                    deleteButton.classList.add('delete-button');
                    deleteButton.textContent = 'Видалити новину';
                    deleteButton.onclick = function() {
                        deleteNews(newsData.id);
                    };
                    ButtonsContainer.appendChild(deleteButton);
                }
            } else {
                let message = 'Новину не знайдено або сталася помилка при отриманні даних.';
                if (result && result.message) message = result.message;
                if (fullNewsContainer) fullNewsContainer.innerHTML = `<p class="error-message">${message}</p>`;
            }
        } catch (error) {
            console.error('Помилка при завантаженні повної новини:', error);
            if (fullNewsContainer) fullNewsContainer.innerHTML = `<p class="error-message">Сталася помилка: ${error.message}. Будь ласка, спробуйте оновити сторінку пізніше.</p>`;
        }
    }
    if (backButton) {
        backButton.addEventListener('click', function() {
            window.location.href = 'Main_page.html';
        });
    }
    DisplayNews();
});