const $ = id => document.getElementById(id);
const fileInput = $('file-input');
const nicknameInput = $('nickname-input');
const actionSelect = $('action-select');
const timeSelect = $('time-select');
const outputText = $('output-text');
const toggleThemeBtn = $('toggle-theme');
const languageIconsContainer = $('language-icons');
const copyToast = $('copy-toast');
const actionsChartCanvas = $('actionsChart'); // Canvas для графика
const chartLegendContainer = $('chart-legend'); // Контейнер для легенды
const toggleStatsBtn = $('toggle-stats'); // Кнопка переключения статистики
const chartWrapper = $('chart-wrapper'); // Обертка для графика и легенды
const historyList = $('history-list'); // Список для истории загрузок
const historyHeading = $('history-heading'); // Заголовок истории

// Изменено: logData теперь будет содержать ОБЪЕДИНЕННЫЕ данные из всех загруженных файлов.
let logData = [];
let isDarkTheme = true;
let currentLang = 'ru';
let actionsChart; // Объявляем переменную для экземпляра Chart.js
let isStatsVisible = false; // Состояние видимости статистики
let legendObserver; // Объявляем MutationObserver
// Изменено: uploadedFilesHistory теперь будет хранить массив объектов, каждый из которых представляет загруженный файл.
let uploadedFilesHistory = []; // Массив для хранения истории загруженных файлов
let activeHistoryItemIndex = -1; // Индекс текущего выделенного элемента истории (в uploadedFilesHistory)

const colors = {
  "Все действия": "#d0d0d0",
  "Принял игрока в организацию": "#2e7d32",
  "Уволил игрока": "#b71c1c",
  "Подтверждает участие на мероприятие фракции": "#6a1b9a",
  "Изменил ранг игрока": "#4527a0",
  "Установил игроку тег": "#9e9d24",
  "Открыл склад организации": "#558b2f",
  "Закрыл склад организации": "#e64a19",
  "Дал выговор игроку": "#c62828",
  "Снял выговор с игрока": "#2e7d32",
  "Пополнил счет организации": "#388e3c",
  "Выдал премию": "#00796b",
  "Назначил собеседование": "#1976d2",
  "Отменил собеседование": "#f57c00",
  "Выпустил заключенного": "#0288d1",
  "Повысил срок заключенному": "#d84315"
};

function setLanguage(lang) {
  document.querySelectorAll('[data-key]').forEach(element => {
    const key = element.getAttribute('data-key');
    if (translations[lang] && translations[lang][key]) {
      element.textContent = translations[lang][key];
    }
  });

  const chartHeading = document.querySelector('[data-key="chart_heading"]');
  if (chartHeading) {
    chartHeading.textContent = translations[lang].chart_heading;
  }
  // Обновляем заголовок истории
  historyHeading.textContent = translations[lang].history_heading;


  updateDynamicTexts(lang);
  updateActiveLangIcon(lang);

  // Обновляем текст кнопки статистики
  const statsLabel = toggleStatsBtn.querySelector('.material-label');
  statsLabel.textContent = isStatsVisible ? translations[lang].hide_stats : translations[lang].show_stats;
  const statsIcon = toggleStatsBtn.querySelector('.material-icons');
  statsIcon.textContent = isStatsVisible ? 'bar_chart' : 'bar_chart';

  // Перерисовываем легенду при смене языка, если график виден
  if (actionsChart && actionsChart.data.labels.length > 0 && isStatsVisible) {
      generateChartLegend(actionsChart.data.labels, actionsChart.data.datasets[0].data, actionsChart.data.datasets[0].backgroundColor);
  } else if (!isStatsVisible) {
      chartLegendContainer.innerHTML = '';
  }

  renderHistory(); // Перерисовываем историю, чтобы обновить языковые метки
}

function updateDynamicTexts(lang) {
  const themeIcon = toggleThemeBtn.querySelector('.material-icons');
  const themeLabel = toggleThemeBtn.querySelector('.material-label');
  themeLabel.textContent = isDarkTheme ? translations[lang].toggle_theme : translations[lang].toggle_theme_light;
  themeIcon.textContent = isDarkTheme ? 'brightness_6' : 'brightness_4';

  actionSelect.innerHTML = `<option value="${translations[lang].all_actions}" data-key="all_actions">${translations[lang].all_actions}</option>`;
  actionMap.forEach(action => {
    const option = document.createElement('option');
    option.value = action[`label_${currentLang}`];
    option.textContent = action[`label_${currentLang}`];
    actionSelect.appendChild(option);
  });

  const currentActionValue = actionSelect.value;
  const isCurrentActionValid = Array.from(actionSelect.options).some(opt => opt.value === currentActionValue);
  if (!isCurrentActionValid) {
      actionSelect.value = translations[lang].all_actions;
  }
}

