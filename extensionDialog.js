"use strict";

const extensionDialog = () => {
  const selectors = {
    timeSpentHours: document.querySelector("#time-spent-h"),
    timeSpentMinutes: document.querySelector("#time-spent-m"),
    workDesc: document.querySelector("#work-desc"),
    submit: document.querySelector("#submit"),
    jiraPlTaskId: document.querySelector("#jira-pl-task-id"),
  };

  const PROJECTS_SOURCE = 'https://raw.githubusercontent.com/syzygypl/miox-time-sheet/master/projects.json';

  const onSubmit = function(extension_time, extension_desc, jiraPLTaskID) {
    const taskId = document
      .querySelector("meta[name='ajs-issue-key']")
      .getAttribute("content");
    const taskName = document.querySelector("#summary-val").innerText.replace(/'/g, "&#39;");

    prompt('worklog', `${taskId}, ${taskName}, ${taskId}, ${extension_desc.replace(/&quot;/g, "'")}`);

    chrome.storage.sync.set({[taskId]: jiraPLTaskID});

    chrome.runtime.sendMessage({
      type: "LOG_WORK_IN_JIRA_DE",
      payload: {
        timeSpent: extension_time,
        taskDesc: extension_desc,
        jiraPLTaskID
      }
    });

    chrome.runtime.sendMessage({
      type: "OPEN_JIRA_PL",
      payload: {
        jiraPLTaskID,
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
        }
      });
    });
  }

  const events = () => {
    selectors.submit.addEventListener("click", function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const timeSpent = `${selectors.timeSpentHours.value} ${selectors.timeSpentMinutes.value}`;
        const workDesc = selectors.workDesc.value.replace(/'/g, "&quot;");
 
        chrome.tabs.executeScript(tabs[0].id, {
          code: `(${onSubmit}('${timeSpent}', '${workDesc}', '${selectors.jiraPlTaskId.value}'))`
        });
      });
    });
  };

  fetchAndUpdateProjects().then(() => {
    memoJiraPlTaskId();
    events();

    selectors.workDesc.focus();
  });
};

extensionDialog();
