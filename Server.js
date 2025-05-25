const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();
const port = 3001;

const Database_info = {
    host: "localhost",
    user: "root",
    password: "root",
    database: "factory"
};
const pool = mysql.createPool(Database_info);


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const newsImagesDir = path.join(__dirname, 'public', 'images', 'news');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
       cb(null, newsImagesDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(new Error('Дозволено завантажувати лише файли формату jpeg, png!'), false);
    }
};

const upload = multer({// multer з налаштуваннями
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 },
    fileFilter: fileFilter
});
app.post('/api/register', async function(req, res) {// API для реєстрації нового користувача
    const username = req.body.username;
    const fullName = req.body.full_name;
    const plainPassword = req.body.password;
    const defaultUserRoleId = 2;
    if (!username || !fullName || !plainPassword) {
        return res.status(400).json({ success: false, message: 'Будь ласка, заповніть усі обов\'язкові поля для реєстрації.' });
    }
    try {
        const [existingUsers] = await pool.query('SELECT id FROM User WHERE username = ?', [username]);

        if (existingUsers.length > 0) {
            return res.status(409).json({ success: false, message: 'Користувач з таким логіном вже існує.' });
        }
        const [result] = await pool.query('INSERT INTO User (username, full_name, password, role_id) VALUES (?, ?, ?, ?)',[username, fullName, plainPassword, defaultUserRoleId]);
        if (result.affectedRows > 0) {
            res.status(201).json({ success: true, message: 'Реєстрація успішна!', userId: result.insertId });
        } else {
            res.status(500).json({ success: false, message: 'Під час реєстрації сталася помилка на сервері' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Під час реєстрації сталася помилка на сервері.' });
    }
});

app.post('/api/login', async function(req, res) {// API для входу
    const username = req.body.username;
    const plainPasswordFromUser = req.body.password;
    if (!username || !plainPasswordFromUser) {
        return res.status(400).json({ success: false, message: 'Введіть логін та пароль.' });
    }
    try {
        const [users] = await pool.query('SELECT id, username, password, role_id, full_name FROM User WHERE username = ?',[username]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Неправильний логін або пароль.' });
        }
        const user = users[0];
        const storedPassword = user.password;
        if (plainPasswordFromUser === storedPassword) {
            res.status(200).json({success: true,message: 'Вхід успішний!',user: { id: user.id, username: user.username, fullName: user.full_name, roleId: user.role_id }});
        } else {
            res.status(401).json({ success: false, message: 'Неправильний пароль.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Під час входу сталася помилка на сервері. Спробуйте пізніше.' });
    }
});

app.get('/api/categories', async function(req, res) {// API для отримання списку категорій
    try {
        const [categories] = await pool.query('SELECT id, name FROM Category ORDER BY name');
        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Не вдалося завантажити категорії.' });
    }
});

app.get('/api/news', async function(req, res) {// API для отримання списку новин
    const categoryId = req.query.categoryId;
    const searchTerm = req.query.search;
    const limit = parseInt(req.query.limit) || 5;
    let sqlQuery = `
        SELECT
            News.id, News.title, News.content, News.publication_date, News.photo_url,
            News.category_id, News.author_id, User.full_name AS author_name
        FROM News
                 LEFT JOIN User ON News.author_id = User.id
    `;
    const queryParams = [];
    let conditions = [];
    if (categoryId) {
        conditions.push('News.category_id = ?');
        queryParams.push(categoryId);
    }
    if (searchTerm) {
        conditions.push('(News.title LIKE ? OR News.content LIKE ?)');
        queryParams.push(`%${searchTerm}%`);
        queryParams.push(`%${searchTerm}%`);
    }
    if (conditions.length > 0) {
        sqlQuery += ' WHERE ' + conditions.join(' AND ');
    }
    sqlQuery += ' ORDER BY News.publication_date DESC';
    sqlQuery += ' LIMIT ?';
    queryParams.push(limit);
    try {
        const [news] = await pool.query(sqlQuery, queryParams);
        res.status(200).json({ success: true, data: news });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Не вдалося завантажити новини.' });
    }
});
app.get('/api/news/:id', async function(req, res) {// API для отримання новини за її ID для відображення повної інформації
    const newsId = req.params.id;
    if (!newsId || isNaN(parseInt(newsId))) {
        return res.status(400).json({ success: false, message: 'Некоректний ID новини.' });
    }
    try {
        const query = `
            SELECT
                News.id, News.title, News.content, News.publication_date, News.photo_url,
                News.category_id, News.author_id, User.full_name AS author_name
            FROM News
                     LEFT JOIN User ON News.author_id = User.id
            WHERE News.id = ?
        `;
        const [newsRows] = await pool.query(query, [newsId]);
        if (newsRows.length > 0) {
            res.status(200).json({ success: true, data: newsRows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Новину з таким ID не знайдено.' });
        }
    } catch (error) {
        console.error(`Помилка при отриманні новини ID ${newsId}:`, error);
        res.status(500).json({ success: false, message: 'Не вдалося завантажити новину.' });
    }
});
app.post('/api/news', upload.single('newsImage'), async function(req, res) {// API для додавання новини
    const title = req.body.newsTitle;
    const content = req.body.newsContent;
    const category_id_str = req.body.newsCategory;
    const author_id_str = req.body.author_id;
    let photoPath = null;
    if (req.file) {
        photoPath = `/images/news/${req.file.filename}`;
    }
    const category_id = category_id_str ? parseInt(category_id_str, 10) : null;
    const author_id = author_id_str ? parseInt(author_id_str, 10) : null;
    if (!title || !content || !category_id || !author_id) {
        return res.status(400).json({ success: false, message: 'Будь ласка, заповніть усі обов\'язкові поля: заголовок, зміст, ID категорії та ID автора.' });
    }
    try {
        const [result] = await pool.query('INSERT INTO News (title, content, category_id, author_id, photo_url) VALUES (?, ?, ?, ?, ?)',[title, content, category_id, author_id, photoPath]);
        if (result.affectedRows > 0) {
            const newNewsId = result.insertId;
            const [addedNews] = await pool.query(
                `SELECT News.id, News.title, News.content, News.publication_date, News.photo_url,
                        News.category_id, News.author_id, User.full_name AS author_name 
                 FROM News 
                 LEFT JOIN User ON News.author_id = User.id
                 WHERE News.id = ?`,
                [newNewsId]
            );
            res.status(201).json({ success: true, message: 'Новину додано!', data: addedNews[0] });
        } else {
            if (req.file) { fs.unlink(req.file.path, (err) => { if (err) console.error("Помилка видалення файлу при невдалому записі в БД:", err); }); }
            res.status(500).json({ success: false, message: 'Не вдалося додати новину до бази даних.' });
        }
    } catch (error) {
        if (req.file) { fs.unlink(req.file.path, (err) => { if (err) console.error("Помилка видалення файлу при серверній помилці:", err); });}
        res.status(500).json({ success: false, message: 'Серверна помилка при додаванні новини.' });
    }
});

app.delete('/api/news/:id', async function(req, res) {//API для видалення
    const newsId = req.params.id;
    if (!newsId || isNaN(parseInt(newsId))) {
        return res.status(400).json({ success: false, message: 'Некоректний ID новини.' });
    }
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const [newsRows] = await connection.query('SELECT photo_url FROM News WHERE id = ?', [newsId]);
        let photoPathToDelete = null;
        if (newsRows.length > 0 && newsRows[0].photo_url) {
            photoPathToDelete = path.join(__dirname, 'public', newsRows[0].photo_url);
        }
        const [result] = await connection.query('DELETE FROM News WHERE id = ?', [newsId]);

        if (result.affectedRows > 0) {
            if (photoPathToDelete) {
                if (fs.existsSync(photoPathToDelete)) {
                    fs.unlink(photoPathToDelete, (err) => {
                        if (err) {
                            console.error(`Помилка при видаленні файлу ${photoPathToDelete}:`, err);
                        } else {
                        }
                    });
                }
            }
            await connection.commit();
            res.status(200).json({ success: true, message: 'Новину успішно видалено.' });
        } else {
            await connection.rollback();
            res.status(404).json({ success: false, message: 'Новину з таким ID не знайдено для видалення.' });
        }
    } catch (error) {
        if (connection) await connection.rollback();
        res.status(500).json({ success: false, message: 'Серверна помилка при видаленні новини.' });
    } finally {
        if (connection) connection.release();
    }
});

app.use((err, req, res, next) => {
    console.error("Сталася помилка на сервері (перехоплено middleware):", err.message || err);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: `Помилка завантаження файлу: ${err.message}` });
    } else if (err) {
        const statusCode = err.status || err.statusCode || 400;
        return res.status(statusCode).json({ success: false, message: err.message || 'Невідома помилка обробки запиту' });
    }
    next();
});
app.listen(port, function() {
    console.log(`сервер запущено`);
});