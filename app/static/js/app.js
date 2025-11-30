const API_BASE = "/api";
const TOKEN_KEY = "bookstore_token";

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    } else {
        localStorage.removeItem(TOKEN_KEY);
    }
}

async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = options.headers || {};

    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(API_BASE + path, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let detail = "Ошибка запроса";
        try {
            const data = await response.json();
            if (data && data.detail) {
                detail = data.detail;
            }
        } catch (e) {
            // ignore
        }
        throw new Error(detail);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

// --- UI helpers ---

function updateNavAuthState() {
    const token = getToken();
    const loginLink = document.getElementById("nav-login-link");
    const registerLink = document.getElementById("nav-register-link");

    if (!loginLink || !registerLink) return;

    if (token) {
        loginLink.textContent = "Выйти";
        loginLink.href = "#";
        loginLink.onclick = (e) => {
            e.preventDefault();
            setToken(null);
            window.location.href = "/";
        };
        registerLink.style.display = "none";
    } else {
        loginLink.textContent = "Войти";
        loginLink.href = "/login";
        loginLink.onclick = null;
        registerLink.style.display = "inline-block";
    }
}

// --- Страница каталога ---

async function initIndexPage() {
    const listEl = document.getElementById("books-list");
    if (!listEl) return;

    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-btn");
    const resetBtn = document.getElementById("search-reset-btn");

    const genreSelect = document.getElementById("filter-genre");
    const authorSelect = document.getElementById("filter-author");
    const minPriceInput = document.getElementById("filter-min-price");
    const maxPriceInput = document.getElementById("filter-max-price");
    const minYearInput = document.getElementById("filter-min-year");
    const maxYearInput = document.getElementById("filter-max-year");
    const orderSelect = document.getElementById("filter-order");

    async function loadFilters() {
        try {
            const [genres, authors] = await Promise.all([
                apiFetch("/dicts/genres"),
                apiFetch("/dicts/authors"),
            ]);

            genres.forEach((g) => {
                const opt = document.createElement("option");
                opt.value = g.genre_id;
                opt.textContent = g.name;
                genreSelect.appendChild(opt);
            });

            authors.forEach((a) => {
                const opt = document.createElement("option");
                opt.value = a.author_id;
                opt.textContent = a.full_name;
                authorSelect.appendChild(opt);
            });
        } catch (e) {
            console.error("Ошибка загрузки фильтров:", e);
        }
    }

    async function loadBooks() {
        listEl.innerHTML = "Загрузка...";

        const params = new URLSearchParams();

        const q = searchInput.value.trim();
        if (q) params.append("q", q);

        if (genreSelect.value) params.append("genre_id", genreSelect.value);
        if (authorSelect.value) params.append("author_id", authorSelect.value);

        if (minPriceInput.value) params.append("min_price", minPriceInput.value);
        if (maxPriceInput.value) params.append("max_price", maxPriceInput.value);

        if (minYearInput.value) params.append("min_year", minYearInput.value);
        if (maxYearInput.value) params.append("max_year", maxYearInput.value);

        if (orderSelect.value) params.append("order_by", orderSelect.value);

        try {
            const query = params.toString();
            const books = await apiFetch(`/books${query ? "?" + query : ""}`);

            if (!books.length) {
                listEl.innerHTML = "<p>Книг не найдено</p>";
                return;
            }

            listEl.innerHTML = "";
            books.forEach((b) => {
                const card = document.createElement("div");
                card.className = "card";

                const cover = b.cover_image
                    ? `<div class="card__cover"><img src="${b.cover_image}" alt="Обложка"></div>`
                    : `<div class="card__cover card__cover_placeholder">Нет обложки</div>`;

                card.innerHTML = `
                    ${cover}
                    <div class="card__body">
                        <h2>${b.title}</h2>
                        <p>Цена: ${b.price} ₽</p>
                        <p>Год: ${b.publication_year || "-"}</p>
                        <a href="/books/${b.book_id}">Подробнее</a>
                    </div>
                `;
                listEl.appendChild(card);
            });
        } catch (e) {
            listEl.innerHTML = `<p class="message message_error">${e.message}</p>`;
        }
    }

    searchBtn.addEventListener("click", () => {
        loadBooks();
    });

    resetBtn.addEventListener("click", () => {
        searchInput.value = "";
        genreSelect.value = "";
        authorSelect.value = "";
        minPriceInput.value = "";
        maxPriceInput.value = "";
        minYearInput.value = "";
        maxYearInput.value = "";
        orderSelect.value = "";
        loadBooks();
    });

    // По Enter в строке поиска
    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            loadBooks();
        }
    });

    await loadFilters();
    await loadBooks();
}

