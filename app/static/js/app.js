const API_BASE = "/api";
const TOKEN_KEY = "bookstore_token";

function debounce(fn, delay = 300) {
    let timeoutId;

    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

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
    const loginLinks = document.querySelectorAll('[data-auth="login"]');
    const registerLinks = document.querySelectorAll('[data-auth="register"]');

    loginLinks.forEach((link) => {
        if (token) {
            link.textContent = "Выйти";
            link.href = "#";
            link.onclick = (e) => {
                e.preventDefault();
                setToken(null);
                window.location.href = "/";
            };
        } else {
            link.textContent = "Войти";
            link.href = "/login";
            link.onclick = null;
        }
    });

    registerLinks.forEach((link) => {
        if (token) {
            link.style.display = "none";
        } else {
            link.style.display = "";
        }
    });
}

function renderCardSkeletons(count = 6) {
    const items = Array.from({ length: count })
        .map(() => {
            return `
            <div class="card_skeleton">
                <div class="skeleton skeleton__cover"></div>
                <div class="skeleton__lines">
                    <div class="skeleton skeleton__line wide"></div>
                    <div class="skeleton skeleton__line mid"></div>
                    <div class="skeleton skeleton__line mid"></div>
                    <div class="skeleton skeleton__line short"></div>
                </div>
            </div>`;
        })
        .join("");

    return `<div class="cards_skeletons">${items}</div>`;
}

function initHeaderSearch() {
    const searchForms = document.querySelectorAll(".js-header-search");
    if (!searchForms.length) return;

    const params = new URLSearchParams(window.location.search);
    const qParam = params.get("q") || "";

    searchForms.forEach((form) => {
        const input = form.querySelector("[data-search-input]");
        if (!input) return;

        input.value = qParam;

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const query = input.value.trim();
            const url = query ? `/?q=${encodeURIComponent(query)}` : "/";
            window.location.href = url;
        });
    });
}

function initMobileNavigation() {
    const burger = document.getElementById("header-burger");
    const drawer = document.getElementById("mobile-drawer");
    const overlay = document.getElementById("mobile-drawer-overlay");
    const closeBtn = drawer?.querySelector(".drawer__close");

    if (!burger || !drawer || !overlay) return;

    const toggleMenu = (open) => {
        const shouldOpen = open ?? !drawer.classList.contains("is-open");
        drawer.classList.toggle("is-open", shouldOpen);
        overlay.classList.toggle("is-visible", shouldOpen);
        document.body.classList.toggle("drawer-open", shouldOpen);
        burger.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
        drawer.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
        overlay.setAttribute("aria-hidden", shouldOpen ? "false" : "true");

        if (shouldOpen) {
            closeBtn?.focus();
        } else {
            burger.focus();
        }
    };

    burger.addEventListener("click", () => toggleMenu());
    overlay.addEventListener("click", () => toggleMenu(false));
    closeBtn?.addEventListener("click", () => toggleMenu(false));

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && drawer.classList.contains("is-open")) {
            toggleMenu(false);
        }
    });

    drawer.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => toggleMenu(false));
    });
}

// --- Страница каталога ---

// --- Страница каталога ---

