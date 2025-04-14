document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(['qa'], (result) => {
      document.getElementById('qa').checked = result.qa || false;
    });
  
    document.getElementById('save').addEventListener('click', () => {
      const checked = document.getElementById('qa').checked;
      chrome.storage.sync.set({ qa: checked }, () => {
        alert('Zapisano!');
      });
    });
  });
  