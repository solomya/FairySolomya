let currentLang = 'en';
let currentPage = 'home';  // save the current page

function loadPage(page) {
    currentPage = page;

    // Update hash when navigating
    if (location.hash !== `#/${currentLang}/${page}`) {
        history.replaceState(null, '', `#/${currentLang}/${page}`);
    }

    // Удалить .active у всех ссылок из бокового и верхнего меню
    document.querySelectorAll('.sidebar a, .nav-links a').forEach(link => {
        link.classList.remove('active');
    });

    // Подсветить активную ссылку в сайдбаре
    const sidebarLink = document.querySelector(`.sidebar a[onclick="loadPage('${page}')"]`);
    if (sidebarLink) sidebarLink.classList.add('active');

    // Подсветить активную ссылку в верхнем меню
    const navLink = document.querySelector(`.nav-links a[onclick="loadPage('${page}')"]`);
    if (navLink) navLink.classList.add('active');

    // Загрузить HTML-контент страницы
    fetch(`pages/${page}.html`)
        .then(res => {
            if (!res.ok) throw new Error('Page not found');
            return res.text();
        })
        .then(html => {
            document.getElementById('content').innerHTML = html;
            loadTranslations();

            // Сброс скролла вверх
            window.scrollTo({ top: 0, behavior: "auto" });

            // Если загружена страница контактов — инициализировать форму
            if (page === 'contacts') {
                setupContactForm();
            }

            // Если загружена страница home формируем карточки сказок
            if (page === 'home') {
                renderLatestTales(currentLang);
            }

            // после загрузки HTML — если это страница отзывов, загружаем карусель
            if (page === 'reviews') {
                loadReviewPage();
            }
        })

        // Открыть страницу 404, если не удалось загрузить
        .catch(() => {
            fetch(`pages/404.html`)
                .then(res => res.text())
                .then(html => {
                    document.getElementById('content').innerHTML = html;

                    loadTranslations(); // перевод страницы 404
                });

            document.getElementById('backHomeBtn')?.setAttribute('href', `#/${currentLang}/home`);
        });
};

// Смена языка по клику на кнопки
function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);

    // Подсветка кнопок выбора языка
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const btnLang = btn.textContent.trim().toLowerCase();
        btn.classList.toggle('active', btnLang === lang);
    });

    // ✅ Устанавливаем выбранное значение в select (mobile)
    const langSelect = document.getElementById("language-select");
    if (langSelect) {
        langSelect.value = lang;
    }

    loadTranslations();    // перевести статичные элементы
    loadPage(currentPage); // перезагрузить текущий контент с новым языком

    // Перегенерировать ссылки при смене языка
    document.querySelectorAll('.nav-links a, .sidebar a, #mobileMenuList a').forEach(link => {
        const key = link.getAttribute('data-key');
        if (!key) return;
        link.href = `#/${lang}/${key}`;
    });

}

// Загрузка перевода из языковых json
function loadTranslations() {
    fetch(`lang/${currentLang}.json`)
        .then(res => res.json())
        .then(translations => {
            document.querySelectorAll('[data-key]').forEach(el => {
                const key = el.getAttribute('data-key');
                if (!translations[key]) return;

                const translated = translations[key];

                // Если это <a>, меняем только текстовые узлы (сохраняя вложенные элементы)
                if (el.tagName.toLowerCase() === 'a') {
                    el.childNodes.forEach(node => {
                        if (node.nodeType === Node.TEXT_NODE) {
                            node.nodeValue = translated;
                        }
                    });
                } else {
                    // Если есть вложенные элементы
                    if (el.children.length > 0) {
                        for (let node of el.childNodes) {
                            if (node.nodeType === Node.TEXT_NODE) {
                                node.nodeValue = translated;
                                break;
                            }
                        }
                    } else {
                        // Обработка многострочного текста
                        if (translated.includes('\n\n')) {
                            // Стих с абзацами (строфами)
                            const paragraphs = translated
                                .split('\n\n') // делим на строфы
                                .map(stanza => {
                                    const lines = stanza
                                        .trim()
                                        .split('\n')         // строки в строфе
                                        .map(line => line.trim())
                                        .join('<br>');        // строки → через <br>
                                    return `<p>${lines}</p>`; // строфа → в <p>
                                })
                                .join('');
                            el.innerHTML = paragraphs;

                        } else if (translated.includes('\n')) {
                            // Просто многострочный текст без абзацев
                            const lines = translated
                                .split('\n')
                                .map(line => `<p>${line.trim()}</p>`)
                                .join('');
                            el.innerHTML = lines;

                        } else {
                            el.textContent = translated;
                        }
                    }

                }
            });
        });
}