async function initIndexPage() {
    const listEl = document.getElementById("books-list");
    if (!listEl) return;
    listEl.setAttribute("aria-busy", "true");

    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-btn");
    const resetBtn = document.getElementById("search-reset-btn");

    const searchWrapper = document.querySelector("[data-search-wrapper]");

    const genreSelect = document.getElementById("filter-genre");
    const authorSelect = document.getElementById("filter-author");
    const minPriceInput = document.getElementById("filter-min-price");
    const maxPriceInput = document.getElementById("filter-max-price");
    const minYearInput = document.getElementById("filter-min-year");
    const maxYearInput = document.getElementById("filter-max-year");
    const orderSelect = document.getElementById("filter-order");

    const quickNew = document.getElementById("filter-quick-new");
    const quickBudget = document.getElementById("filter-quick-budget");
    const quickPremium = document.getElementById("filter-quick-premium");
    const quickClassic = document.getElementById("filter-quick-classic");

    const filtersWrapper = document.querySelector(".catalog-filters");
    const filtersToggle = document.getElementById("filters-toggle");
    const emptyStateEl = document.getElementById("books-empty-state");
    const filtersAnnouncer = document.getElementById("active-filters-announcer");
    const pageStatus = document.getElementById("page-status");

    const pagePrev = document.getElementById("page-prev");
    const pageNext = document.getElementById("page-next");
    const pageInfo = document.getElementById("page-info");

    const PAGE_SIZE = 10;
    let currentPage = 1;
    let hasMore = false;

    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("q");
    if (initialQuery !== null && searchInput) {
        searchInput.value = initialQuery;
    }

    const debouncedFilterChange = debounce(() => {
        currentPage = 1;
        loadBooks();
    }, 280);

    const debouncedSearchChange = debounce(() => {
        currentPage = 1;
        loadBooks();
    }, 320);

    const updateSearchState = () => {
        if (!searchWrapper || !searchInput) return;
        searchWrapper.classList.toggle("is-filled", !!searchInput.value.trim());
        announceFilters();
    };

    const toggleAccordion = () => {
        if (!filtersWrapper || !filtersToggle) return;
        const isOpen = filtersWrapper.classList.toggle("is-open");
        filtersToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    };

    filtersToggle?.addEventListener("click", () => toggleAccordion());

    function updatePagination() {
        if (!pagePrev || !pageNext || !pageInfo) return;
        pagePrev.disabled = currentPage <= 1;
        pageNext.disabled = !hasMore;
        pageInfo.textContent = `Страница ${currentPage}`;
        pagePrev.setAttribute("aria-disabled", pagePrev.disabled ? "true" : "false");
        pageNext.setAttribute("aria-disabled", pageNext.disabled ? "true" : "false");
        if (pageStatus) {
            const nextPageText = pageNext.disabled ? "конец списка" : "можно перейти вперёд";
            pageStatus.textContent = `Сейчас страница ${currentPage}, ${nextPageText}`;
        }
    }

    const describeActiveFilters = () => {
        const active = [];
        if (searchInput?.value.trim()) active.push(`по запросу «${searchInput.value.trim()}»`);
        if (genreSelect?.value) {
            const text = genreSelect.options[genreSelect.selectedIndex]?.textContent;
            active.push(`жанр: ${text}`);
        }
        if (authorSelect?.value) {
            const text = authorSelect.options[authorSelect.selectedIndex]?.textContent;
            active.push(`автор: ${text}`);
        }
        if (minPriceInput?.value) active.push(`цена от ${minPriceInput.value} ₽`);
        if (maxPriceInput?.value) active.push(`до ${maxPriceInput.value} ₽`);
        if (minYearInput?.value) active.push(`год от ${minYearInput.value}`);
        if (maxYearInput?.value) active.push(`до ${maxYearInput.value}`);
        if (orderSelect?.value) active.push(`сортировка: ${orderSelect.options[orderSelect.selectedIndex]?.textContent}`);
        return active;
    };

    const announceFilters = () => {
        if (!filtersAnnouncer) return;
        const active = describeActiveFilters();
        filtersAnnouncer.textContent = active.length
            ? `Активные фильтры: ${active.join(", ")}`
            : "Фильтры не применены";
    };

    const hideEmptyState = () => {
        if (emptyStateEl) {
            emptyStateEl.hidden = true;
            emptyStateEl.innerHTML = "";
        }
    };

    const showEmptyState = () => {
        if (!emptyStateEl) return;
        const active = describeActiveFilters();
        const filtersText = active.length
            ? `Применены фильтры: ${active.join(", ")}.`
            : "Попробуйте изменить поисковый запрос или диапазон фильтров.";

        emptyStateEl.innerHTML = `
            <p class="empty-state__title">Ничего не найдено</p>
            <p>Мы не нашли книг по выбранным условиям.</p>
            <p class="empty-state__filters">${filtersText}</p>
            <div>
                <button class="btn btn_secondary" type="button" id="empty-reset-btn">Сбросить фильтры</button>
            </div>
        `;
        emptyStateEl.hidden = false;

        const emptyResetBtn = emptyStateEl.querySelector("#empty-reset-btn");
        emptyResetBtn?.addEventListener("click", () => resetFilters());
    };

    const syncQuickFiltersWithInputs = () => {
        if (quickNew && minYearInput) {
            quickNew.checked = !!minYearInput.value && Number(minYearInput.value) >= 2015 && !maxYearInput?.value;
        }
        if (quickClassic && maxYearInput) {
            quickClassic.checked = !!maxYearInput.value && Number(maxYearInput.value) <= 1990 && !minYearInput?.value;
        }
        if (quickBudget && maxPriceInput) {
            quickBudget.checked = !!maxPriceInput.value && Number(maxPriceInput.value) === 500;
        }
        if (quickPremium && minPriceInput) {
            quickPremium.checked = !!minPriceInput.value && Number(minPriceInput.value) === 1500;
        }
    };

    const resetFilters = () => {
        hideEmptyState();
        if (searchInput) searchInput.value = "";
        if (genreSelect) genreSelect.value = "";
        if (authorSelect) authorSelect.value = "";
        if (minPriceInput) minPriceInput.value = "";
        if (maxPriceInput) maxPriceInput.value = "";
        if (minYearInput) minYearInput.value = "";
        if (maxYearInput) maxYearInput.value = "";
        if (orderSelect) orderSelect.value = "";
        [quickNew, quickBudget, quickPremium, quickClassic].forEach((cb) => {
            if (cb) cb.checked = false;
        });
        updateSearchState();
        currentPage = 1;
        announceFilters();
        loadBooks();
    };

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
        listEl.setAttribute("aria-busy", "true");
        hideEmptyState();
        listEl.innerHTML = renderCardSkeletons();

        const params = new URLSearchParams();

        const q = searchInput?.value.trim() || "";
        if (q) params.append("q", q);

        if (genreSelect?.value) params.append("genre_id", genreSelect.value);
        if (authorSelect?.value) params.append("author_id", authorSelect.value);

        if (minPriceInput?.value) params.append("min_price", minPriceInput.value);
        if (maxPriceInput?.value) params.append("max_price", maxPriceInput.value);

        if (minYearInput?.value) params.append("min_year", minYearInput.value);
        if (maxYearInput?.value) params.append("max_year", maxYearInput.value);

        if (orderSelect?.value) params.append("order_by", orderSelect.value);

        // пагинация
        params.append("skip", (currentPage - 1) * PAGE_SIZE);
        params.append("limit", PAGE_SIZE);

        try {
            const query = params.toString();
            const books = await apiFetch(`/books${query ? "?" + query : ""}`);

            hasMore = books.length === PAGE_SIZE;
            updatePagination();

            if (!books.length) {
                listEl.innerHTML = "";
                showEmptyState();
                return;
            }

            hideEmptyState();
            listEl.innerHTML = "";
            books.forEach((b) => {
                const authors =
                    b.author_names?.length
                        ? b.author_names.join(", ")
                        : "Не указан";
                const genre = b.genre_name || "Не указан";
                const publisher = b.publisher_name || "Не указано";

                const card = document.createElement("div");
                card.className = "card";
                card.setAttribute("role", "listitem");
                card.setAttribute("aria-label", `${b.title}. Цена ${b.price} ₽`);

                const cover = b.cover_image
                    ? `<div class="card__cover"><img src="${b.cover_image}" alt="Обложка"></div>`
                    : `<div class="card__cover card__cover_placeholder">Нет обложки</div>`;

                card.innerHTML = `
                    <div class="card__top">
                        ${cover}
                        <div class="card__body">
                            <div>
                                <h2 class="card__title">${b.title}</h2>
                                <div class="card__meta">
                                    <span class="pill">Год: ${b.publication_year || "—"}</span>
                                    <span class="pill pill_primary">${b.price} ₽</span>
                                </div>
                                <div class="card__details">
                                    <p class="card__detail"><strong>Автор:</strong> ${authors}</p>
                                    <p class="card__detail"><strong>Жанр:</strong> ${genre}</p>
                                    <p class="card__detail"><strong>Издательство:</strong> ${publisher}</p>
                                </div>
                            </div>
                            <p class="card__hint">Перейдите в карточку, чтобы прочитать описание и добавить книгу в корзину.</p>
                        </div>
                    </div>
                    <div class="card__footer">
                        <div class="card__price">${b.price} ₽</div>
                        <div class="card__actions">
                            <a class="btn btn_secondary" href="/books/${b.book_id}">Подробнее</a>
                        </div>
                    </div>
                `;
                listEl.appendChild(card);
            });
        } catch (e) {
            listEl.innerHTML = `<p class="message message_error">${e.message}</p>`;
        } finally {
            listEl.setAttribute("aria-busy", "false");
        }
    }

    // поиск
    searchBtn?.addEventListener("click", () => {
        currentPage = 1;
        loadBooks();
    });

    searchInput?.addEventListener("input", () => {
        updateSearchState();
        debouncedSearchChange();
    });

    // сброс
    resetBtn?.addEventListener("click", () => resetFilters());

    // По Enter в строке поиска
    searchInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            currentPage = 1;
            loadBooks();
        }
    });

    const filterInputs = [
        genreSelect,
        authorSelect,
        minPriceInput,
        maxPriceInput,
        minYearInput,
        maxYearInput,
        orderSelect,
    ].filter(Boolean);

    filterInputs.forEach((input) => {
        const eventName = input.tagName === "SELECT" ? "change" : "input";
        input.addEventListener(eventName, () => {
            syncQuickFiltersWithInputs();
            announceFilters();
            debouncedFilterChange();
        });
    });

    const quickFilterHandlers = [
        {
            el: quickNew,
            apply: () => {
                if (!minYearInput) return;
                if (quickNew.checked) {
                    if (quickClassic) quickClassic.checked = false;
                    minYearInput.value = "2015";
                    if (maxYearInput) maxYearInput.value = "";
                } else if (minYearInput.value === "2015") {
                    minYearInput.value = "";
                }
            },
        },
        {
            el: quickClassic,
            apply: () => {
                if (!maxYearInput) return;
                if (quickClassic.checked) {
                    if (quickNew) quickNew.checked = false;
                    maxYearInput.value = "1990";
                    if (minYearInput) minYearInput.value = "";
                } else if (maxYearInput.value === "1990") {
                    maxYearInput.value = "";
                }
            },
        },
        {
            el: quickBudget,
            apply: () => {
                if (!maxPriceInput) return;
                if (quickBudget.checked) {
                    if (quickPremium) quickPremium.checked = false;
                    maxPriceInput.value = "500";
                } else if (maxPriceInput.value === "500") {
                    maxPriceInput.value = "";
                }
            },
        },
        {
            el: quickPremium,
            apply: () => {
                if (!minPriceInput) return;
                if (quickPremium.checked) {
                    if (quickBudget) quickBudget.checked = false;
                    minPriceInput.value = "1500";
                } else if (minPriceInput.value === "1500") {
                    minPriceInput.value = "";
                }
            },
        },
    ];

    quickFilterHandlers.forEach(({ el, apply }) => {
        el?.addEventListener("change", () => {
            apply();
            announceFilters();
            debouncedFilterChange();
        });
    });

    // кнопки пагинации
    if (pagePrev) {
        pagePrev.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage -= 1;
                loadBooks();
            }
        });
    }

    if (pageNext) {
        pageNext.addEventListener("click", () => {
            if (hasMore) {
                currentPage += 1;
                loadBooks();
            }
        });
    }

    updateSearchState();
    syncQuickFiltersWithInputs();
    announceFilters();
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
        const authors =
            book.author_names?.length
                ? book.author_names.join(", ")
                : "Не указан";
        const genre = book.genre_name || "Не указан";
        const publisher = book.publisher_name || "Не указано";
        const cover = book.cover_image
            ? `<div class="book-detail__cover"><img src="${book.cover_image}" alt="Обложка"></div>`
            : `<div class="book-detail__cover book-detail__cover_placeholder">Нет обложки</div>`;

        contentEl.innerHTML = `
            <div class="book-detail__layout">
                ${cover}
                <div class="book-detail__info">
                    <h2>${book.title}</h2>
                    <div class="book-detail__meta">
                        <p><strong>Автор:</strong> ${authors}</p>
                        <p><strong>Жанр:</strong> ${genre}</p>
                        <p><strong>Издательство:</strong> ${publisher}</p>
                    </div>
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

// --- Страница корзины ---

async function initCartPage() {
    const cartEl = document.getElementById("cart-content");
    if (!cartEl) return;

    const orderBtn = document.getElementById("create-order-btn");
    const msgEl = document.getElementById("order-message");

    async function loadCart() {
        cartEl.innerHTML = "Загрузка...";
        msgEl.textContent = "";
        msgEl.classList.remove("message_error");

        try {
            const cart = await apiFetch("/cart");
            if (!cart.items.length) {
                cartEl.innerHTML = "<p>Корзина пуста</p>";
                if (orderBtn) orderBtn.disabled = true;
                return;
            }

            let total = 0;

            let html = `<table class="table">
                <thead>
                    <tr>
                        <th>Книга</th>
                        <th>Цена</th>
                        <th>Кол-во</th>
                        <th>Сумма</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
            `;

            cart.items.forEach((item) => {
                const title =
                    item.book && item.book.title
                        ? item.book.title
                        : `#${item.book_id}`;
                const price =
                    item.book && item.book.price
                        ? Number(item.book.price)
                        : 0;
                const lineTotal = price * item.quantity;
                total += lineTotal;

                html += `
                    <tr data-item-id="${item.cart_item_id}">
                        <td>${title}</td>
                        <td class="table__num">${price ? price.toFixed(2) + " ₽" : "-"}</td>
                        <td>
                            <span class="table__inline">
                                <input type="number" value="${item.quantity}" min="1" class="qty-input">
                            </span>
                        </td>
                        <td class="table__num">${lineTotal ? lineTotal.toFixed(2) + " ₽" : "-"}</td>
                        <td class="table__actions">
                            <button class="btn btn_ghost btn_sm btn-update">Обновить</button>
                            <button class="btn btn_danger btn_sm btn-delete">Удалить</button>
                        </td>
                    </tr>
                `;
            });

            html += `
                <tr>
                    <td colspan="5" class="table__actions">
                        <strong>Итого: ${total.toFixed(2)} ₽</strong>
                    </td>
                </tr>
            `;

            html += "</tbody></table>";
            cartEl.innerHTML = html;
            if (orderBtn) orderBtn.disabled = false;

            // обработчик "Обновить"
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

            // обработчик "Удалить"
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
            if (orderBtn) orderBtn.disabled = true;
        }
    }

    if (orderBtn) {
        orderBtn.addEventListener("click", async () => {
            msgEl.textContent = "";
            msgEl.classList.remove("message_error");
            try {
                const order = await apiFetch("/orders", { method: "POST" });
                msgEl.textContent = `Заказ #${order.order_id} успешно оформлен на сумму ${order.total_amount} ₽`;
                await loadCart();
            } catch (e) {
                msgEl.textContent = "Ошибка оформления заказа: " + e.message;
                msgEl.classList.add("message_error");
            }
        });
    }

    await loadCart();
}


