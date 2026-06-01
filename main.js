const SERVICE_LINKS = [
  { href: "#course-projects", label: "Курсовые" },
  { href: "#practice", label: "Практики" },
  { href: "#contacts", label: "Контакты" }
];

const WORD_FORMS = {
  works: ["работа", "работы", "работ"],
  courses: ["курс", "курса", "курсов"],
  semesters: ["семестр", "семестра", "семестров"],
  disciplines: ["дисциплина", "дисциплины", "дисциплин"],
  courseProjects: ["курсовая", "курсовые", "курсовых"],
  practices: ["практика", "практики", "практик"]
};

const UI_TEXT = {
  courseLabel: "Курс",
  serviceLabel: "..",
  openWork: "Смотреть",
  openLink: "Открыть ссылку",
  downloadFile: "Скачать",
  openStandalone: "Открыть отдельно",
  downloadSource: "Скачать исходник",
  closeViewer: "Закрыть",
  missingFile: "Файл появится позже",
  showWorks: "Показать работы",
  hideWorks: "Скрыть работы",
  emptyDiscipline: "Работы по этой дисциплине пока не добавлены.",
  unsupportedPreview: "Этот файл нельзя показать внутри страницы, но его можно открыть отдельно."
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isExternalUrl(value) {
  return /^(https?:)?\/\//i.test(value) || /^(mailto|tel):/i.test(value);
}

function toAssetUrl(value) {
  if (!value || isExternalUrl(value)) {
    return value || "";
  }

  return value.split("/").map(encodeURIComponent).join("/");
}

function pluralizeRu(count, forms) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return forms[0];
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return forms[1];
  }

  return forms[2];
}

function sumBy(items, getValue) {
  return items.reduce((sum, item) => sum + getValue(item), 0);
}

function renderList(items, renderItem) {
  return items.map(renderItem).join("");
}

function renderOptionalParagraph(className, text) {
  return text ? `<p class="${className}">${escapeHtml(text)}</p>` : "";
}

function getDisciplineWorks(discipline) {
  return Array.isArray(discipline.works) ? discipline.works : [];
}

function countWorksInDiscipline(discipline) {
  return getDisciplineWorks(discipline).length;
}

function countWorksInSemester(semester) {
  return sumBy(semester.disciplines, countWorksInDiscipline);
}

function countWorksInCourse(course) {
  return sumBy(course.semesters, countWorksInSemester);
}

function getPortfolioCounts(data) {
  return {
    courses: data.courses.length,
    semesters: sumBy(data.courses, (course) => course.semesters.length),
    disciplines: sumBy(data.courses, (course) =>
      sumBy(course.semesters, (semester) => semester.disciplines.length)
    ),
    works: sumBy(data.courses, countWorksInCourse),
    courseProjects: data.courseProjects.length,
    practices: data.practiceReports.length
  };
}

function createStat(value, forms) {
  return {
    value,
    label: pluralizeRu(value, forms)
  };
}

function getPortfolioStats(data) {
  const counts = getPortfolioCounts(data);

  return [
    createStat(counts.courses, WORD_FORMS.courses),
    createStat(counts.semesters, WORD_FORMS.semesters),
    createStat(counts.disciplines, WORD_FORMS.disciplines),
    createStat(counts.works, WORD_FORMS.works),
    createStat(counts.courseProjects, WORD_FORMS.courseProjects),
    createStat(counts.practices, WORD_FORMS.practices)
  ];
}

function getToggleLabel(isExpanded) {
  return isExpanded ? UI_TEXT.hideWorks : UI_TEXT.showWorks;
}

function canPreviewWork(work) {
  return ["pdf", "html", "video", "image", "text"].includes(work.type);
}

function getWorkFile(work) {
  return work.file || work.pdf || "";
}

function getWorkActionLabel(work) {
  if (work.type === "link") {
    return UI_TEXT.openLink;
  }

  if (work.type === "download") {
    return UI_TEXT.downloadFile;
  }

  return UI_TEXT.openWork;
}

