import { updateResource, saveProject } from '../utils/storage.js';

export const init = () => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { action, data } = message;

    if (action === 'CONFIRM_CLASSIFICATION') {
      handleConfirm(data).then(() => sendResponse({ success: true }));
      return true;
    }

    if (action === 'DISMISS_CLASSIFICATION') {
      handleDismiss(data).then(() => sendResponse({ success: true }));
      return true;
    }

    if (action === 'CREATE_PROJECT_AND_ASSIGN') {
      handleCreateAndAssign(data).then(() => sendResponse({ success: true }));
      return true;
    }
  });
};

async function handleConfirm({ resourceId, projectId, tags }) {
  await updateResource(resourceId, {
    projectId,
    tags: [...new Set([...(tags || [])])],
    _needsConfirmation: false,
    _pendingClassification: null
  });
  
  // Clear pending classification from storage
  await chrome.storage.local.remove(['_pendingClassification']);
}

async function handleDismiss({ resourceId }) {
  await updateResource(resourceId, {
    _needsConfirmation: false,
    _pendingClassification: null
  });
  
  await chrome.storage.local.remove(['_pendingClassification']);
}

async function handleCreateAndAssign({ name, keywords, resourceId, tags }) {
  const project = {
    name,
    keywords,
    color: '#F5A623',
    createdAt: new Date().toISOString()
  };
  
  const savedProject = await saveProject(project);
  
  await updateResource(resourceId, {
    projectId: savedProject.id,
    tags: [...new Set([...(tags || [])])],
    _needsConfirmation: false,
    _pendingClassification: null
  });
  
  await chrome.storage.local.remove(['_pendingClassification']);
}
