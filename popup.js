"use strict";

chrome.runtime.onMessage.addListener(function(request) {
  if (request.type === "LOG_WORK_IN_JIRA_DE") {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.executeScript(tabs[0].id, {
        code: `(${logWork}('${request.payload.timeSpent}', '${request.payload.taskDesc}', '${request.payload.jiraPLTaskID}'))`
      });
    });
  }

  if (request.type === "ALERT") {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.executeScript(tabs[0].id, {
        code: `alert("${request.payload.msg}")`
      });
    });
  }
});

function logWork(timeSpent, taskDesc, jiraPLTaskID) {
  const getElements = () => {
    return {
      logWorkDialogTrigger: document.querySelector("#log-work"),

      timeSpentInput: document.querySelector("#log-work-time-logged"),
      workDescInput: document.querySelector(".jira-dialog-content textarea"),
      submitBtn: document.querySelector("#log-work-submit")
    };
  };
  
  const waitForLogWorkDialogOpen = () => {
    const TIMEOUT = 1000;
    const MAX_ATTEMPS = 60;

    return new Promise((resolve, reject) => {
      function findDialog(attemp = 0) {
        document.title = "waiting for log dialog";
        if (attemp++ === MAX_ATTEMPS) {
          reject(
            "Log dialog error, can't find [#log-work-time-logged] on page"
          );
        }

        const elements = getElements();
        if (elements.logWorkDialogTrigger) {
          elements.logWorkDialogTrigger.click();
        }

        const logWorkDialog = elements.timeSpentInput;
        if (logWorkDialog) {
          resolve("Log dialog ready");
          document.title = "log dialog ready";
        } else {
          setTimeout(function() {
            findDialog(attemp);
          }, TIMEOUT);
        }
      }

      findDialog();
    });
  };


  async function submit() {
    try {
      await waitForLogWorkDialogOpen();
      const elements = getElements();

      document.title = "filling log dialog";
      elements.timeSpentInput.value = timeSpent;
      elements.workDescInput.innerText =`${jiraPLTaskID}: ${taskDesc.replace(/&quot;/g, "'")}`;

      elements.submitBtn.click();

    } catch (error) {
      showAlert("Something went wrong", error);
    }
  }



  const showAlert = msg => {
    chrome.runtime.sendMessage({
      type: "ALERT",
      payload: {
        msg
      }
    });
  };

  submit();
}
