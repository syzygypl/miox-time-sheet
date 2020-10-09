"use strict";

const extensionDialog = () => {
  const state = {
    labels: "",
    epicLink: "",
    epicLabel: "",
    projects: []
  };

  const selectors = {
    timeSpentHours: document.querySelector("#time-spent-h"),
    timeSpentMinutes: document.querySelector("#time-spent-m"),
    workDesc: document.querySelector("#work-desc"),
    submit: document.querySelector("#submit"),
    jiraPlTaskId: document.querySelector("#jira-pl-task-id"),
    descTemplates: document.querySelector("#desc-templates"),
  };

  const PROJECTS_SOURCE = 'https://raw.githubusercontent.com/syzygypl/miox-time-sheet/master/projects.json';

  const validate = function() {
    const epicLabels = [...state.labels.split(" "), state.epicLink, state.epicLabel]
    const selectedOption = selectors.jiraPlTaskId.options[selectors.jiraPlTaskId.selectedIndex].text;
  };

  const onSubmit = function(extension_time, extension_desc, jiraPLTaskID, desc) {
    const taskId = document
      .querySelector("meta[name='ajs-issue-key']")
      .getAttribute("content");
    const taskName = document.querySelector("#summary-val").innerText.replace(/'/g, "&#39;");

    chrome.storage.sync.set({[taskId]: jiraPLTaskID});

    chrome.runtime.sendMessage({
      type: "LOG_WORK_IN_JIRA_PL",
      payload: {
        timeSpent: extension_time,
        taskId,
        taskName,
        taskDesc: extension_desc,
        jiraPLTaskID,
        desc
      }
    });
  };

  const fetchAndUpdateProjects = () => {
    return fetch(PROJECTS_SOURCE).then(response => response.json())
      .then(data => {
        const projects = data.projects.map(project => {
          return `<option value="${project.task}">${project.name}</option>`;
        });

        selectors.jiraPlTaskId.innerHTML = projects.join('');
      });
  }

  const memoJiraPlTaskId = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const taskId = tabs[0].url.split("/").slice(-1)[0];

      chrome.storage.sync.get(taskId, function(result) {
        if (result[taskId]) {
          selectors.jiraPlTaskId.value = result[taskId];
          validate();
        }
      });
    });
  }

  const events = () => {
    selectors.descTemplates.addEventListener('click', (e) => {
      const selectedTemplate = e.target.innerText;
      selectors.workDesc.innerText = selectedTemplate;
    })

    selectors.jiraPlTaskId.addEventListener('change', (e) => {
      validate();
    })

    selectors.submit.addEventListener("click", function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const timeSpent = `${selectors.timeSpentHours.value} ${selectors.timeSpentMinutes.value}`;
        const workDesc = selectors.workDesc.value.replace(/'/g, "&quot;");
        const desc = `${state.epicLink || state.epicLabel}! ${state.labels}`;

        chrome.tabs.executeScript(tabs[0].id, {
          code: `(${onSubmit}('${timeSpent}', '${workDesc}', '${selectors.jiraPlTaskId.value}', '${desc}'))`
        });
      });
    });
  };

  const onDialogOpen = function() {
    return {
      labels: document.querySelector("#wrap-labels .labels-wrap")?.innerText,
      epicLink: document.querySelector('.type-gh-epic-link')?.innerText,
      epicLabel: document.querySelector('.type-gh-epic-label')?.innerText
    };
  };

  const init = () => {
    chrome.tabs.executeScript(
      {
        code: `(${onDialogOpen}())`
      },
      function(results) {
        state.labels = results[0].labels;
        state.epicLink = results[0].epicLink;
        state.epicLabel = results[0].epicLabel;

        validate();
      }
    );
  };
  fetchAndUpdateProjects().then(() => {
    memoJiraPlTaskId();
    init();
    events();
  });
};

extensionDialog();