function getWorkButton(work) {
  const file = getWorkFile(work);

  if (!file) {
    return `<span class="work-link work-link--empty">${UI_TEXT.missingFile}</span>`;
  }

  const url = toAssetUrl(file);
  const sourceUrl = toAssetUrl(work.source || "");

  if (canPreviewWork(work)) {
    return `
      <button
        class="work-link"
        type="button"
        data-work-viewer
        data-work-type="${escapeHtml(work.type)}"
        data-work-title="${escapeHtml(work.title)}"
        data-work-badge="${escapeHtml(work.badge)}"
        data-work-file="${escapeHtml(url)}"
        data-work-source="${escapeHtml(sourceUrl)}"
        data-work-source-label="${escapeHtml(work.sourceLabel || UI_TEXT.downloadSource)}"
      >
        ${UI_TEXT.openWork}
      </button>
    `;
  }

  return `
    <a class="work-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
      ${getWorkActionLabel(work)}
    </a>
  `;
}

function renderStat(stat) {
  return `
    <div>
      <strong>${stat.value}</strong>
      <span>${stat.label}</span>
    </div>
  `;
}

function renderCourseNavItem(course) {
  return `
    <a class="course-nav__item" href="#${escapeHtml(course.id)}">
      <strong>${escapeHtml(String(Number(course.number)))}</strong>
      <span>${UI_TEXT.courseLabel}</span>
    </a>
  `;
}

function renderServiceNavItem(link) {
  return `
    <a class="course-nav__item course-nav__item--ghost" href="${escapeHtml(link.href)}">
      <strong>${UI_TEXT.serviceLabel}</strong>
      <span>${escapeHtml(link.label)}</span>
    </a>
  `;
}

function renderContact(contact) {
  return `<li>${escapeHtml(contact.label)}: ${escapeHtml(contact.value)}</li>`;
}

function renderWork(work) {
  return `
    <li class="work-item">
      <div class="work-item__text">
        <span class="work-badge">${escapeHtml(work.badge)}</span>
        <strong>${escapeHtml(work.title)}</strong>
        ${renderOptionalParagraph("work-note", work.note)}
      </div>
      ${getWorkButton(work)}
    </li>
  `;
}

function renderDisciplinePanel(works) {
  if (!works.length) {
    return `
      <div class="work-list work-list--empty">
        <p>${UI_TEXT.emptyDiscipline}</p>
      </div>
    `;
  }

  return `
    <ul class="work-list">
      ${renderList(works, renderWork)}
    </ul>
  `;
}

function renderDiscipline(discipline, ids) {
  const works = getDisciplineWorks(discipline);
  const worksCount = works.length;
  const isExpanded = Boolean(discipline.open);
  const panelId = `discipline-panel-${ids.join("-")}`;
  const toggleStateClass = isExpanded ? " is-open" : "";
  const panelStateClass = isExpanded ? " is-open" : "";

  return `
    <article class="discipline-card discipline-card--expandable">
      <div class="discipline-card__head">
        <strong class="discipline-card__title">${escapeHtml(discipline.name)}</strong>
        <button
          class="discipline-toggle${toggleStateClass}"
          type="button"
          aria-expanded="${isExpanded ? "true" : "false"}"
          aria-controls="${panelId}"
        >
          <span>${getToggleLabel(isExpanded)}</span>
          <span class="discipline-toggle__meta">
            ${worksCount} ${pluralizeRu(worksCount, WORD_FORMS.works)}
          </span>
        </button>
      </div>
      <div class="discipline-card__panel${panelStateClass}" id="${panelId}">
        <div class="discipline-card__panel-inner">
          ${renderDisciplinePanel(works)}
        </div>
      </div>
    </article>
  `;
}

function getSemesterCounterLabel(semester) {
  const worksCount = countWorksInSemester(semester);

  if (worksCount > 0) {
    return `${worksCount} ${pluralizeRu(worksCount, WORD_FORMS.works)}`;
  }

  const disciplinesCount = semester.disciplines.length;
  return `${disciplinesCount} ${pluralizeRu(disciplinesCount, WORD_FORMS.disciplines)}`;
}

function getSemesterTitle(semester) {
  const number = String(semester.tag).match(/\d+/)?.[0] || "";
  return number ? `Семестр ${number}` : semester.tag;
}

function renderSemester(semester, courseIndex, semesterIndex) {
  return `
    <section class="semester-card">
      <div class="semester-card__head">
        <div>
          <h4 class="semester-card__title">${escapeHtml(getSemesterTitle(semester))}</h4>
        </div>
        <span class="semester-card__counter">${getSemesterCounterLabel(semester)}</span>
      </div>
      <div class="discipline-list">
        ${renderList(semester.disciplines, (discipline, disciplineIndex) =>
          renderDiscipline(discipline, [courseIndex + 1, semesterIndex + 1, disciplineIndex + 1])
        )}
      </div>
    </section>
  `;
}

