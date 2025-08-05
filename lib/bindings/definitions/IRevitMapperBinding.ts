import type {
  IBinding,
  IBindingSharedEvents
} from '~/lib/bindings/definitions/IBinding'

export const IRevitMapperBindingKey = 'revitMapperBinding'

export interface IRevitMapperBinding extends IBinding<IMapperBindingEvents> {
  // Gets list of available Revit categories for the UI dropdown
  getAvailableCategories: () => Promise<Category[]>

  // Assigns selected objects to a specific Revit category
  assignToCategory: (objectIds: string[], categoryValue: string) => Promise<void>

  // Removes category assignments from specific objects
  clearCategoryAssignment: (objectIds: string[]) => Promise<void>

  // Removes all category assignments in the doc
  clearAllCategoryAssignments: () => Promise<void>

  // Gets all current mappings to show in the UI table
  getCurrentMappings: () => Promise<CategoryMapping[]>
}

export interface IMapperBindingEvents extends IBindingSharedEvents {
  // Notify when mappings change
  mappingsChanged: (mappings: CategoryMapping[]) => void
}

export interface Category {
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

  public assignToCategory(objectIds: string[], categoryValue: string): Promise<void> {
    console.log('Mock: Assigning objects to category', { objectIds, categoryValue })
    return Promise.resolve()
  }

  public getAvailableCategories(): Promise<Category[]> {
    return Promise.resolve([
      { value: 'OST_Walls', label: 'Walls' },
      { value: 'OST_Floors', label: 'Floors' },
      { value: 'OST_Ceilings', label: 'Ceilings' },
      { value: 'OST_Columns', label: 'Columns' }
    ])
  }

  public clearCategoryAssignment(objectIds: string[]): Promise<void> {
    console.log('Mock: Clearing category assignment', { objectIds })
    return Promise.resolve()
  }

  public clearAllCategoryAssignments(): Promise<void> {
    console.log('Mock: Clearing all assignments')
    this.mockMappings = []
    return Promise.resolve()
  }

  public getCurrentMappings(): Promise<CategoryMapping[]> {
    return Promise.resolve(this.mockMappings)
  }

  public showDevTools(): Promise<void> {
    console.log('Braaaaa, no way!')
    return Promise.resolve()
  }

  public openUrl(url: string): Promise<void> {
    window.open(url)
    return Promise.resolve()
  }

  public on() {
    // Mock event handler
  }
}
