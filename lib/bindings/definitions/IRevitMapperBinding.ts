import type {
  IBinding,
  IBindingSharedEvents
} from '~/lib/bindings/definitions/IBinding'

export const IRevitMapperBindingKey = 'revitMapperBinding'

export interface IRevitMapperBinding extends IBinding<IMapperBindingEvents> {
  // Gets list of available Revit categories for the UI dropdown
  getAvailableCategories: () => Promise<CategoryOption[]>

  // Assigns selected objects to a specific Revit category
  assignToCategory: (objectIds: string[], categoryValue: string) => Promise<void>

  // Removes category assignments from specific objects
  clearCategoryAssignment: (objectIds: string[]) => Promise<void>

  // Removes all category assignments in the doc
  clearAllCategoryAssignments: () => Promise<void>

  // Gets all current mappings to show in the UI table
  getCurrentMappings: () => Promise<CategoryMapping[]>

  // Get all objects assigned to a specific category
  getObjectsByCategory: (categoryValue: string) => Promise<string[]>
}

export interface IMapperBindingEvents extends IBindingSharedEvents {
  // Notify when mappings change
  mappingsChanged: (mappings: CategoryMapping[]) => void
}

export interface CategoryOption {
  value: string
  label: string
}

export interface CategoryMapping {
  categoryValue: string
  categoryLabel: string
  objectIds: string[]
  objectCount: number
}

// Mock implementation for dev/testing
export class MockedMapperBinding implements IRevitMapperBinding {
  private mockMappings: CategoryMapping[] = []

  public async assignToCategory(
    objectIds: string[],
    categoryValue: string
  ): Promise<void> {
    console.log('Mock: Assigning objects to category', { objectIds, categoryValue })
    // Mock implementation
  }

  public async getAvailableCategories(): Promise<CategoryOption[]> {
    // Return a few mock categories for dev
    return [
      { value: 'OST_Walls', label: 'Walls' },
      { value: 'OST_Floors', label: 'Floors' },
      { value: 'OST_Ceilings', label: 'Ceilings' },
      { value: 'OST_Columns', label: 'Columns' }
    ]
  }

  public async clearCategoryAssignment(objectIds: string[]): Promise<void> {
    console.log('Mock: Clearing category assignment', { objectIds })
  }

  public async clearAllCategoryAssignments(): Promise<void> {
    console.log('Mock: Clearing all assignments')
    this.mockMappings = []
  }

  public async getCurrentMappings(): Promise<CategoryMapping[]> {
    return this.mockMappings
  }

  public async getObjectsByCategory(categoryValue: string): Promise<string[]> {
    const mapping = this.mockMappings.find((m) => m.categoryValue === categoryValue)
    return mapping?.objectIds || []
  }

  public async showDevTools() {
    console.log('Braaaaa, no way!')
  }

  public async openUrl(url: string) {
    window.open(url)
  }

  public on() {
    // Mock event handler
  }
}