// --- Страница логина ---

const validators = {
    required: (label) => (value) => (!value ? `Укажите ${label}` : ""),
    email: (value) => {
        if (!value) return "";
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(value) ? "" : "Введите корректный email";
    },
    minLength: (label, length) => (value) =>
        value && value.length < length ? `${label} не короче ${length} символов` : "",
    phone: (value) => {
        if (!value) return "";
        return /^[\d\s()+-]{7,}$/.test(value)
            ? ""
            : "Телефон может содержать только цифры, скобки и дефисы";
    },
};

function setupFormValidation(form, rules, errorBox, handleSubmit) {
    const setFieldState = (input, error) => {
        const errorEl = form.querySelector(`[data-error-for="${input.name}"]`);
        input.classList.remove("input_error", "input_valid");
        if (error) {
            input.classList.add("input_error");
            if (errorEl) errorEl.textContent = error;
        } else {
            if (errorEl) errorEl.textContent = "";
            if (input.value.trim()) input.classList.add("input_valid");
        }
    };

    const validateField = (name) => {
        const input = form.elements[name];
        if (!input) return true;
        const checks = rules[name] || [];
        let error = "";
        for (const check of checks) {
            error = check(input.value.trim());
            if (error) break;
        }
        setFieldState(input, error);
        return !error;
    };

    Object.keys(rules).forEach((name) => {
        const input = form.elements[name];
        input?.addEventListener("input", () => validateField(name));
        input?.addEventListener("blur", () => validateField(name));
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (errorBox) {
            errorBox.textContent = "";
            errorBox.classList.remove("is-error");
        }

        const isValid = Object.keys(rules).every((name) => validateField(name));
        if (!isValid) {
            if (errorBox) {
                errorBox.textContent = "Проверьте подсвеченные поля и исправьте ошибки.";
                errorBox.classList.add("is-error");
            }
            return;
        }

        try {
            await handleSubmit();
        } catch (err) {
            if (errorBox) {
                errorBox.textContent = err.message || "Произошла ошибка";
                errorBox.classList.add("is-error");
            }
        }
    });
}