// Инициализация EmailJS и обработка формы контактов
function setupContactForm() {
    const form = document.getElementById("contact-form");
    const status = document.getElementById("form-status");

    const captchaQuestion = document.getElementById("captcha-question");
    const captchaInput = document.getElementById("check-answer");

    if (!form || !status || !captchaQuestion || !captchaInput) return;

    // Инициализация EmailJS один раз
    if (!emailjs.initDone) {
        emailjs.init("MQPPS__q8OajYNmHR");
        emailjs.initDone = true;
    }

    // Генерация случайного вопроса
    let correctAnswer = 0;
    function generateCaptcha() {
        const a = Math.floor(Math.random() * 9) + 1;
        const b = Math.floor(Math.random() * 9) + 1;
        correctAnswer = a + b;
        captchaQuestion.textContent = `${a} + ${b} = `;
    }

    generateCaptcha();

    // Удаляем старый обработчик и вешаем новый
    form.removeEventListener("submit", handleFormSubmit);
    form.addEventListener("submit", handleFormSubmit);

    function handleFormSubmit(e) {
        e.preventDefault();

        const userAnswer = parseInt(captchaInput.value.trim());
        if (userAnswer !== correctAnswer) {
            status.textContent = "⚠️ Incorrect answer. Try again.";
            generateCaptcha(); // обновить вопрос
            return;
        }

        status.textContent = "⏳ Sending...";

        emailjs.sendForm("service_61vjb65", "template_8r27wsj", form)
            .then(() => {
                status.textContent = "✅ Message sent!";
                form.reset();
                generateCaptcha(); // новый вопрос после отправки
            })
            .catch((error) => {
                console.error("EmailJS Error:", error);
                status.textContent = "❌ Sending error. Try again later.";
            });
    }
}

// === Создание карточек сказок для бокового контейнера страницы home.html. Данные для карточки сказок берём из fairy-tales.json === //
async function loadFairyTalesData() {
    try {
        const response = await fetch('data/fairy-tales.json');
        const tales = await response.json();
        return tales;
    } catch (error) {
        console.error("Ошибка загрузки сказок:", error);
        return [];
    }
}

function isNewTale(tale) {
    const created = new Date(tale.date);
    const now = new Date();
    const diffDays = (now - created) / (1000 * 60 * 60 * 24);
    return diffDays <= 20;
}

function createFairyCard(tale, lang) {
    const card = document.createElement('div');
    card.className = 'fairy-card';

    const translation = tale.translations[lang] || tale.translations['ru'];
    const { title, intro } = translation;

    const buttonText = {
        ru: "Читать",
        en: "Read",
        ua: "Читати",
        it: "Leggere"
    }[lang] || "Read";

    const newBadgeText = {
        ru: "🔥 Новинка!",
        en: "🔥 New!",
        ua: "🔥 Новинка!",
        it: "🔥 Novità!"
    }[lang] || "🔥 New!";

    const isNew = isNewTale(tale);

    // 👉 Разбиваем intro на абзацы
    const introHtml = intro
        .split("\n")
        .map(line => `<p>${line.trim()}</p>`)
        .join("");

    card.innerHTML = `
      ${isNew ? `<div class="new-badge">${newBadgeText}</div>` : ''}      
      <img src="${tale.image}" alt="${title}">
      <h3>${title}</h3>
      <p>${intro}</p>
      <button onclick="loadPage('${tale.id}')">${buttonText}</button>
    `;

    return card;
}

