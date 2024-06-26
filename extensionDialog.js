"use strict";

const extensionDialog = () => {
  const selectors = {
    timeSpentHours: document.querySelector("#time-spent-h"),
    timeSpentMinutes: document.querySelector("#time-spent-m"),
    workDesc: document.querySelector("#work-desc"),
    submit: document.querySelector("#submit"),
    submitQA: document.querySelector("#submit-qa"),
    jiraPlTaskId: document.querySelector("#jira-pl-task-id"),
  };

  const PROJECTS_SOURCE =
    "https://raw.githubusercontent.com/syzygypl/miox-time-sheet/master/projects.json";

  const onSubmit = function (extension_time, extension_desc, jiraPLTaskID, qa) {
    const taskId = document
      .querySelector("meta[name='ajs-issue-key']")
      .getAttribute("content");
    const taskName = document
      .querySelector("#summary-val")
      .innerText.replace(/'/g, "&#39;");

    chrome.storage.sync.set({ [taskId]: jiraPLTaskID });

    if (!qa) {
      chrome.runtime.sendMessage({
        type: "LOG_WORK_IN_JIRA_DE",
        payload: {
          timeSpent: extension_time,
          taskDesc: extension_desc,
          jiraPLTaskID,
        },
      });
    }

    setTimeout(() => {
      prompt(
        `https://jirasyzygy.atlassian.net/browse/${jiraPLTaskID}`,
        `${taskId}, ${taskName}, ${taskId}, ${extension_desc.replace(
          /&quot;/g,
          "'"
        )}`
      );

      window.open(
        `https://jirasyzygy.atlassian.net/browse/${jiraPLTaskID}`,
        "_blank",
        "popup,width=700,height=800"
      );
    }, 1000);
  };

  const fetchAndUpdateProjects = () => {
    return fetch(PROJECTS_SOURCE)
      .then((response) => response.json())
      .then((data) => {
        const projects = data.projects.map((project) => {
          return `<option value="${project.task}">${project.name}</option>`;
        });

        selectors.jiraPlTaskId.innerHTML = projects.join("");
      });
  };

  const memoJiraPlTaskId = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const taskId = tabs[0].url.split("/").slice(-1)[0];

      chrome.storage.sync.get(taskId, function (result) {
        if (result[taskId]) {
          selectors.jiraPlTaskId.value = result[taskId];
        }
      });
    });
  };

  const events = () => {
    selectors.submit.addEventListener("click", function () {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const timeSpent = `${selectors.timeSpentHours.value} ${selectors.timeSpentMinutes.value}`;
        const workDesc = selectors.workDesc.value.replace(/'/g, "&quot;");

        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: onSubmit,
          args: [timeSpent, workDesc, selectors.jiraPlTaskId.value]
        });
      });
    });

    selectors.submitQA.addEventListener("click", function () {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const timeSpent = `${selectors.timeSpentHours.value} ${selectors.timeSpentMinutes.value}`;
        const workDesc = selectors.workDesc.value.replace(/'/g, "&quot;");

        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: onSubmit,
          args: [timeSpent, workDesc, selectors.jiraPlTaskId.value, 'qa']
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