// --- Страница книги ---

async function initBookDetailPage() {
    const container = document.getElementById("book-detail");
    if (!container) return;

    const bookId = container.getAttribute("data-book-id");
    const contentEl = document.getElementById("book-content");
    const btn = document.getElementById("add-to-cart-btn");

    try {
        const book = await apiFetch(`/books/${bookId}`);
        const cover = book.cover_image
            ? `<div class="book-detail__cover"><img src="${book.cover_image}" alt="Обложка"></div>`
            : `<div class="book-detail__cover book-detail__cover_placeholder">Нет обложки</div>`;

        contentEl.innerHTML = `
            <div class="book-detail__layout">
                ${cover}
                <div class="book-detail__info">
                    <h2>${book.title}</h2>
                    <p>${book.description || ""}</p>
                    <p><strong>Цена:</strong> ${book.price} ₽</p>
                    <p><strong>Год:</strong> ${book.publication_year || "-"}</p>
                    <p><strong>Страниц:</strong> ${book.pages || "-"}</p>
                </div>
            </div>
        `;
    } catch (e) {
        contentEl.innerHTML = `<p class="message message_error">${e.message}</p>`;
        if (btn) btn.disabled = true;
        return;
    }

    btn.addEventListener("click", async () => {
        try {
            await apiFetch("/cart/items", {
                method: "POST",
                body: JSON.stringify({
                    book_id: Number(bookId),
                    quantity: 1,
                }),
            });
            alert("Книга добавлена в корзину");
        } catch (e) {
            alert("Ошибка: " + e.message);
        }
    });
}

// --- Страница корзины ---

