document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(['qa', 'midRate'], (result) => {
      document.getElementById('qa').checked = result.qa || false;
      document.getElementById('midRate').checked = result.midRate || false;
    });
  
    document.getElementById('save').addEventListener('click', () => {
      const qaChecked = document.getElementById('qa').checked;
      const midRateChecked = document.getElementById('midRate').checked;
      chrome.storage.sync.set({ qa: qaChecked, midRate: midRateChecked }, () => {
        alert('Zapisano!');
      });
    });
  });
  