function updateActiveLangIcon(activeLang) {
  document.querySelectorAll('.lang-icon-btn').forEach(button => {
    if (button.getAttribute('data-lang') === activeLang) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

// Инициализация MutationObserver
function initLegendObserver() {
  if (legendObserver) { // Предотвращаем повторную инициализацию
    legendObserver.disconnect();
  }
  legendObserver = new MutationObserver((mutations) => {
    // Мы хотим, чтобы Chart.js перерисовывался только после того,
    // как легенда полностью отрисовалась и заняла свое место.
    // requestAnimationFrame помогает синхронизировать с циклом отрисовки браузера.
    requestAnimationFrame(() => {
        if (actionsChart && isStatsVisible) {
            const container = actionsChartCanvas.parentElement;
            if (container) {
                actionsChartCanvas.width = container.offsetWidth;
                actionsChartCanvas.height = container.offsetHeight;
            }
            actionsChart.resize(); // Принудительный ресайз
        }
    });
  });

  // Наблюдаем за изменениями в chartLegendContainer
  legendObserver.observe(chartLegendContainer, {
    childList: true,   // Отслеживать добавление/удаление дочерних элементов
    subtree: true,     // Отслеживать изменения во всем поддереве (внутри легенды)
    attributes: true,  // Отслеживать изменения атрибутов (например, style)
    characterData: true // Отслеживать изменения текстовых узлов
  });
}


document.addEventListener('DOMContentLoaded', () => {
    setLanguage(currentLang);
    chartWrapper.classList.add('hidden-chart-wrapper');
    initLegendObserver(); // Инициализируем наблюдатель при загрузке DOM
    renderHistory(); // Initial render of history on page load
});

toggleThemeBtn.addEventListener('click', () => {
  isDarkTheme = !isDarkTheme;
  document.body.classList.toggle('light-theme', !isDarkTheme);

  const icon = toggleThemeBtn.querySelector('.material-icons');
  const label = toggleThemeBtn.querySelector('.material-label');

  icon.style.opacity = label.style.opacity = '0';
  setTimeout(() => {
    icon.textContent = isDarkTheme ? 'brightness_6' : 'brightness_4';
    label.textContent = isDarkTheme ? translations[currentLang].toggle_theme : translations[currentLang].toggle_theme_light;
    icon.style.opacity = label.style.opacity = '1';
  }, 200);

  if (actionsChart && isStatsVisible) {
    updateChartColors();
    actionsChart.update();
    generateChartLegend(actionsChart.data.labels, actionsChart.data.datasets[0].data, actionsChart.data.datasets[0].backgroundColor);
    // Observer позаботится о actionsChart.resize()
  }
});

languageIconsContainer.addEventListener('click', (event) => {
  const targetButton = event.target.closest('.lang-icon-btn');
  if (targetButton) {
    const newLang = targetButton.getAttribute('data-lang');
    if (newLang && newLang !== currentLang) {
      currentLang = newLang;
      setLanguage(currentLang);
      applyFilters();
    }
  }
});

// Изменен обработчик fileInput.addEventListener
fileInput.addEventListener('change', async e => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  // Очищаем текущие данные лога и историю перед загрузкой новых файлов
  logData = [];
  uploadedFilesHistory = [];

  const promises = Array.from(files).map(file => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ({ target }) => {
        const fileContent = target.result;
        const parsedLogData = fileContent
          .split('\n')
          .map(line => {
            const m = line.match(/^(\d+)\. \| (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (.*)$/);
            return m ? { entry_number: m[1], timestamp: m[2], action: m[3].trim() } : null;
          })
          .filter(Boolean);

        resolve({
          name: file.name,
          timestamp: new Date().toLocaleString(),
          parsedLogData: parsedLogData
        });
      };
      reader.onerror = () => reject(translations[currentLang].file_upload_error);
      reader.readAsText(file, 'utf-8');
    });
  });

  try {
    const results = await Promise.all(promises);
    results.forEach(fileEntry => {
        uploadedFilesHistory.unshift(fileEntry); // Добавляем каждый файл в начало истории
        logData = logData.concat(fileEntry.parsedLogData); // Объединяем данные всех файлов
    });

    // Сортируем объединенные данные по временной метке, чтобы лог был хронологически правильным
    logData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    alert(translations[currentLang].file_uploaded_success);
    activeHistoryItemIndex = 0; // Первый загруженный файл (группа) всегда активен

    // Важно: Поскольку теперь мы загружаем несколько файлов, логика истории немного меняется.
    // Если пользователь загрузил несколько файлов, и мы хотим отобразить их ВСЕ вместе,
    // то `activeHistoryItemIndex` должен указывать на какой-то "групповой" элемент,
    // или же мы должны просто отобразить все данные из `logData` без привязки к одному элементу истории.
    // Для простоты, я сделаю так, чтобы при множественной загрузке activeHistoryItemIndex
    // указывал на самый новый "блок" загрузок (то есть на первый элемент в uploadedFilesHistory),
    // и данные для отображения берутся из logData, которая уже объединена.
    // Если вы хотите, чтобы каждый файл из множественной загрузки был отдельным активным элементом,
    // тогда логика будет сложнее. Я предполагаю, что вы хотите их объединить.

    applyFilters();
    renderHistory(); // Обновляем список истории
  } catch (error) {
    console.error("Error during file upload:", error);
    alert(translations[currentLang].file_upload_error);
  }
});

