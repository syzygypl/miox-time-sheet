"use strict";

const SUPABASE_URL = "https://ttheqngtlipxviofelpz.supabase.co";
const SUPABASE_API_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aGVxbmd0bGlweHZpb2ZlbHB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NTcyNDksImV4cCI6MjA1ODAzMzI0OX0.qHhilQ5MybZvVzpGNVPe9bnMTzeCEwPrqv4FT-R_fnw";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_API_KEY);

const checkIsQa = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(["qa"], (result) => {
      resolve(result.qa || false);
    });
  });
};

const getCurrentTabUrl = () => {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }

      if (tabs.length === 0) {
        return reject("Brak aktywnej karty");
      }

      resolve(tabs[0].url);
    });
  });
};

const extensionDialog = async () => {
  const selectors = {
    timeSpentHours: document.querySelector("#time-spent-h"),
    timeSpentMinutes: document.querySelector("#time-spent-m"),
    workDesc: document.querySelector("#work-desc"),

    submit: document.querySelector("#submit"),
    submitQa: document.querySelector("#submit-qa"),

    jiraPlTaskId: document.querySelector("#jira-pl-task-id"),

    progressDev: document.querySelector("#progress-dev"),
    progressBarDev: document.querySelector("#progress-bar-dev"),
    estimationDev: document.querySelector("#estimation-dev"),
    labelDev: document.querySelector("#label-dev"),
  };

  const jiraUrl = await getCurrentTabUrl();
  const isQa = await checkIsQa();

  if (isQa) {
    selectors.submit.style.display = "none";
    selectors.estimationDev.setAttribute("disabled", true);
    selectors.timeSpentHours.setAttribute("disabled", true);
    selectors.timeSpentMinutes.setAttribute("disabled", true);
    selectors.submit.removeAttribute("disabled");
  } else {
    selectors.submitQa.style.display = "none";
  }

  try {
    const { data, error } = await supabase
      .from("worklogs")
      .select("*")
      .eq("task", jiraUrl);
      const worklogData = data[0];
    if (worklogData) {
      selectors.progressDev.setAttribute("value", worklogData.logged_dev || 0);
      selectors.estimationDev.setAttribute("value", worklogData.estimation_dev || 0);
      selectors.progressBarDev.setAttribute("value", worklogData.logged_dev || 0);
      selectors.progressBarDev.setAttribute("max", worklogData.estimation_dev);
      selectors.labelDev.innerText = `${worklogData.logged_dev || 0}h`;
    } else {
      selectors.progressDev.setAttribute("value", 0);
      selectors.estimationDev.setAttribute("value", 0);
      selectors.progressBarDev.setAttribute("value", 0);
      selectors.progressBarDev.setAttribute("max", 0);
      selectors.labelDev.innerText = `0h`;
    }

    selectors.timeSpentHours.addEventListener("change", function (e) {
      const selectorValue = parseFloat(e.currentTarget.value);
      const progressDevValue = parseFloat(
        selectors.progressDev.getAttribute("value")
      );
      const estimationDev = selectors.estimationDev.value;
      

      if (selectorValue > 2 && parseFloat(estimationDev) === 0) {
        selectors.submit.setAttribute("disabled", true);
        alert("You need to add estimation first. Make sure it's also added to task comment");
      } else {
        selectors.submit.removeAttribute("disabled");
      }


      selectors.progressBarDev.setAttribute(
        "value",
        selectorValue + progressDevValue
      );
      selectors.labelDev.innerText = `${selectorValue + progressDevValue}h`;
    });

    selectors.timeSpentMinutes.addEventListener("change", function (e) {
      const selectorValue = parseFloat(e.currentTarget.value / 10);
      const progressValue = parseFloat(
        selectors.progressBarDev.getAttribute("value")
      );

      selectors.submit.removeAttribute("disabled");

      selectors.labelDev.innerText = `${progressValue + selectorValue}h`;
    });

    selectors.estimationDev.addEventListener("blur", async function (e) {
      const inputValue = parseFloat(e.currentTarget.value);
      selectors.progressBarDev.setAttribute("max", inputValue);

      selectors.submit.removeAttribute("disabled");

      if (worklogData) {
        await supabase
          .from("worklogs")
          .update({ estimation_dev: inputValue })
          .eq("task", jiraUrl);
      } else {
        await supabase
          .from("worklogs")
          .insert({ task: jiraUrl, estimation_dev: inputValue });
      }
    });
  } catch (error) {
    console.log(error);
  }

  const PROJECTS_SOURCE =
    "https://raw.githubusercontent.com/syzygypl/miox-time-sheet/master/projects-map.json";

  const onSubmit = function (extension_desc, jiraPLTaskID) {
    const taskId = document
      .querySelector("meta[name='ajs-issue-key']")
      .getAttribute("content");
    const taskName = document
      .querySelector("#summary-val")
      .innerText.replace(/'/g, "&#39;");

    chrome.storage.sync.set({ [taskId]: jiraPLTaskID });

    setTimeout(() => {
      prompt(
        `https://jirasyzygy.atlassian.net/browse/${jiraPLTaskID}`,
        `${taskId}, ${taskName}: ${extension_desc.replace(
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
    selectors.submit.addEventListener("click", async function (e) {
      e.preventDefault();

      try {
        const progressDevValue = parseFloat(
          selectors.progressDev.getAttribute("value")
        );

        const loggedTime = parseFloat(
          `${selectors.timeSpentHours.value}.${selectors.timeSpentMinutes.value}`
        );

        await supabase
          .from("worklogs")
          .update({ logged_dev: progressDevValue + loggedTime })
          .eq("task", jiraUrl);
      } catch (error) {
        console.error(error);
      }

      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const workDesc = selectors.workDesc.value.replace(/'/g, "&quot;");

        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: onSubmit,
          args: [workDesc, selectors.jiraPlTaskId.value],
        });
      });
    });

    selectors.submitQa.addEventListener("click", async function (e) {
      e.preventDefault();
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const workDesc = selectors.workDesc.value.replace(/'/g, "&quot;");

        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: onSubmit,
          args: [workDesc, selectors.jiraPlTaskId.value],
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
