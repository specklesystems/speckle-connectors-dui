import type {
  IBinding,
  IBindingSharedEvents
} from '~/lib/bindings/definitions/IBinding'

export const IRevitMapperBindingKey = 'revitMapperBinding'

export interface IRevitMapperBinding extends IBinding<IMapperBindingEvents> {
  // Gets list of available Revit categories for the UI dropdown
  getAvailableCategories: () => Promise<Category[]>

  // Object methods
  assignObjectsToCategory: (objectIds: string[], categoryValue: string) => Promise<void>
  clearObjectsCategoryAssignment: (objectIds: string[]) => Promise<void>
  clearAllObjectsCategoryAssignments: () => Promise<void>
  getCurrentObjectsMappings: () => Promise<CategoryMapping[]>

  // Layer methods
  assignLayerToCategory: (layerIds: string[], categoryValue: string) => Promise<void>
  clearLayerCategoryAssignment: (layerIds: string[]) => Promise<void>
  clearAllLayerCategoryAssignments: () => Promise<void>
  getCurrentLayerMappings: () => Promise<LayerCategoryMapping[]>
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

export interface LayerCategoryMapping {
  categoryValue: string
  categoryLabel: string
  layerIds: string[]
  layerNames: string[]
  layerCount: number
}

// Mock implementation for dev/testing
export class MockedMapperBinding implements IRevitMapperBinding {
  private mockMappings: CategoryMapping[] = []

  public assignObjectsToCategory(
    objectIds: string[],
    categoryValue: string
  ): Promise<void> {
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

  public clearObjectsCategoryAssignment(objectIds: string[]): Promise<void> {
    console.log('Mock: Clearing category assignment', { objectIds })
    return Promise.resolve()
  }

  public clearAllObjectsCategoryAssignments(): Promise<void> {
    console.log('Mock: Clearing all assignments')
    this.mockMappings = []
    return Promise.resolve()
  }

  public getCurrentObjectsMappings(): Promise<CategoryMapping[]> {
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