async function renderLatestTales(lang, limit = 4) {
    const container = document.getElementById("latest-tales-container");
    if (!container) return;

    container.innerHTML = "";

    const tales = await loadFairyTalesData();
    const sortedTales = tales
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);

    sortedTales.forEach(tale => {
        const card = createFairyCard(tale, lang);
        container.appendChild(card);
    });
}
// === Конец формирования карточек сказок === //

// === Карусель отзывов === //
let reviewsData = [];
let currentReviewIndex = 0;

function loadReviewPage() {
    fetch('data/reviews.json')
        .then(res => res.json())
        .then(data => {
            reviewsData = data;
            currentReviewIndex = 0;
            renderReview();

            const prevBtn = document.getElementById('prev-review');
            const nextBtn = document.getElementById('next-review');

            if (prevBtn && nextBtn) {
                prevBtn.addEventListener('click', showPreviousReview);
                nextBtn.addEventListener('click', showNextReview);
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки отзывов:', error);
        });
}

function renderReview() {
    if (!reviewsData.length) return;

    const review = reviewsData[currentReviewIndex];
    const container = document.getElementById('review-container');
    if (!container) return;

    container.innerHTML = '';

    const card = document.createElement('div');
    card.classList.add('review-card', 'collapsed');

    const name = document.createElement('h3');
    name.textContent = review.name[currentLang];

    const position = document.createElement('p');
    position.classList.add('review-position');
    position.textContent = review.position[currentLang];

    // Обертка для текста + кнопок
    const textWrapper = document.createElement('div');
    textWrapper.classList.add('review-text-wrapper');

    const text = document.createElement('p');
    text.classList.add('review-text');
    text.textContent = review.text[currentLang];

    // Кнопка "развернуть"
    const expandBtn = document.createElement('button');
    expandBtn.classList.add('toggle-text-btn', 'expand-btn');
    expandBtn.setAttribute('data-key', 'expandReview');
    expandBtn.setAttribute('aria-expanded', 'false');

    // Кнопка "свернуть"
    const collapseBtn = document.createElement('button');
    collapseBtn.classList.add('toggle-text-btn', 'collapse-btn');
    collapseBtn.setAttribute('data-key', 'collapseReview');
    collapseBtn.setAttribute('aria-expanded', 'true');
    collapseBtn.style.display = 'none';

    textWrapper.appendChild(text);
    textWrapper.appendChild(expandBtn);
    textWrapper.appendChild(collapseBtn);

    // История
    const story = document.createElement('p');
    story.classList.add('review-story');

    const storyLink = document.createElement('a');
    storyLink.href = '#';
    storyLink.textContent = review.story[currentLang];
    storyLink.style.cursor = 'pointer';
    storyLink.addEventListener('click', (e) => {
        e.preventDefault();
        loadPage(review.storyId); // открываем сказку в <main>
    });
    story.appendChild(storyLink);

    // Звезды
    const stars = document.createElement('div');
    stars.classList.add('stars');
    stars.innerHTML = '★'.repeat(review.stars) + '☆'.repeat(5 - review.stars);

    // Сборка карточки
    card.appendChild(name);
    card.appendChild(position);
    card.appendChild(textWrapper);
    card.appendChild(story);
    card.appendChild(stars);

    container.appendChild(card);

    // Обработчики кнопок
    expandBtn.addEventListener('click', () => {
        card.classList.remove('collapsed');
        card.classList.add('expanded');
        text.classList.add('expanded'); // 👉 обязательно!
        expandBtn.style.display = 'none';
        collapseBtn.style.display = 'inline-block';
        expandBtn.setAttribute('aria-expanded', 'true');
        collapseBtn.setAttribute('aria-expanded', 'true');
        loadTranslations();
    });

    collapseBtn.addEventListener('click', () => {
        card.classList.remove('expanded');
        card.classList.add('collapsed');
        text.classList.remove('expanded'); // 👉 обязательно!
        expandBtn.style.display = 'inline-block';
        collapseBtn.style.display = 'none';
        expandBtn.setAttribute('aria-expanded', 'false');
        collapseBtn.setAttribute('aria-expanded', 'false');
        loadTranslations();
    });

    loadTranslations();
}

function showPreviousReview() {
    currentReviewIndex = (currentReviewIndex - 1 + reviewsData.length) % reviewsData.length;
    renderReview();
}

function showNextReview() {
    currentReviewIndex = (currentReviewIndex + 1) % reviewsData.length;
    renderReview();
}
// === КОНЕЦ карусели отзывов === //


// При загрузке страницы — выбрать язык из localStorage или по умолчанию, загрузить index
document.addEventListener('DOMContentLoaded', () => {
    const route = parseHashRoute();
    const savedLang = localStorage.getItem('lang');

    if (route) {
        currentLang = route.lang;
        currentPage = route.page;
    } else {
        currentLang = savedLang || 'en';
        currentPage = 'home';
    }

    setLang(currentLang);  // применит язык и подсветку
    loadPage(currentPage); // загрузит нужную страницу
});

window.addEventListener('hashchange', () => {
    const route = parseHashRoute();
    if (route) {
        if (route.lang !== currentLang) setLang(route.lang);
        loadPage(route.page);
    }
});

// Обработчик для баннера cookie через localStorage (не может отсчитать дни)
// Убираем, т.к. делаем через cookie
// document.addEventListener("DOMContentLoaded", () => {
//     const banner = document.getElementById("cookie-banner");
//     const acceptBtn = document.querySelector(".cookie-accept");
//     const declineBtn = document.querySelector(".cookie-decline");

//     // Показываем баннер, если ещё не было выбора
//     if (!localStorage.getItem("cookieConsent")) {
//         banner.style.display = "flex";
//     }

//     acceptBtn.addEventListener("click", () => {
//         localStorage.setItem("cookieConsent", "accepted");
//         banner.style.display = "none";
//     });

//     declineBtn.addEventListener("click", () => {
//         localStorage.setItem("cookieConsent", "declined");
//         banner.style.display = "none";
//     });
// });


// Динамически генерирует бургер-меню из sidebar
document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.getElementById("sidebar");
    const mobileMenuList = document.getElementById("mobileMenuList");
    const sidebarCollections = sidebar.querySelectorAll("li.collection-title");

    function generateMobileMenu() {
        mobileMenuList.innerHTML = ""; // очищаем перед генерацией

        const sidebarCollections = sidebar.querySelectorAll("li.collection-title");

        sidebarCollections.forEach((collection) => {
            const dataKey = collection.getAttribute("data-key");
            const stories = collection.querySelectorAll("li.story-title");

            // Создаём элемент коллекции (заголовок)
            const collectionItem = document.createElement("li");
            collectionItem.classList.add("mobile-collection-title");
            if (dataKey) {
                collectionItem.setAttribute("data-key", dataKey);
            }
            collectionItem.textContent = "title"; // временный текст (переведётся через loadTranslations)

            // Создаём вложенный список для историй
            const storyList = document.createElement("ul");
            storyList.classList.add("mobile-story-list");

            stories.forEach((story) => {
                const storyLink = story.querySelector("a");
                const storyItem = document.createElement("li");
                storyItem.classList.add("mobile-story-title");

                // Клонируем ссылку
                const clonedLink = storyLink.cloneNode(true);

                // Автогенерация в мобильном меню
                const key = storyLink.getAttribute('data-key');
                clonedLink.href = `#/${currentLang}/${key}`;

                storyItem.appendChild(clonedLink);
                storyList.appendChild(storyItem);
            });

            collectionItem.appendChild(storyList);
            mobileMenuList.appendChild(collectionItem);
        });

        loadTranslations(); // сразу переводим
    }

    generateMobileMenu();

    // Автогенерация ссылок в .nav-links
    document.querySelectorAll('.nav-links a').forEach(link => {
        const key = link.getAttribute('data-key');
        if (!key) return;
        link.href = `#/${currentLang}/${key}`;
    });

    // Автогенерация ссылок в .sidebar
    document.querySelectorAll('.sidebar a').forEach(link => {
        const key = link.getAttribute('data-key');
        if (!key) return;
        link.href = `#/${currentLang}/${key}`;
    });

}); function parseHashRoute() {
    const hash = window.location.hash;
    const match = hash.match(/^#\/([a-z]{2})\/([a-zA-Z0-9_-]+)$/);
    if (match) {
        return { lang: match[1], page: match[2] };
    }
    return null;
};

// парсинг хэша
function parseHashRoute() {
    const hash = window.location.hash;
    const match = hash.match(/^#\/([a-z]{2})\/([a-zA-Z0-9_-]+)$/);
    if (match) {
        return { lang: match[1], page: match[2] };
    }
    return null;
}


document.addEventListener("DOMContentLoaded", function () {
    const burger = document.getElementById("burger");
    const mobileMenu = document.getElementById("mobileMenu");
    const collectionToggles = document.querySelectorAll(".collection-toggle");

    // Показ меню
    burger.addEventListener("click", () => {
        mobileMenu.classList.remove("hidden");
    });

    // Закрытие по клику вне меню
    document.addEventListener("click", function (event) {
        const isClickInside = mobileMenu.contains(event.target) || burger.contains(event.target);
        if (!isClickInside) {
            mobileMenu.classList.add("hidden");
        }
    });

    // Закрытие по клику на любую ссылку в меню
    mobileMenu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            mobileMenu.classList.add("hidden");
        });
    });

    // Раскрытие/сворачивание подменю
    collectionToggles.forEach(toggle => {
        toggle.addEventListener("click", (e) => {
            e.stopPropagation(); // предотвращаем закрытие меню при клике по toggle
            const submenu = toggle.nextElementSibling;
            submenu.classList.toggle("hidden");
        });
    });
});