function initLoginPage() {
    const form = document.getElementById("login-form");
    if (!form) return;

    const errorEl = document.getElementById("login-error");

    setupFormValidation(
        form,
        {
            email: [validators.required("email"), validators.email],
            password: [validators.required("пароль"), validators.minLength("Пароль", 6)],
        },
        errorEl,
        async () => {
            const formData = new FormData(form);
            const body = new URLSearchParams();
            body.append("username", formData.get("email"));
            body.append("password", formData.get("password"));

            const response = await fetch(API_BASE + "/auth/login", {
                method: "POST",
                body,
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.detail || "Не удалось войти. Попробуйте еще раз.");
            }

            const data = await response.json();
            setToken(data.access_token);
            window.location.href = "/";
        }
    );
}

// --- Страница регистрации ---

function initRegisterPage() {
    const form = document.getElementById("register-form");
    if (!form) return;

    const errorEl = document.getElementById("register-error");

    setupFormValidation(
        form,
        {
            email: [validators.required("email"), validators.email],
            full_name: [validators.required("имя"), validators.minLength("Имя", 2)],
            phone: [validators.phone],
            password: [validators.required("пароль"), validators.minLength("Пароль", 6)],
        },
        errorEl,
        async () => {
            const formData = new FormData(form);
            const payload = {
                email: formData.get("email"),
                full_name: formData.get("full_name"),
                phone: formData.get("phone"),
                password: formData.get("password"),
            };

            await apiFetch("/auth/register", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            window.location.href = "/login";
        }
    );
}

// --- Страница "Мои заказы" ---

async function initOrdersPage() {
    const container = document.getElementById("orders-content");
    if (!container) return;

    const renderEmptyState = () => {
        container.innerHTML = `
            <div class="empty-state">
                <h3 class="empty-state__title">Заказов пока нет</h3>
                <p class="empty-state__desc">Перейдите в каталог, выберите понравившиеся книги и оформите первый заказ.</p>
                <a class="btn btn_primary" href="/">В каталог</a>
            </div>
        `;
    };

    container.innerHTML = '<div class="skeleton skeleton_table"></div>';

    try {
        const orders = await apiFetch("/orders");
        if (!orders.length) {
            renderEmptyState();
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
            content.style.display = "";
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

        root.querySelectorAll(".admin-nav__btn").forEach((btn) => {
            btn.classList.toggle("is-active", btn.getAttribute("data-section") === name);
        });
    }

    async function updateBookFormOptions() {
        const genreList = document.getElementById("admin-genre-options");
        const authorList = document.getElementById("admin-author-options");
        const publisherList = document.getElementById("admin-publisher-options");

        if (!genreList && !authorList && !publisherList) return;

        try {
            const [genres, authors, publishers] = await Promise.all([
                apiFetch("/admin/genres"),
                apiFetch("/admin/authors"),
                apiFetch("/admin/publishers"),
            ]);

            if (genreList) {
                genreList.innerHTML = genres
                    .map((g) => `<option value="${g.name}"></option>`)
                    .join("");
            }

            if (authorList) {
                authorList.innerHTML = authors
                    .map((a) => `<option value="${a.full_name}"></option>`)
                    .join("");
            }

            if (publisherList) {
                publisherList.innerHTML = publishers
                    .map((p) => `<option value="${p.name}"></option>`)
                    .join("");
            }
        } catch (e) {
            console.warn("Не удалось обновить списки для формы книги", e);
        }
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
            const escapeHtml = (str) =>
                (str || "").toString().replace(/[&<>'"]/g, (ch) => {
                    switch (ch) {
                        case "&":
                            return "&amp;";
                        case "<":
                            return "&lt;";
                        case ">":
                            return "&gt;";
                        case '"':
                            return "&quot;";
                        case "'":
                            return "&#39;";
                        default:
                            return ch;
                    }
                });
            let html = `<div class="admin-table-wrapper"><table class="table admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Книга</th>
                        <th>Цена</th>
                        <th>Обложка</th>
                        <th class="table__actions"></th>
                    </tr>
                </thead>
                <tbody>
            `;
            books.forEach((b) => {
                const cover = b.cover_image
                    ? `<div class="admin-cover-thumb"><img src="${b.cover_image}" alt="Обложка ${escapeHtml(b.title)}"></div>`
                    : `<div class="admin-cover-thumb admin-cover-thumb_empty">Нет</div>`;
                const authorString = (b.author_names || []).join(", ");
                html += `
                    <tr data-book-id="${b.book_id}">
                        <td class="table__num">${b.book_id}</td>
                        <td>
                            <div class="admin-book-row">
                                <div class="admin-book-row__title">${escapeHtml(b.title)}</div>
                                <div class="small-muted">${escapeHtml(authorString) || "Без авторов"}</div>
                            </div>
                        </td>
                        <td class="table__num">${b.price} ₽</td>
                        <td>${cover}</td>
                        <td class="table__actions">
                            <button class="btn btn_ghost btn_sm admin-book-edit-toggle">Редактировать</button>
                            <button data-book-id="${b.book_id}" class="btn btn_danger btn_sm admin-book-delete">Удалить</button>
                        </td>
                    </tr>
                    <tr class="admin-book-edit-row" data-book-id="${b.book_id}" style="display: none;">
                        <td colspan="5">
                            <form class="form admin-book-edit-form" data-book-id="${b.book_id}">
                                <div class="admin-edit-grid">
                                    <div class="form__field">
                                        <label class="form__label">Название</label>
                                        <input class="input" type="text" name="title" value="${escapeHtml(b.title)}" required>
                                    </div>
                                    <div class="form__field">
                                        <label class="form__label">Цена</label>
                                        <input class="input" type="number" name="price" step="0.01" min="0" value="${b.price}" required>
                                    </div>
                                    <div class="form__field">
                                        <label class="form__label">Год</label>
                                        <input class="input" type="number" name="publication_year" value="${b.publication_year || ""}" placeholder="Например, 2024">
                                    </div>
                                    <div class="form__field">
                                        <label class="form__label">Страниц</label>
                                        <input class="input" type="number" name="pages" value="${b.pages || ""}">
                                    </div>
                                    <div class="form__field">
                                        <label class="form__label">ISBN</label>
                                        <input class="input" type="text" name="isbn" value="${escapeHtml(b.isbn || "")}" placeholder="ISBN">
                                    </div>
                                    <div class="form__field">
                                        <label class="form__label">Жанр</label>
                                        <input class="input" type="text" name="genre_name" list="admin-genre-options" value="${escapeHtml(b.genre_name || "")}" placeholder="Название жанра">
                                    </div>
                                    <div class="form__field">
                                        <label class="form__label">Издательство</label>
                                        <input class="input" type="text" name="publisher_name" list="admin-publisher-options" value="${escapeHtml(b.publisher_name || "")}" placeholder="Название издательства">
                                    </div>
                                    <div class="form__field">
                                        <label class="form__label">Авторы</label>
                                        <input class="input" type="text" name="author_names" list="admin-author-options" value="${escapeHtml(authorString)}" placeholder="Автор1, Автор2">
                                        <p class="form__hint">Укажите несколько авторов через запятую</p>
                                    </div>
                                </div>
                                <div class="admin-edit-grid admin-edit-grid_wide">
                                    <div class="form__field">
                                        <label class="form__label">Описание</label>
                                        <textarea class="input" name="description" rows="3" placeholder="Описание книги">${escapeHtml(b.description || "")}</textarea>
                                    </div>
                                    <div class="admin-cover-block">
                                        <div class="admin-cover-block__preview">
                                            ${cover}
                                        </div>
                                        <div class="admin-cover-block__fields">
                                            <label class="form__label">Обложка</label>
                                            <div class="admin-cover-block__controls">
                                                <input class="input admin-cover-input" type="file" accept="image/*">
                                                <button type="button" class="btn btn_ghost btn_sm admin-cover-submit">Загрузить обложку</button>
                                            </div>
                                            <p class="form__hint">PNG или JPG, до 5 МБ</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="form__actions admin-edit-actions">
                                    <div class="admin-edit-actions__buttons">
                                        <button type="submit" class="btn btn_sm">Сохранить</button>
                                        <button type="button" class="btn btn_ghost btn_sm admin-book-edit-toggle">Свернуть</button>
                                    </div>
                                    <p class="form__message admin-book-edit-msg"></p>
                                </div>
                            </form>
                        </td>
                    </tr>
                `;
            });
            html += "</tbody></table></div>";
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

            // раскрытие форм редактирования
            el.querySelectorAll(".admin-book-edit-toggle").forEach((btn) => {
                btn.addEventListener("click", (e) => {
                    const tr = e.target.closest("tr");
                    const bookId = tr?.getAttribute("data-book-id");
                    const editRow = bookId
                        ? el.querySelector(`.admin-book-edit-row[data-book-id="${bookId}"]`)
                        : null;
                    if (editRow) {
                        editRow.style.display =
                            editRow.style.display === "none" || !editRow.style.display
                                ? "table-row"
                                : "none";
                    }
                });
            });

            // сохранение изменений книги
            el.querySelectorAll(".admin-book-edit-form").forEach((form) => {
                form.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    const bookId = form.getAttribute("data-book-id");
                    const msg = form.querySelector(".admin-book-edit-msg");
                    if (msg) {
                        msg.textContent = "";
                        msg.classList.remove("message_error");
                    }

                    const fd = new FormData(form);

                    const title = fd.get("title")?.toString().trim();
                    if (!title) {
                        if (msg) {
                            msg.textContent = "Название не может быть пустым";
                            msg.classList.add("message_error");
                        }
                        return;
                    }

                    const price = Number(fd.get("price"));
                    if (Number.isNaN(price)) {
                        if (msg) {
                            msg.textContent = "Укажите корректную цену";
                            msg.classList.add("message_error");
                        }
                        return;
                    }

                    const parseIntField = (name) => {
                        const raw = fd.get(name);
                        if (raw === null) return null;
                        const str = raw.toString().trim();
                        if (!str) return null;
                        const num = Number(str);
                        return Number.isNaN(num) ? null : num;
                    };

                    const authorNamesRaw = fd.get("author_names");
                    const authorNames = authorNamesRaw
                        ? authorNamesRaw
                              .toString()
                              .split(",")
                              .map((n) => n.trim())
                              .filter(Boolean)
                        : [];

                    const payload = {
                        title,
                        price,
                        publication_year: parseIntField("publication_year"),
                        pages: parseIntField("pages"),
                        isbn: fd.get("isbn")?.toString().trim() || null,
                        genre_name: fd.get("genre_name")?.toString().trim() || null,
                        publisher_name: fd.get("publisher_name")?.toString().trim() || null,
                        author_names: authorNames,
                        description: fd.get("description")?.toString().trim() || null,
                    };

                    try {
                        await apiFetch(`/books/${bookId}`, {
                            method: "PUT",
                            body: JSON.stringify(payload),
                        });
                        if (msg) {
                            msg.textContent = "Сохранено";
                            msg.classList.remove("message_error");
                        }
                        await loadBooks();
                        await updateBookFormOptions();
                    } catch (err) {
                        if (msg) {
                            msg.textContent = err.message;
                            msg.classList.add("message_error");
                        } else {
                            alert("Ошибка: " + err.message);
                        }
                    }
                });
            });

            el.querySelectorAll(".admin-book-edit-form").forEach((form) => {
                const coverBtn = form.querySelector(".admin-cover-submit");
                const coverInput = form.querySelector(".admin-cover-input");
                const msg = form.querySelector(".admin-book-edit-msg");
                const bookId = form.getAttribute("data-book-id");

                coverBtn?.addEventListener("click", async () => {
                    msg.textContent = "";
                    msg.classList.remove("message_error");

                    if (!coverInput?.files || !coverInput.files[0]) {
                        msg.textContent = "Выберите файл обложки";
                        msg.classList.add("message_error");
                        return;
                    }

                    const formData = new FormData();
                    formData.append("file", coverInput.files[0]);

                    try {
                        await fetch(`/api/admin/books/${bookId}/cover`, {
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

                        msg.textContent = "Обложка обновлена";
                        await loadBooks();
                    } catch (err) {
                        msg.textContent = err.message;
                        msg.classList.add("message_error");
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
                        <td class="table__actions"><button class="btn btn_ghost btn_sm admin-order-save">Сохранить</button></td>
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
                        <td class="table__actions">
                            <button class="btn btn_ghost btn_sm admin-user-toggle">
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

    async function loadGenres() {
        const el = document.getElementById("admin-genres-list");
        el.innerHTML = "Загрузка...";
        try {
            const genres = await apiFetch("/admin/genres");
            if (!genres.length) {
                el.innerHTML = "<p>Жанров нет</p>";
                return;
            }

            let html = `<table class="table">
                <thead>
                    <tr><th>ID</th><th>Название</th><th></th></tr>
                </thead>
                <tbody>`;

            genres.forEach((g) => {
                html += `
                    <tr data-genre-id="${g.genre_id}">
                        <td>${g.genre_id}</td>
                        <td><input type="text" value="${g.name}" class="input"></td>
                        <td class="table__actions">
                            <button class="btn btn_ghost btn_sm admin-genre-save">Сохранить</button>
                            <button class="btn btn_danger btn_sm admin-genre-delete">Удалить</button>
                        </td>
                    </tr>
                `;
            });

            html += "</tbody></table>";
            el.innerHTML = html;

            el.querySelectorAll(".admin-genre-save").forEach((btn) => {
                btn.addEventListener("click", async (e) => {
                    const tr = e.target.closest("tr");
                    const id = tr.getAttribute("data-genre-id");
                    const nameInput = tr.querySelector("input");
                    try {
                        await apiFetch(`/admin/genres/${id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ name: nameInput.value.trim() }),
                        });
                        await loadGenres();
                    } catch (err) {
                        alert("Ошибка: " + err.message);
                    }
                });
            });

            el.querySelectorAll(".admin-genre-delete").forEach((btn) => {
                btn.addEventListener("click", async (e) => {
                    const tr = e.target.closest("tr");
                    const id = tr.getAttribute("data-genre-id");
                    if (!confirm(`Удалить жанр #${id}?`)) return;
                    try {
                        await apiFetch(`/admin/genres/${id}`, { method: "DELETE" });
                        await loadGenres();
                    } catch (err) {
                        alert("Ошибка: " + err.message);
                    }
                });
            });
        } catch (e) {
            el.innerHTML = `<p class="message message_error">${e.message}</p>`;
        }
    }

    async function loadAuthors() {
        const el = document.getElementById("admin-authors-list");
        el.innerHTML = "Загрузка...";
        try {
            const authors = await apiFetch("/admin/authors");
            if (!authors.length) {
                el.innerHTML = "<p>Авторов нет</p>";
                return;
            }

            let html = `<table class="table">
                <thead>
                    <tr><th>ID</th><th>Полное имя</th><th></th></tr>
                </thead>
                <tbody>`;

            authors.forEach((a) => {
                html += `
                    <tr data-author-id="${a.author_id}">
                        <td>${a.author_id}</td>
                        <td><input type="text" value="${a.full_name}" class="input"></td>
                        <td class="table__actions">
                            <button class="btn btn_ghost btn_sm admin-author-save">Сохранить</button>
                            <button class="btn btn_danger btn_sm admin-author-delete">Удалить</button>
                        </td>
                    </tr>
                `;
            });

            html += "</tbody></table>";
            el.innerHTML = html;

            el.querySelectorAll(".admin-author-save").forEach((btn) => {
                btn.addEventListener("click", async (e) => {
                    const tr = e.target.closest("tr");
                    const id = tr.getAttribute("data-author-id");
                    const nameInput = tr.querySelector("input");
                    try {
                        await apiFetch(`/admin/authors/${id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ full_name: nameInput.value.trim() }),
                        });
                        await loadAuthors();
                    } catch (err) {
                        alert("Ошибка: " + err.message);
                    }
                });
            });

            el.querySelectorAll(".admin-author-delete").forEach((btn) => {
                btn.addEventListener("click", async (e) => {
                    const tr = e.target.closest("tr");
                    const id = tr.getAttribute("data-author-id");
                    if (!confirm(`Удалить автора #${id}?`)) return;
                    try {
                        await apiFetch(`/admin/authors/${id}`, { method: "DELETE" });
                        await loadAuthors();
                    } catch (err) {
                        alert("Ошибка: " + err.message);
                    }
                });
            });
        } catch (e) {
            el.innerHTML = `<p class="message message_error">${e.message}</p>`;
        }
    }

    async function loadPublishers() {
        const el = document.getElementById("admin-publishers-list");
        el.innerHTML = "Загрузка...";
        try {
            const publishers = await apiFetch("/admin/publishers");
            if (!publishers.length) {
                el.innerHTML = "<p>Издательств нет</p>";
                return;
            }

            let html = `<table class="table">
                <thead>
                    <tr><th>ID</th><th>Название</th><th></th></tr>
                </thead>
                <tbody>`;

            publishers.forEach((p) => {
                html += `
                    <tr data-publisher-id="${p.publisher_id}">
                        <td>${p.publisher_id}</td>
                        <td><input type="text" value="${p.name}" class="input"></td>
                        <td class="table__actions">
                            <button class="btn btn_ghost btn_sm admin-publisher-save">Сохранить</button>
                            <button class="btn btn_danger btn_sm admin-publisher-delete">Удалить</button>
                        </td>
                    </tr>
                `;
            });

            html += "</tbody></table>";
            el.innerHTML = html;

            el.querySelectorAll(".admin-publisher-save").forEach((btn) => {
                btn.addEventListener("click", async (e) => {
                    const tr = e.target.closest("tr");
                    const id = tr.getAttribute("data-publisher-id");
                    const nameInput = tr.querySelector("input");
                    try {
                        await apiFetch(`/admin/publishers/${id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ name: nameInput.value.trim() }),
                        });
                        await loadPublishers();
                    } catch (err) {
                        alert("Ошибка: " + err.message);
                    }
                });
            });

            el.querySelectorAll(".admin-publisher-delete").forEach((btn) => {
                btn.addEventListener("click", async (e) => {
                    const tr = e.target.closest("tr");
                    const id = tr.getAttribute("data-publisher-id");
                    if (!confirm(`Удалить издательство #${id}?`)) return;
                    try {
                        await apiFetch(`/admin/publishers/${id}`, { method: "DELETE" });
                        await loadPublishers();
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
            if (name === "books") {
                loadBooks();
                updateBookFormOptions();
            }
            if (name === "orders") loadOrders();
            if (name === "users") loadUsers();
            if (name === "genres") loadGenres();
            if (name === "authors") loadAuthors();
            if (name === "publishers") loadPublishers();
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

        const genreName = fd.get("genre_name")?.toString().trim() || null;
        const publisherName = fd.get("publisher_name")?.toString().trim() || null;
        const authorNamesRaw = fd.get("author_names");
        const authorNames = authorNamesRaw
            ? authorNamesRaw
                  .toString()
                  .split(",")
                  .map((n) => n.trim())
                  .filter(Boolean)
            : [];

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
            genre_name: genreName,
            publisher_id: null,
            publisher_name: publisherName,
            author_ids: [],
            author_names: authorNames,
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
            await updateBookFormOptions();
        } catch (err) {
            createMsg.textContent = err.message;
            createMsg.classList.add("message_error");
        }
    });

    // Создание жанра
    const genreCreateForm = document.getElementById("admin-genre-create-form");
    const genreCreateMsg = document.getElementById("admin-genre-create-msg");
    genreCreateForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        genreCreateMsg.textContent = "";
        genreCreateMsg.classList.remove("message_error");

        const fd = new FormData(genreCreateForm);

        try {
            await apiFetch("/admin/genres", {
                method: "POST",
                body: JSON.stringify({ name: fd.get("name")?.toString().trim() || "" }),
            });
            genreCreateMsg.textContent = "Жанр создан";
            genreCreateForm.reset();
            await loadGenres();
            await updateBookFormOptions();
        } catch (err) {
            genreCreateMsg.textContent = err.message;
            genreCreateMsg.classList.add("message_error");
        }
    });

    // Создание автора
    const authorCreateForm = document.getElementById("admin-author-create-form");
    const authorCreateMsg = document.getElementById("admin-author-create-msg");
    authorCreateForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        authorCreateMsg.textContent = "";
        authorCreateMsg.classList.remove("message_error");

        const fd = new FormData(authorCreateForm);

        try {
            await apiFetch("/admin/authors", {
                method: "POST",
                body: JSON.stringify({ full_name: fd.get("full_name")?.toString().trim() || "" }),
            });
            authorCreateMsg.textContent = "Автор создан";
            authorCreateForm.reset();
            await loadAuthors();
            await updateBookFormOptions();
        } catch (err) {
            authorCreateMsg.textContent = err.message;
            authorCreateMsg.classList.add("message_error");
        }
    });

    // Создание издательства
    const publisherCreateForm = document.getElementById("admin-publisher-create-form");
    const publisherCreateMsg = document.getElementById("admin-publisher-create-msg");
    publisherCreateForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        publisherCreateMsg.textContent = "";
        publisherCreateMsg.classList.remove("message_error");

        const fd = new FormData(publisherCreateForm);

        try {
            await apiFetch("/admin/publishers", {
                method: "POST",
                body: JSON.stringify({ name: fd.get("name")?.toString().trim() || "" }),
            });
            publisherCreateMsg.textContent = "Издательство создано";
            publisherCreateForm.reset();
            await loadPublishers();
            await updateBookFormOptions();
        } catch (err) {
            publisherCreateMsg.textContent = err.message;
            publisherCreateMsg.classList.add("message_error");
        }
    });

    (async () => {
        const ok = await ensureAdmin();
        if (!ok) return;
        await updateBookFormOptions();
        switchSection("books");
        await loadBooks();
    })();
}

// --- Инициализация на загрузке ---

document.addEventListener("DOMContentLoaded", () => {
    updateNavAuthState();
    initHeaderSearch();
    initMobileNavigation();
    initIndexPage();
    initBookDetailPage();
    initCartPage();
    initLoginPage();
    initRegisterPage();
    initAdminPage();
    initOrdersPage();
    initProfilePage();
});
