import type {
  IBinding,
  IBindingSharedEvents
} from '~/lib/bindings/definitions/IBinding'

export const IRevitMapperBindingKey = 'revitMapperBinding'

export interface IRevitMapperBinding extends IBinding<IMapperBindingEvents> {
  // Assign objects to a Revit category (i.e. add BuiltInCategory as prop)
  assignToCategory: (objectIds: string[], categoryValue: string) => Promise<void>

  // Clear category assignment for specific objects
  clearCategoryAssignment: (objectIds: string[]) => Promise<void>

  // Clear all category assignments
  clearAllCategoryAssignments: () => Promise<void>

  // Get current mappings for all objects
  getCurrentMappings: () => Promise<CategoryMapping[]>

  // Get objects assigned to a specific category
  getObjectsByCategory: (categoryValue: string) => Promise<string[]>
}

export interface IMapperBindingEvents extends IBindingSharedEvents {
  // Notify when mappings change
  mappingsChanged: (mappings: CategoryMapping[]) => void
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
