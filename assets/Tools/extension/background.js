if(chrome.sidePanel?.setPanelBehavior)chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true}).catch(()=>{});
else chrome.action.onClicked.addListener(()=>chrome.tabs.create({url:chrome.runtime.getURL('panel.html')}));