[actionSelect, timeSelect].forEach(el => el.addEventListener('change', applyFilters));
nicknameInput.addEventListener('input', applyFilters);

toggleStatsBtn.addEventListener('click', () => {
  isStatsVisible = !isStatsVisible;

  const statsLabel = toggleStatsBtn.querySelector('.material-label');
  statsLabel.textContent = isStatsVisible ? translations[currentLang].hide_stats : translations[currentLang].show_stats;
  const statsIcon = toggleStatsBtn.querySelector('.material-icons');
  statsIcon.textContent = isStatsVisible ? 'bar_chart' : 'bar_chart';

  if (isStatsVisible) {
    chartWrapper.classList.remove('hidden-chart-wrapper');

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const container = actionsChartCanvas.parentElement;
            if (container) {
                actionsChartCanvas.width = container.offsetWidth;
                actionsChartCanvas.height = container.offsetHeight;
            }

            if (!actionsChart) {
                initChart();
            }
            if (logData.length > 0) {
                applyFilters(); // Это вызовет updateChart, который сгенерирует легенду. Observer будет ждать.
            } else {
                if (actionsChart) {
                    actionsChart.data.labels = [];
                    actionsChart.data.datasets[0].data = [];
                    actionsChart.update();
                }
                chartLegendContainer.innerHTML = translations[currentLang].no_records_found;
            }
        });
    });

  } else {
    chartWrapper.classList.add('hidden-chart-wrapper');
    chartLegendContainer.innerHTML = '';
  }
});


const extractActionDetails = text => {
  const foundAction = actionMap.find(({ keyword }) => text.includes(keyword));
  return foundAction ? foundAction[`label_${currentLang}`] : translations[currentLang].all_actions;
};

function applyFilters() {
  const nicknameFilter = nicknameInput.value.trim().toLowerCase();
  if (!logData.length) {
    outputText.textContent = translations[currentLang].upload_log_prompt;
    if (isStatsVisible && actionsChart) {
        updateChart([]);
    } else if (!isStatsVisible) {
        chartLegendContainer.innerHTML = '';
    }
    return;
  }

  const selectedAction = actionSelect.value;
  const selectedTime = timeSelect.value;
  const timeMap = {
    week: 7,
    '2weeks': 14,
    '3weeks': 21,
    month: 30,
    '2months': 60,
    '3months': 90,
    year: 365
  };

  const cutoff = Date.now() - (timeMap[selectedTime] || 0) * 86400000;

  const filtered = logData.filter(entry => {
    const entryTime = new Date(entry.timestamp).getTime();
    const type = extractActionDetails(entry.action);
    entry.type = type; // Добавляем тип действия к записи для дальнейшего использования
    return (selectedAction === translations[currentLang].all_actions || type === selectedAction) && entryTime >= cutoff && (!nicknameFilter || entry.action.toLowerCase().includes(nicknameFilter));
  });

  outputText.textContent = filtered.length
    ? ""
    : translations[currentLang].no_records_found;

  if (filtered.length) displayResults(filtered);

  if (isStatsVisible) {
      const container = actionsChartCanvas.parentElement;
      if (container) {
          actionsChartCanvas.width = container.offsetWidth;
          actionsChartCanvas.height = container.offsetHeight;
      }

      if (!actionsChart) {
          initChart();
      }
      updateChart(filtered); // Observer будет ждать изменения легенды
  } else {
      chartLegendContainer.innerHTML = '';
  }
}

