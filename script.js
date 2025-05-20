const fileInput = document.getElementById('file-input');
const actionSelect = document.getElementById('action-select');
const timeSelect = document.getElementById('time-select');
const outputText = document.getElementById('output-text');
const toggleThemeBtn = document.getElementById('toggle-theme');

let logData = [];
let isDarkTheme = true;

const actionMap = [
    { keyword: "уволил игрока", label: "Уволил игрока" },
    { keyword: "подтверждает участие", label: "Подтверждает участие на мероприятие фракции" },
    { keyword: "изменил ранг игрока", label: "Изменил ранг игрока" },
    { keyword: "установил игроку", label: "Установил игроку тег" },
    { keyword: "принял игрока", label: "Принял игрока в организацию" },
    { keyword: "открыл общак", label: "Открыл склад организации" },
    { keyword: "закрыл общак", label: "Закрыл склад организации" },
    { keyword: "дал выговор", label: "Дал выговор игроку" },
    { keyword: "снял выговор", label: "Снял выговор с игрока" },
    { keyword: "пополнил счет", label: "Пополнил счет организации" },
    { keyword: "выдал премию", label: "Выдал премию" },
    { keyword: "назначил собеседование", label: "Назначил собеседование" },
    { keyword: "отменил собеседование", label: "Отменил собеседование" }
];

toggleThemeBtn.addEventListener('click', () => {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('light-theme', !isDarkTheme);
    const icon = toggleThemeBtn.querySelector('.material-icons');
    const label = toggleThemeBtn.querySelector('.material-label');

    icon.textContent = isDarkTheme ? 'brightness_6' : 'brightness_4';
    label.textContent = isDarkTheme ? 'Сменить тему' : 'Вернуть тёмную тему';
});

fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        logData = e.target.result.split('\n').map(line => {
            const match = line.match(/^(\d+)\. \| (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (.*)$/);
            if (!match) return null;
            return { entry_number: match[1], timestamp: match[2], action: match[3].trim() };
        }).filter(Boolean);
        alert("Файл успешно загружен");
        applyFilters();
    };
    reader.onerror = () => alert("Ошибка при загрузке файла");
    reader.readAsText(file, 'utf-8');
});

[actionSelect, timeSelect].forEach(el => el.addEventListener('change', applyFilters));

function extractActionDetails(text) {
    for (const { keyword, label } of actionMap) {
        if (text.includes(keyword)) return label;
    }
    return "Все действия";
}

function applyFilters() {
    if (!logData.length) {
        outputText.textContent = 'Пожалуйста, загрузите лог-файл.';
        return;
    }
    const selectedAction = actionSelect.value;
    const selectedTime = timeSelect.value;
    const now = Date.now();
    const timeMap = { week: 7, '2weeks': 14, '3weeks': 21, month: 30 };
    const cutoff = now - (timeMap[selectedTime] || 0) * 86400000;

    const filtered = logData.filter(entry => {
        const entryTime = new Date(entry.timestamp).getTime();
        const type = extractActionDetails(entry.action);
        entry.type = type;
        return (selectedAction === "Все действия" || type === selectedAction) && entryTime >= cutoff;
    });

    if (!filtered.length) {
        outputText.textContent = 'Нет записей, соответствующих выбранным фильтрам.';
        return;
    }
    displayResults(filtered);
}

function displayResults(results) {
    const colors = {
        "Все действия": "#f0f0f0",
        "Принял игрока в организацию": "#419c43",
        "Уволил игрока": "#c42b2b",
        "Подтверждает участие на мероприятие фракции": "#8a419c",
        "Изменил ранг игрока": "#7751bd",
        "Установил игроку тег": "#b2bd51",
        "Открыл склад организации": "#87bd51",
        "Закрыл склад организации": "#f27f74",
        "Дал выговор игроку": "#cc4437",
        "Снял выговор с игрока": "#37cc39",
        "Пополнил счет организации": "#37cc6b",
        "Выдал премию": "#37cc6b",
        "Назначил собеседование": "#376ecc",
        "Отменил собеседование": "#f9a30a"
    };
    outputText.innerHTML = '';
    results.forEach((entry, i) => {
        const span = document.createElement('span');
        span.textContent = `[${entry.timestamp}] - ${entry.action}\n`;
        span.style.color = colors[entry.type] || colors["Все действия"];
        span.style.animationDelay = `${i * 50}ms`;
        span.onclick = () => {
            outputText.querySelectorAll('span').forEach(s => s.classList.remove('active'));
            span.classList.add('active');
        };
        span.ondblclick = () => {
            navigator.clipboard.writeText(span.textContent).then(() => {
                const toast = document.getElementById('copy-toast');
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 1500);
            });
        };
        outputText.appendChild(span);
    });
}
