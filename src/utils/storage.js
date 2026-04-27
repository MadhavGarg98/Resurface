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
      updatedProjects[existingIndex] = {
        ...updatedProjects[existingIndex],
        ...projectToSave,
        updatedAt: new Date().toISOString()
      };
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

/**
 * Delete a project by ID
 * Also unassigns resources from this project (sets projectId to null)
 */
export async function deleteProject(id) {
  console.log('[Storage] Starting deleteProject for ID:', id);
  try {
    if (!id) throw new Error('No project ID provided to deleteProject');

    // 1. Get all projects
    const result = await chrome.storage.local.get('projects');
    console.log('[Storage] Current projects in storage:', result);
    const projects = result.projects || [];
    
    // 2. Filter out the deleted project
    const initialCount = projects.length;
    const filtered = projects.filter(p => p.id !== id);
    console.log(`[Storage] Filtering: ${initialCount} -> ${filtered.length} projects`);
    
    // 3. Save updated projects list
    await chrome.storage.local.set({ projects: filtered });
    console.log('[Storage] Projects list updated successfully');
    
    // 4. Get all resources and unassign them
    const resResult = await chrome.storage.local.get('resources');
    const resources = resResult.resources || [];
    console.log(`[Storage] Checking ${resources.length} resources for unassignment`);
    
    let unassignedCount = 0;
    const updatedResources = resources.map(r => {
      if (r.projectId === id) {
        unassignedCount++;
        return { ...r, projectId: null };
      }
      return r;
    });
    
    // 5. Save updated resources
    await chrome.storage.local.set({ resources: updatedResources });
    console.log(`[Storage] Unassigned ${unassignedCount} resources successfully`);
    
    return true;
  } catch (error) {
    console.error('[Storage] CRITICAL ERROR in deleteProject:', error);
    throw error;
  }
}

/**
 * Update a project's fields
 */
export async function updateProject(id, updates) {
  try {
    console.log('[Storage] Updating project:', id, updates);
    
    const result = await chrome.storage.local.get('projects');
    const projects = result.projects || [];
    
    const index = projects.findIndex(p => p.id === id);
    
    if (index >= 0) {
      projects[index] = { 
        ...projects[index], 
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      await chrome.storage.local.set({ projects });
      console.log('[Storage] Project updated:', projects[index]);
      return projects[index];
    }
    
    console.warn('[Storage] Project not found:', id);
    return null;
  } catch (error) {
    console.error('[Storage] Error updating project:', error);
    throw error;
  }
}

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