function displayResults(results) {
  outputText.innerHTML = '';
  results.forEach((entry, i) => {
    const span = document.createElement('span');
    span.textContent = `[${entry.timestamp}] - ${entry.action}\n`;
    // Используем `entry.type` который был добавлен в applyFilters
    const originalActionLabel = (actionMap.find(action => action[`label_${currentLang}`] === entry.type) || {}).label_ru || translations['ru'].all_actions;
    span.style.color = colors[originalActionLabel];
    span.style.animationDelay = `${i * 50}ms`;

    span.addEventListener('click', () => {
      outputText.querySelectorAll('span.active').forEach(s => s.classList.remove('active'));
      span.classList.add('active');
    });

    span.addEventListener('dblclick', () => {
      navigator.clipboard.writeText(span.textContent).then(() => {
        copyToast.hidden = false;
        copyToast.classList.add('show');
        setTimeout(() => {
          copyToast.classList.remove('show');
          setTimeout(() => (copyToast.hidden = true), 500);
        }, 1500);
      }).catch(console.error);
    });

    outputText.appendChild(span);
  });
}

function initChart() {
  const ctx = actionsChartCanvas.getContext('2d');
  if (actionsChart) {
    actionsChart.destroy();
  }
  actionsChart = new Chart(ctx, {
    type: 'doughnut', // Тип графика
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [],
        borderColor: [], // Убираем обводку
        borderWidth: 0,  // Устанавливаем ширину обводки в 0
        spacing: 0,      // Убираем промежутки между сегментами
        borderRadius: 0, // Убираем скругление углов
        borderAlign: 'center',
        hoverOffset: 10,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Важно для гибкости размеров
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1000,
        easing: 'easeOutCirc'
      },
      cutout: '50%', // Уменьшаем внутренний вырез, чтобы круг был толще (расширен)
      plugins: {
        title: {
          display: false, // Отключаем стандартный заголовок
        },
        legend: {
          display: false // Отключаем стандартную легенду (будем использовать кастомную)
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed) {
                const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                label += `${context.parsed} (${percentage}%)`;
              }
              return label;
            }
          }
        }
      },
      layout: {
        padding: 0 // Убираем внутренний отступ, чтобы круг расширялся
      }
    }
  });
}

function updateChart(filteredData) {
  if (!actionsChart) {
      initChart();
  }

  const container = actionsChartCanvas.parentElement;
  if (container) {
      actionsChartCanvas.width = container.offsetWidth;
      actionsChartCanvas.height = container.offsetHeight;
  }

  const actionCounts = {};
  filteredData.forEach(entry => {
    // Используем `label_ru` из actionMap для подсчета и для сопоставления с `colors`
    // Убедимся, что entry.type уже установлен в applyFilters
    const originalAction = actionMap.find(action => action[`label_${currentLang}`] === entry.type);
    const actionTypeKey = originalAction ? originalAction.label_ru : translations['ru'].all_actions;
    actionCounts[actionTypeKey] = (actionCounts[actionTypeKey] || 0) + 1;
  });

  // Преобразуем actionCounts в массив для сортировки и передачи в Chart.js
  const sortedActions = Object.keys(actionCounts).map(label_ru => {
      const dataCount = actionCounts[label_ru];
      // Получаем label на текущем языке для отображения в легенде и графике
      const currentLangLabel = (actionMap.find(action => action.label_ru === label_ru) || {})[`label_${currentLang}`] || translations[currentLang].all_actions;
      const color = colors[label_ru] || '#cccccc'; // Используем цвет по RU метке
      return {
          label: currentLangLabel,
          data: dataCount,
          color: color,
          originalRuLabel: label_ru // Сохраняем оригинальную RU метку для цветов
      };
  });

  // Сортируем действия по убыванию количества
  sortedActions.sort((a, b) => b.data - a.data);

  const labels = sortedActions.map(item => item.label);
  const data = sortedActions.map(item => item.data);
  const backgroundColors = sortedActions.map(item => item.color);
  const borderColors = []; // Обводка убрана

  actionsChart.data.labels = labels;
  actionsChart.data.datasets[0].data = data;
  actionsChart.data.datasets[0].backgroundColor = backgroundColors;
  actionsChart.data.datasets[0].borderColor = borderColors;

  updateChartColors(); // Обновляем цвета, если тема меняется
  actionsChart.update();

  // Генерируем кастомную легенду
  generateChartLegend(labels, data, backgroundColors);
}

