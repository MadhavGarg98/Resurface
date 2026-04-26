import { v4 as uuidv4 } from 'uuid';

export const getProjects = async () => {
  try {
    const data = await chrome.storage.local.get(['projects']);
    return data.projects || [];
  } catch (error) {
    console.error('Error getting projects:', error);
    return [];
  }
};

export const saveProject = async (project) => {
  try {
    const projects = await getProjects();
    const existingIndex = projects.findIndex(p => p.id === project.id);
    
    let updatedProjects;
    let projectToSave = { ...project };

    if (existingIndex > -1) {
      // Update
      updatedProjects = [...projects];
      updatedProjects[existingIndex] = projectToSave;
    } else {
      // Create
      if (!projectToSave.id) projectToSave.id = uuidv4();
      if (!projectToSave.createdAt) projectToSave.createdAt = new Date().toISOString();
      updatedProjects = [...projects, projectToSave];
    }
    
    await chrome.storage.local.set({ projects: updatedProjects });
    return projectToSave;
  } catch (error) {
    console.error('Error saving project:', error);
    return null;
  }
};

export const deleteProject = async (id) => {
  try {
    const projects = await getProjects();
    const updatedProjects = projects.filter(p => p.id !== id);
    await chrome.storage.local.set({ projects: updatedProjects });
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
};

export const getResources = async (projectId = null) => {
  try {
    const data = await chrome.storage.local.get(['resources']);
    const resources = data.resources || [];
    if (projectId) {
      return resources.filter(r => r.projectId === projectId);
    }
    return resources;
  } catch (error) {
    console.error('Error getting resources:', error);
    return [];
  }
};

export const saveResource = async (resource) => {
  try {
    const resources = await getResources();
    const existingIndex = resources.findIndex(r => r.id === resource.id);
    
    let updatedResources;
    let resourceToSave = { ...resource };

    if (existingIndex > -1) {
      // Update
      updatedResources = [...resources];
      updatedResources[existingIndex] = resourceToSave;
    } else {
      // Create
      if (!resourceToSave.id) resourceToSave.id = uuidv4();
      if (!resourceToSave.savedAt) resourceToSave.savedAt = new Date().toISOString();
      updatedResources = [...resources, resourceToSave];
    }
    
    await chrome.storage.local.set({ resources: updatedResources });
    return resourceToSave;
  } catch (error) {
    console.error('Error saving resource:', error);
    return null;
  }
};

export const deleteResource = async (id) => {
  try {
    const resources = await getResources();
    const updatedResources = resources.filter(r => r.id !== id);
    await chrome.storage.local.set({ resources: updatedResources });
    return true;
  } catch (error) {
    console.error('Error deleting resource:', error);
    return false;
  }
};

export const updateResource = async (id, updates) => {
  try {
    const resources = await getResources();
    const resourceIndex = resources.findIndex(r => r.id === id);
    if (resourceIndex === -1) return null;
    
    const updatedResource = { ...resources[resourceIndex], ...updates };
    resources[resourceIndex] = updatedResource;
    
    await chrome.storage.local.set({ resources });
    return updatedResource;
  } catch (error) {
    console.error('Error updating resource:', error);
    return null;
  }
};

export const getSettings = async () => {
  try {
    const data = await chrome.storage.local.get(['settings']);
    return data.settings || { 
      groqApiKey: '', 
      geminiApiKey: '', 
      preferredOrder: 'Groq first (fastest)',
      showFloatingChat: true 
    };
  } catch (error) {
    console.error('Error getting settings:', error);
    return { 
      groqApiKey: '', 
      geminiApiKey: '', 
      preferredOrder: 'Groq first (fastest)',
      showFloatingChat: true
    };
  }
};

export const saveSettings = async (settings) => {
  try {
    const currentSettings = await getSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    await chrome.storage.local.set({ settings: updatedSettings });
    return updatedSettings;
  } catch (error) {
    console.error('Error saving settings:', error);
    return null;
  }
};