async function initCartPage() {
    const cartEl = document.getElementById("cart-content");
    if (!cartEl) return;

    const orderBtn = document.getElementById("create-order-btn");
    const msgEl = document.getElementById("order-message");

    async function loadCart() {
        cartEl.innerHTML = "Загрузка...";
        msgEl.textContent = "";
        try {
            const cart = await apiFetch("/cart");
            if (!cart.items.length) {
                cartEl.innerHTML = "<p>Корзина пуста</p>";
                return;
            }

            let html = `<table class="table">
                <thead>
                    <tr><th>Книга</th><th>Кол-во</th><th></th></tr>
                </thead>
                <tbody>
            `;

            cart.items.forEach((item) => {
                html += `
                    <tr data-item-id="${item.cart_item_id}">
                        <td>#${item.book_id}</td>
                        <td>
                            <input type="number" value="${item.quantity}" min="1" class="qty-input">
                        </td>
                        <td>
                            <button class="btn-update">Обновить</button>
                            <button class="btn-delete">Удалить</button>
                        </td>
                    </tr>
                `;
            });

            html += "</tbody></table>";
            cartEl.innerHTML = html;

            cartEl.querySelectorAll(".btn-update").forEach((btn) => {
                btn.addEventListener("click", async (e) => {
                    const tr = e.target.closest("tr");
                    const id = tr.getAttribute("data-item-id");
                    const qtyInput = tr.querySelector(".qty-input");
                    const qty = Number(qtyInput.value);
                    try {
                        await apiFetch(`/cart/items/${id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ quantity: qty }),
                        });
                        await loadCart();
                    } catch (err) {
                        alert("Ошибка: " + err.message);
                    }
                });
            });

            cartEl.querySelectorAll(".btn-delete").forEach((btn) => {
                btn.addEventListener("click", async (e) => {
                    const tr = e.target.closest("tr");
                    const id = tr.getAttribute("data-item-id");
                    try {
                        await apiFetch(`/cart/items/${id}`, {
                            method: "DELETE",
                        });
                        await loadCart();
                    } catch (err) {
                        alert("Ошибка: " + err.message);
                    }
                });
            });
        } catch (e) {
            cartEl.innerHTML = `<p class="message message_error">${e.message}</p>`;
        }
    }

    orderBtn.addEventListener("click", async () => {
        msgEl.textContent = "";
        try {
            const order = await apiFetch("/orders", { method: "POST" });
            msgEl.textContent = `Заказ #${order.order_id} успешно оформлен на сумму ${order.total_amount} ₽`;
            await loadCart();
        } catch (e) {
            msgEl.textContent = "Ошибка оформления заказа: " + e.message;
            msgEl.classList.add("message_error");
        }
    });

    await loadCart();
}

// --- Страница логина ---

function initLoginPage() {
    const form = document.getElementById("login-form");
    if (!form) return;

    const errorEl = document.getElementById("login-error");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorEl.textContent = "";

        const formData = new FormData(form);
        const email = formData.get("email");
        const password = formData.get("password");

        const body = new URLSearchParams();
        body.append("username", email);
        body.append("password", password);

        try {
            const response = await fetch(API_BASE + "/auth/login", {
                method: "POST",
                body,
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.detail || "Ошибка входа");
            }

            const data = await response.json();
            setToken(data.access_token);
            window.location.href = "/";
        } catch (e) {
            errorEl.textContent = e.message;
        }
    });
}

// --- Страница регистрации ---

function initRegisterPage() {
    const form = document.getElementById("register-form");
    if (!form) return;

    const errorEl = document.getElementById("register-error");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorEl.textContent = "";

        const formData = new FormData(form);
        const payload = {
            email: formData.get("email"),
            full_name: formData.get("full_name"),
            phone: formData.get("phone"),
            password: formData.get("password"),
        };

        try {
            await apiFetch("/auth/register", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            window.location.href = "/login";
        } catch (e) {
            errorEl.textContent = e.message;
        }
    });
}

// --- Страница "Мои заказы" ---

async function initOrdersPage() {
    const container = document.getElementById("orders-content");
    if (!container) return;

    container.textContent = "Загрузка заказов...";

    try {
        const orders = await apiFetch("/orders");
        if (!orders.length) {
            container.innerHTML = "<p>У вас пока нет заказов</p>";
            return;
        }

        let html = `<table class="table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Дата</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                </tr>
            </thead>
            <tbody>
        `;

        orders.forEach((o) => {
            const date = new Date(o.created_at);
            const dateStr = date.toLocaleString();
            html += `
                <tr>
                    <td>${o.order_id}</td>
                    <td>${dateStr}</td>
                    <td>${o.total_amount} ₽</td>
                    <td>${o.status}</td>
                </tr>
            `;
        });

        html += "</tbody></table>";
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<p class="message message_error">${e.message}</p>`;
    }
}


// --- Страница "Профиль" ---

async function initProfilePage() {
    const container = document.getElementById("profile-content");
    if (!container) return;

    container.textContent = "Загрузка профиля...";

    try {
        const me = await apiFetch("/auth/me");

        const role = me.is_admin ? "Администратор" : "Покупатель";

        container.innerHTML = `
            <div class="profile-card">
                <p><strong>Email:</strong> ${me.email}</p>
                <p><strong>Имя:</strong> ${me.full_name}</p>
                <p><strong>Телефон:</strong> ${me.phone || "-"}</p>
                <p><strong>Роль:</strong> ${role}</p>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<p class="message message_error">${e.message}</p>`;
    }
}





// --- Админ-панель ---

function initAdminPage() {
    const root = document.getElementById("admin-root");
    if (!root) return;

    const checkMsg = document.getElementById("admin-check-msg");
    const content = document.getElementById("admin-content");

    async function ensureAdmin() {
        try {
            const me = await apiFetch("/auth/me");
            if (!me.is_admin) {
                checkMsg.textContent = "У вас нет прав администратора";
                return false;
            }
            checkMsg.style.display = "none";
            content.style.display = "block";
            return true;
        } catch (e) {
            checkMsg.textContent = "Необходимо войти как администратор";
            return false;
        }
    }

    function switchSection(name) {
        document.querySelectorAll(".admin-section").forEach((sec) => {
            sec.style.display = sec.id === "admin-section-" + name ? "block" : "none";
        });
    }

    async function loadBooks() {
        const el = document.getElementById("admin-books-list");
        el.innerHTML = "Загрузка...";
        try {
            const books = await apiFetch("/books");
            if (!books.length) {
                el.innerHTML = "<p>Книг пока нет</p>";
                return;
            }
            let html = `<table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Обложка</th>
                        <th>Название</th>
                        <th>Цена</th>
                        <th>Обложка (загрузка)</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
            `;
            books.forEach((b) => {
                const cover = b.cover_image
                    ? `<img src="${b.cover_image}" alt="Обложка" style="max-width:60px; max-height:80px;">`
                    : `<span class="small-muted">нет</span>`;
                html += `
                    <tr data-book-id="${b.book_id}">
                        <td>${b.book_id}</td>
                        <td>${cover}</td>
                        <td>${b.title}</td>
                        <td>${b.price} ₽</td>
                        <td>
                            <input type="file" class="admin-cover-file" accept="image/*">
                            <button class="admin-cover-upload">Загрузить</button>
                        </td>
                        <td>
                            <button data-book-id="${b.book_id}" class="admin-book-delete">Удалить</button>
                        </td>
                    </tr>
                `;
            });
            html += "</tbody></table>";
            el.innerHTML = html;

            // удаление книг
            el.querySelectorAll(".admin-book-delete").forEach((btn) => {
                btn.addEventListener("click", async (e) => {
                    const id = e.target.getAttribute("data-book-id");
                    if (!confirm(`Удалить книгу #${id}?`)) return;
                    try {
                        await apiFetch(`/books/${id}`, { method: "DELETE" });
                        await loadBooks();
                    } catch (err) {
                        alert("Ошибка: " + err.message);
                    }
                });
            });

            // загрузка обложки
            el.querySelectorAll(".admin-cover-upload").forEach((btn) => {
                btn.addEventListener("click", async (e) => {
                    const tr = e.target.closest("tr");
                    const id = tr.getAttribute("data-book-id");
                    const fileInput = tr.querySelector(".admin-cover-file");
                    if (!fileInput.files || !fileInput.files[0]) {
                        alert("Выберите файл");
                        return;
                    }
                    const formData = new FormData();
                    formData.append("file", fileInput.files[0]);

                    try {
                        await fetch(`/api/admin/books/${id}/cover`, {
                            method: "POST",
                            headers: {
                                "Authorization": getToken() ? `Bearer ${getToken()}` : "",
                            },
                            body: formData,
                        }).then(async (resp) => {
                            if (!resp.ok) {
                                const data = await resp.json().catch(() => ({}));
                                throw new Error(data.detail || "Ошибка загрузки обложки");
                            }
                            return resp.json();
                        });

                        alert("Обложка загружена");
                        await loadBooks();
                    } catch (err) {
                        alert("Ошибка: " + err.message);
                    }
                });
            });
        } catch (e) {
            el.innerHTML = `<p class="message message_error">${e.message}</p>`;
        }
    }

    async function loadOrders() {
        const el = document.getElementById("admin-orders-list");
        el.innerHTML = "Загрузка...";
        try {
            const orders = await apiFetch("/admin/orders");
            if (!orders.length) {
                el.innerHTML = "<p>Заказов пока нет</p>";
                return;
            }

            let html = `<table class="table">
                <thead>
                    <tr><th>ID</th><th>Пользователь</th><th>Сумма</th><th>Статус</th><th>Дата</th><th></th></tr>
                </thead>
                <tbody>
            `;
            orders.forEach((o) => {
                html += `
                    <tr data-order-id="${o.order_id}">
                        <td>${o.order_id}</td>
                        <td>${o.user_id}</td>
                        <td>${o.total_amount} ₽</td>
                        <td>
                            <select class="order-status-select">
                                <option value="created" ${o.status === "created" ? "selected" : ""}>created</option>
                                <option value="paid" ${o.status === "paid" ? "selected" : ""}>paid</option>
                                <option value="shipped" ${o.status === "shipped" ? "selected" : ""}>shipped</option>
                                <option value="done" ${o.status === "done" ? "selected" : ""}>done</option>
                            </select>
                        </td>
                        <td>${o.created_at}</td>
                        <td><button class="admin-order-save">Сохранить</button></td>
                    </tr>
                `;
            });
            html += "</tbody></table>";
            el.innerHTML = html;

            el.querySelectorAll(".admin-order-save").forEach((btn) => {
                btn.addEventListener("click", async (e) => {
                    const tr = e.target.closest("tr");
                    const id = tr.getAttribute("data-order-id");
                    const sel = tr.querySelector(".order-status-select");
                    const status = sel.value;
                    try {
                        await apiFetch(`/admin/orders/${id}/status`, {
                            method: "PATCH",
                            body: JSON.stringify({ status }),
                        });
                        alert("Статус обновлён");
                    } catch (err) {
                        alert("Ошибка: " + err.message);
                    }
                });
            });
        } catch (e) {
            el.innerHTML = `<p class="message message_error">${e.message}</p>`;
        }
    }

    async function loadUsers() {
        const el = document.getElementById("admin-users-list");
        el.innerHTML = "Загрузка...";
        try {
            const users = await apiFetch("/admin/users");
            if (!users.length) {
                el.innerHTML = "<p>Пользователей нет</p>";
                return;
            }
            let html = `<table class="table">
                <thead>
                    <tr><th>ID</th><th>Email</th><th>Имя</th><th>Admin</th><th></th></tr>
                </thead>
                <tbody>
            `;
            users.forEach((u) => {
                html += `
                    <tr data-user-id="${u.user_id}">
                        <td>${u.user_id}</td>
                        <td>${u.email}</td>
                        <td>${u.full_name}</td>
                        <td>${u.is_admin ? "Да" : "Нет"}</td>
                        <td>
                            <button class="admin-user-toggle">
                                ${u.is_admin ? "Снять админа" : "Сделать админом"}
                            </button>
                        </td>
                    </tr>
                `;
            });
            html += "</tbody></table>";
            el.innerHTML = html;

            el.querySelectorAll(".admin-user-toggle").forEach((btn) => {
                btn.addEventListener("click", async (e) => {
                    const tr = e.target.closest("tr");
                    const id = tr.getAttribute("data-user-id");
                    const isAdminText = tr.children[3].textContent.trim() === "Да";
                    const newIsAdmin = !isAdminText;
                    try {
                        await apiFetch(`/admin/users/${id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ is_admin: newIsAdmin }),
                        });
                        await loadUsers();
                    } catch (err) {
                        alert("Ошибка: " + err.message);
                    }
                });
            });
        } catch (e) {
            el.innerHTML = `<p class="message message_error">${e.message}</p>`;
        }
    }

    // Навигация по секциям
    root.querySelectorAll(".admin-nav button").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const name = e.target.getAttribute("data-section");
            switchSection(name);
            if (name === "books") loadBooks();
            if (name === "orders") loadOrders();
            if (name === "users") loadUsers();
        });
    });

    // Создание книги
const createForm = document.getElementById("admin-book-create-form");
const createMsg = document.getElementById("admin-book-create-msg");
createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    createMsg.textContent = "";
    createMsg.classList.remove("message_error");

    const fd = new FormData(createForm);
    const coverFile = fd.get("cover");

    const payload = {
        title: fd.get("title"),
        price: Number(fd.get("price")),
        publication_year: fd.get("publication_year")
            ? Number(fd.get("publication_year"))
            : null,
        pages: fd.get("pages") ? Number(fd.get("pages")) : null,
        description: null,
        isbn: null,
        genre_id: null,
        publisher_id: null,
        author_ids: [],
    };

    try {
        // 1. создаём книгу
        const book = await apiFetch("/books", {
            method: "POST",
            body: JSON.stringify(payload),
        });

        // 2. если выбрана обложка — сразу загружаем её
        if (coverFile && coverFile instanceof File && coverFile.size > 0) {
            const formData = new FormData();
            formData.append("file", coverFile);

            await fetch(`/api/admin/books/${book.book_id}/cover`, {
                method: "POST",
                headers: {
                    "Authorization": getToken() ? `Bearer ${getToken()}` : "",
                },
                body: formData,
            }).then(async (resp) => {
                if (!resp.ok) {
                    const data = await resp.json().catch(() => ({}));
                    throw new Error(data.detail || "Ошибка загрузки обложки");
                }
                return resp.json();
            });
        }

        createMsg.textContent = "Книга создана";
        createForm.reset();
        await loadBooks();
    } catch (err) {
        createMsg.textContent = err.message;
        createMsg.classList.add("message_error");
    }
});

    (async () => {
        const ok = await ensureAdmin();
        if (!ok) return;
        switchSection("books");
        await loadBooks();
    })();
}

// --- Инициализация на загрузке ---

document.addEventListener("DOMContentLoaded", () => {
    updateNavAuthState();
    initIndexPage();
    initBookDetailPage();
    initCartPage();
    initLoginPage();
    initRegisterPage();
    initAdminPage();
    initOrdersPage();
    initProfilePage();
});
