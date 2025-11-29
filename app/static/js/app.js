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

    async function loadBooks(query) {
        listEl.innerHTML = "Загрузка...";
        try {
            const params = new URLSearchParams();
            if (query) params.append("q", query);
            const books = await apiFetch(`/books?${params.toString()}`);
            if (!books.length) {
                listEl.innerHTML = "<p>Книг не найдено</p>";
                return;
            }

            listEl.innerHTML = "";
            books.forEach((b) => {
                const card = document.createElement("div");
                card.className = "card";
                card.innerHTML = `
                    <h2>${b.title}</h2>
                    <p>Цена: ${b.price} ₽</p>
                    <a href="/books/${b.book_id}">Подробнее</a>
                `;
                listEl.appendChild(card);
            });
        } catch (e) {
            listEl.innerHTML = `<p class="message message_error">${e.message}</p>`;
        }
    }

    searchBtn.addEventListener("click", () => {
        loadBooks(searchInput.value.trim());
    });

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
        contentEl.innerHTML = `
            <h2>${book.title}</h2>
            <p>${book.description || ""}</p>
            <p>Цена: ${book.price} ₽</p>
            <p>Год: ${book.publication_year || "-"}</p>
            <p>Страниц: ${book.pages || "-"}</p>
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
            // после успешной регистрации отправляем на страницу входа
            window.location.href = "/login";
        } catch (e) {
            errorEl.textContent = e.message;
        }
    });
}

// --- Инициализация на загрузке ---

document.addEventListener("DOMContentLoaded", () => {
    updateNavAuthState();
    initIndexPage();
    initBookDetailPage();
    initCartPage();
    initLoginPage();
    initRegisterPage();
});