function renderCourse(course, courseIndex) {
  return `
    <article class="course-block" id="${escapeHtml(course.id)}">
      <div class="course-block__head">
        <div>
          <p class="course-number">${escapeHtml(course.number)}</p>
          <h3>${escapeHtml(course.title)}</h3>
        </div>
        <p class="course-summary">${escapeHtml(course.summary)}</p>
      </div>
      <div class="semester-grid">
        ${renderList(course.semesters, (semester, semesterIndex) =>
          renderSemester(semester, courseIndex, semesterIndex)
        )}
      </div>
    </article>
  `;
}

function renderCourseProject(project) {
  return `
    <article class="project-card">
      <div class="project-card__head">
        <div>
          <p class="card-label">${escapeHtml(project.badge)}</p>
          <h3 class="project-card__title">${escapeHtml(project.title)}</h3>
        </div>
        <span class="project-card__meta">${escapeHtml(project.period)}</span>
      </div>
      <p class="project-card__description">${escapeHtml(project.description)}</p>
      ${renderOptionalParagraph("project-card__focus", project.focus)}
      ${getWorkButton(project)}
    </article>
  `;
}

function renderNav(courses) {
  return renderList(courses, renderCourseNavItem) + renderList(SERVICE_LINKS, renderServiceNavItem);
}

function renderContacts(contacts) {
  return renderList(contacts, renderContact);
}

function renderArchiveCard(data) {
  return `
    <p class="archive-card__label">${escapeHtml(data.archive.label)}</p>
    <h2>${escapeHtml(data.archive.title)}</h2>
    <p>${escapeHtml(data.archive.description)}</p>
    <div class="archive-card__stats">
      ${renderList(getPortfolioStats(data), renderStat)}
    </div>
    <div class="archive-card__chips">
      ${renderList(data.archive.chips, (chip) => `<span>${escapeHtml(chip)}</span>`)}
    </div>
  `;
}

function renderProfileMeta(profile) {
  return `
    <span>ФИО: ${escapeHtml(profile.fullName)}</span>
    <span>${escapeHtml(profile.education)}</span>
  `;
}

function renderProfileCopy(profile) {
  return `
    <p class="eyebrow">${escapeHtml(profile.label)}</p>
    <h1>${escapeHtml(profile.headline)}</h1>
    <p class="hero-text">${escapeHtml(profile.description)}</p>
  `;
}

function getElements() {
  return {
    courseNav: document.querySelector("#course-nav"),
    heroMeta: document.querySelector("#hero-meta"),
    heroCopy: document.querySelector("#hero-copy"),
    archiveCard: document.querySelector("#archive-card"),
    portfolioRoot: document.querySelector("#portfolio-root"),
    courseProjectsRoot: document.querySelector("#course-projects-root"),
    practiceReportsRoot: document.querySelector("#practice-reports-root"),
    contactsTitle: document.querySelector("#contacts-title"),
    contactsDescription: document.querySelector("#contacts-description"),
    contactsList: document.querySelector("#contacts-list")
  };
}

function updateDisciplineToggle(button, isExpanded) {
  button.setAttribute("aria-expanded", isExpanded ? "true" : "false");
  button.classList.toggle("is-open", isExpanded);

  const label = button.querySelector("span");
  if (label) {
    label.textContent = getToggleLabel(isExpanded);
  }
}

function toggleDisciplinePanel(button) {
  const panelId = button.getAttribute("aria-controls");
  const panel = document.getElementById(panelId);

  if (!panel) {
    return;
  }

  const isExpanded = button.getAttribute("aria-expanded") !== "true";

  updateDisciplineToggle(button, isExpanded);
  panel.classList.toggle("is-open", isExpanded);
}

function setupDisciplineToggles(root) {
  root.addEventListener("click", (event) => {
    const button = event.target.closest(".discipline-toggle");

    if (!button || !root.contains(button)) {
      return;
    }

    toggleDisciplinePanel(button);
  });
}