// Функция для генерации кастомной легенды
function generateChartLegend(labels, data, colorsArray) {
  chartLegendContainer.innerHTML = ''; // Очищаем контейнер легенды

  if (labels.length === 0) {
    chartLegendContainer.textContent = translations[currentLang].no_records_found;
    return;
  }

  // Создаем массив объектов для элементов легенды
  const legendItems = labels.map((label, i) => {
    return {
      label: label,
      data: data[i],
      color: colorsArray[i]
    };
  });

  // Добавляем каждый элемент легенды в контейнер
  legendItems.forEach(item => {
    const legendItemDiv = document.createElement('div');
    legendItemDiv.classList.add('chart-legend-item');

    const colorBox = document.createElement('span');
    colorBox.classList.add('chart-legend-color-box');
    colorBox.style.backgroundColor = item.color; // Цвет из графика

    const labelText = document.createElement('span');
    labelText.classList.add('chart-legend-label');
    labelText.textContent = `${item.label}: ${item.data}`;

    legendItemDiv.appendChild(colorBox);
    legendItemDiv.appendChild(labelText);
    chartLegendContainer.appendChild(legendItemDiv);
  });
}

function updateChartColors() {
    // В текущей реализации цвета заданы статично в `colors` и сопоставляются по `label_ru`.
    // Если бы цвета зависели от темы (например, Light/Dark theme), логика была бы здесь.
    // Пока что, при изменении темы, просто принудительно обновляем Chart.js
    if (actionsChart) {
        actionsChart.update();
    }
}

// Новая функция для рендеринга истории загрузок
function renderHistory() {
    historyList.innerHTML = ''; // Очищаем список

    if (uploadedFilesHistory.length === 0) {
        const noRecordsMessage = document.createElement('div');
        noRecordsMessage.classList.add('history-item');
        noRecordsMessage.textContent = translations[currentLang].no_records_found_history;
        historyList.appendChild(noRecordsMessage);
        return;
    }

    // Для множественной загрузки, каждый "блок" загруженных файлов будет одним элементом в истории.
    // Если требуется отображать каждый отдельный файл из группы, логика renderHistory
    // и uploadedFilesHistory должна быть изменена, чтобы хранить и отображать файлы индивидуально.
    // В данном случае, мы отображаем каждый загруженный "пакет" файлов как один элемент истории.
    uploadedFilesHistory.forEach((fileEntry, index) => {
        const historyItem = document.createElement('div');
        historyItem.classList.add('history-item');
        // Если это текущий активный элемент, добавляем класс 'active'
        if (index === activeHistoryItemIndex) {
            historyItem.classList.add('active');
        }
        // Изменено: отображаем имя файла (или файлов, если их было несколько)
        // Для простоты, если загружено несколько файлов сразу, отображаем только первый.
        // Вы можете изменить это, чтобы отображать, например, "Несколько файлов" или перечислять их.
        historyItem.innerHTML = `<span>${fileEntry.name}</span><span class="timestamp">${fileEntry.timestamp}</span>`;
        historyItem.addEventListener('click', () => {
            document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));
            historyItem.classList.add('active');
            activeHistoryItemIndex = index; // Обновляем активный индекс

            // При клике на элемент истории, загружаем соответствующие данные
            // Если historyEntry.parsedLogData содержит данные только для ОДНОГО файла,
            // а при множественной загрузке мы объединяли их, то нужно пересмотреть,
            // что именно хранится в uploadedFilesHistory.
            // Я изменил логику так, чтобы при загрузке нескольких файлов, logData
            // содержала ВСЕ объединенные данные, а uploadedFilesHistory хранила
            // метаданные о КАЖДОМ загруженном файле, но при клике на элемент истории,
            // мы будем загружать именно данные, связанные с ЭТИМ файлом, а не все объединенные.
            // Если вы хотите, чтобы клик на элемент истории "множественной загрузки"
            // снова загружал все эти файлы, то uploadedFilesHistory должен хранить
            // массив `parsedLogData` для каждого файла.

            // Я исправил логику так, чтобы при клике на элемент истории,
            // загружался именно тот файл, который был выбран из истории.
            // Т.е., logData будет перезаписываться данными ТОЛЬКО ЭТОГО файла.
            // Если вы хотите, чтобы при клике на элемент истории, все загруженные
            // файлы, которые были объединены, снова отображались, то логика будет другой.
            // Я предполагаю, что вы хотите просматривать каждый лог отдельно.
            logData = fileEntry.parsedLogData; // Загружаем данные только этого файла из истории
            applyFilters(); // Применяем фильтры к загруженным данным
        });
        historyList.appendChild(historyItem);
    });
}