// Генерация "пыльцы" за феей
function createSparkleAtFairy(fairy) {
    const sparkle = document.createElement('div');
    sparkle.className = 'fairy-sparkle';

    const rect = fairy.getBoundingClientRect();
    const parentRect = fairy.offsetParent.getBoundingClientRect();

    sparkle.style.left = (rect.left - parentRect.left + fairy.offsetWidth / 2) + 'px';
    sparkle.style.top = (rect.top - parentRect.top + fairy.offsetHeight / 2) + 'px';

    fairy.offsetParent.appendChild(sparkle);

    setTimeout(() => sparkle.remove(), 1000); // удалить через 1 сек
}

// Кнопка Back to Top - размещается внизу страницы и при нажатии плавно прокручивает страницу вверх.
// Показать кнопку при прокрутке вниз
window.onscroll = function () {
    const btn = document.getElementById("toTopBtn");
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
        btn.style.display = "block";
    } else {
        btn.style.display = "none";
    }
};

// Прокрутка наверх при нажатии
document.getElementById("toTopBtn").onclick = function () {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
};

// Функция для работы с cookie

// Установка cookie
function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value}; expires=${d.toUTCString()}; path=/`;
}

// Получение cookie
function getCookie(name) {
    const ca = decodeURIComponent(document.cookie).split(';');
    name = name + "=";
    for (let c of ca) {
        while (c.charAt(0) === ' ') c = c.substring(1);
        if (c.indexOf(name) === 0) return c.substring(name.length);
    }
    return "";
}

window.addEventListener("load", () => {
    const banner = document.getElementById("cookie-banner");
    const acceptBtn = document.getElementById("cookie-accept");
    const declineBtn = document.getElementById("cookie-decline");

    if (getCookie("cookieAccepted") !== "") {
        // Согласие — скрываем баннер
        banner.style.display = "none";
        return;
    }

    if (getCookie("cookieDeclined") !== "") {
        // Отказ (на 1 день) — скрываем баннер
        banner.style.display = "none";
        return;
    }

    // Если куков нет — показываем баннер и навешиваем кнопки
    banner.style.display = "flex";

    acceptBtn.onclick = () => {
        setCookie("cookieAccepted", "true", 30); // 30 дней
        banner.style.display = "none";
    };

    declineBtn.onclick = () => {
        setCookie("cookieDeclined", "true", 1); // 1 день
        banner.style.display = "none";
    };
});
// Конец функции для работы с cookie