function createWorkViewer() {
  const existingViewer = document.querySelector("#work-viewer");
  if (existingViewer) {
    return existingViewer;
  }

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div class="viewer-modal" id="work-viewer" hidden>
        <div class="viewer-modal__backdrop" data-viewer-close></div>
        <section class="viewer-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="work-viewer-title">
          <header class="viewer-modal__header">
            <div>
              <span class="work-badge" id="work-viewer-badge"></span>
              <h2 id="work-viewer-title"></h2>
            </div>
            <button class="viewer-modal__close" type="button" data-viewer-close aria-label="${UI_TEXT.closeViewer}">
              ×
            </button>
          </header>
          <div class="viewer-modal__body" id="work-viewer-body"></div>
          <footer class="viewer-modal__footer">
            <a class="work-link" id="work-viewer-standalone" target="_blank" rel="noopener noreferrer">
              ${UI_TEXT.openStandalone}
            </a>
            <a class="work-link work-link--ghost" id="work-viewer-source" target="_blank" rel="noopener noreferrer" download>
              ${UI_TEXT.downloadSource}
            </a>
          </footer>
        </section>
      </div>
    `
  );

  return document.querySelector("#work-viewer");
}

function getViewerElements() {
  const viewer = createWorkViewer();

  return {
    viewer,
    title: viewer.querySelector("#work-viewer-title"),
    badge: viewer.querySelector("#work-viewer-badge"),
    body: viewer.querySelector("#work-viewer-body"),
    standalone: viewer.querySelector("#work-viewer-standalone"),
    source: viewer.querySelector("#work-viewer-source"),
    closeButton: viewer.querySelector(".viewer-modal__close")
  };
}

function renderViewerBody(type, url, title) {
  const safeUrl = escapeHtml(url);
  const safeTitle = escapeHtml(title);

  if (type === "video") {
    return `<video class="viewer-modal__video" src="${safeUrl}" controls></video>`;
  }

  if (type === "image") {
    return `<img class="viewer-modal__image" src="${safeUrl}" alt="${safeTitle}">`;
  }

  if (["pdf", "html", "text"].includes(type)) {
    return `<iframe class="viewer-modal__frame" src="${safeUrl}" title="${safeTitle}"></iframe>`;
  }

  return `<p class="viewer-modal__message">${UI_TEXT.unsupportedPreview}</p>`;
}

function openWorkViewer(trigger) {
  const elements = getViewerElements();
  const type = trigger.dataset.workType || "pdf";
  const title = trigger.dataset.workTitle || "";
  const badge = trigger.dataset.workBadge || "";
  const file = trigger.dataset.workFile || "";
  const source = trigger.dataset.workSource || "";
  const sourceLabel = trigger.dataset.workSourceLabel || UI_TEXT.downloadSource;

  elements.title.textContent = title;
  elements.badge.textContent = badge;
  elements.body.innerHTML = renderViewerBody(type, file, title);
  elements.standalone.href = file;
  elements.source.href = source;
  elements.source.textContent = sourceLabel;
  elements.source.hidden = !source;
  elements.viewer.hidden = false;
  document.body.classList.add("is-viewer-open");
  elements.closeButton.focus();
}

function closeWorkViewer() {
  const elements = getViewerElements();

  elements.viewer.hidden = true;
  elements.body.innerHTML = "";
  document.body.classList.remove("is-viewer-open");
}

function setupWorkViewer() {
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-work-viewer]");
    if (trigger) {
      openWorkViewer(trigger);
      return;
    }

    const closeButton = event.target.closest("[data-viewer-close]");
    if (closeButton) {
      closeWorkViewer();
    }
  });

  document.addEventListener("keydown", (event) => {
    const viewer = document.querySelector("#work-viewer");
    if (event.key === "Escape" && viewer && !viewer.hidden) {
      closeWorkViewer();
    }
  });
}

function initPortfolio() {
  const data = window.portfolioData;

  if (!data) {
    return;
  }

  const elements = getElements();

  document.title = data.pageTitle || document.title;
  elements.courseNav.innerHTML = renderNav(data.courses);
  elements.heroMeta.innerHTML = renderProfileMeta(data.profile);
  elements.heroCopy.innerHTML = renderProfileCopy(data.profile);
  elements.archiveCard.innerHTML = renderArchiveCard(data);
  elements.portfolioRoot.innerHTML = renderList(data.courses, renderCourse);
  elements.courseProjectsRoot.innerHTML = renderList(data.courseProjects, renderCourseProject);
  elements.practiceReportsRoot.innerHTML = renderList(data.practiceReports, renderCourseProject);
  elements.contactsTitle.textContent = data.contacts.title;
  elements.contactsDescription.textContent = data.contacts.description;
  elements.contactsList.innerHTML = renderContacts(data.contacts.items);

  setupDisciplineToggles(elements.portfolioRoot);
  setupWorkViewer();
}

window.addEventListener("DOMContentLoaded", initPortfolio);
