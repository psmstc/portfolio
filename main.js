const SERVICE_LINKS = [
  { href: "#course-projects", label: "Курсовые" },
  { href: "#contacts", label: "Контакты" }
];

const WORD_FORMS = {
  works: ["работа", "работы", "работ"],
  courses: ["курс", "курса", "курсов"],
  semesters: ["семестр", "семестра", "семестров"],
  disciplines: ["дисциплина", "дисциплины", "дисциплин"],
  courseProjects: ["курсовая", "курсовые", "курсовых"]
};

const UI_TEXT = {
  courseLabel: "Курс",
  serviceLabel: "..",
  openPdf: "Открыть PDF",
  missingPdf: "PDF появится позже",
  showWorks: "Показать работы",
  hideWorks: "Скрыть работы",
  emptyDiscipline: "PDF по этой дисциплине пока не добавлены."
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
    courseProjects: data.courseProjects.length
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
    createStat(counts.courseProjects, WORD_FORMS.courseProjects)
  ];
}

function getToggleLabel(isExpanded) {
  return isExpanded ? UI_TEXT.hideWorks : UI_TEXT.showWorks;
}

function getWorkButton(work) {
  if (!work.pdf) {
    return `<span class="work-link work-link--empty">${UI_TEXT.missingPdf}</span>`;
  }

  return `
    <a class="work-link" href="${escapeHtml(work.pdf)}" target="_blank" rel="noopener noreferrer">
      ${UI_TEXT.openPdf}
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
      <div>
        <span class="work-badge">${escapeHtml(work.badge)}</span>
        <strong>${escapeHtml(work.title)}</strong>
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
    return `${worksCount} PDF`;
  }

  const disciplinesCount = semester.disciplines.length;
  return `${disciplinesCount} ${pluralizeRu(disciplinesCount, WORD_FORMS.disciplines)}`;
}

function renderSemester(semester, courseIndex, semesterIndex) {
  return `
    <section class="semester-card">
      <div class="semester-card__head">
        <div>
          <p class="semester-tag">${escapeHtml(semester.tag)}</p>
          <h4 class="semester-card__title">${escapeHtml(semester.title)}</h4>
          ${renderOptionalParagraph("semester-card__note", semester.note)}
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
    sidebarNote: document.querySelector("#sidebar-note"),
    heroMeta: document.querySelector("#hero-meta"),
    heroCopy: document.querySelector("#hero-copy"),
    archiveCard: document.querySelector("#archive-card"),
    portfolioRoot: document.querySelector("#portfolio-root"),
    courseProjectsRoot: document.querySelector("#course-projects-root"),
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

function initPortfolio() {
  const data = window.portfolioData;

  if (!data) {
    return;
  }

  const elements = getElements();

  document.title = data.pageTitle || document.title;
  elements.courseNav.innerHTML = renderNav(data.courses);
  elements.sidebarNote.innerHTML = `<p>${escapeHtml(data.sidebarNote)}</p>`;
  elements.heroMeta.innerHTML = renderProfileMeta(data.profile);
  elements.heroCopy.innerHTML = renderProfileCopy(data.profile);
  elements.archiveCard.innerHTML = renderArchiveCard(data);
  elements.portfolioRoot.innerHTML = renderList(data.courses, renderCourse);
  elements.courseProjectsRoot.innerHTML = renderList(data.courseProjects, renderCourseProject);
  elements.contactsTitle.textContent = data.contacts.title;
  elements.contactsDescription.textContent = data.contacts.description;
  elements.contactsList.innerHTML = renderContacts(data.contacts.items);

  setupDisciplineToggles(elements.portfolioRoot);
}

window.addEventListener("DOMContentLoaded", initPortfolio);
