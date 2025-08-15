import type {
  IBinding,
  IBindingSharedEvents
} from '~/lib/bindings/definitions/IBinding'

export const IRevitMapperBindingKey = 'revitMapperBinding'

export interface IRevitMapperBinding extends IBinding<IMapperBindingEvents> {
  // Gets list of defined layers in doc
  getAvailableLayers: () => Promise<LayerOption[]>

  // Object methods
  assignObjectsToCategory: (objectIds: string[], categoryValue: string) => Promise<void>
  clearObjectsCategoryAssignment: (objectIds: string[]) => Promise<void>
  clearAllObjectsCategoryAssignments: () => Promise<void>
  getCurrentObjectsMappings: () => Promise<CategoryMapping[]>
  getCategoryMappingsForObjects: (objectIds: string[]) => Promise<string[]>

  // Layer methods
  assignLayerToCategory: (layerIds: string[], categoryValue: string) => Promise<void>
  clearLayerCategoryAssignment: (layerIds: string[]) => Promise<void>
  clearAllLayerCategoryAssignments: () => Promise<void>
  getCurrentLayerMappings: () => Promise<LayerCategoryMapping[]>
  getEffectiveObjectsForLayerMapping: (
    layerIds: string[],
    categoryValue: string
  ) => Promise<string[]>
  getCategoryMappingsForLayers: (layerIds: string[]) => Promise<string[]>
}

export interface IMapperBindingEvents extends IBindingSharedEvents {
  mappingsChanged: (mappings: CategoryMapping[]) => void
  layersChanged: (layers: LayerOption[]) => void
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

export interface LayerOption {
  id: string
  name: string
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

  public getAvailableLayers(): Promise<LayerOption[]> {
    return Promise.resolve([
      { id: 'layer1', name: 'Ground Floor' },
      { id: 'layer2', name: 'Ground Floor/Walls' },
      { id: 'layer3', name: 'Ground Floor/Walls/Interior' },
      { id: 'layer4', name: 'Second Floor' }
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

  public assignLayerToCategory(
    layerIds: string[],
    categoryValue: string
  ): Promise<void> {
    console.log('Mock: Assigning layers to category', { layerIds, categoryValue })
    return Promise.resolve()
  }

  public clearLayerCategoryAssignment(layerIds: string[]): Promise<void> {
    console.log('Mock: Clearing layer category assignment', { layerIds })
    return Promise.resolve()
  }

  public clearAllLayerCategoryAssignments(): Promise<void> {
    console.log('Mock: Clearing all layer assignments')
    return Promise.resolve()
  }

  public getCurrentLayerMappings(): Promise<LayerCategoryMapping[]> {
    return Promise.resolve([])
  }

  public getEffectiveObjectsForLayerMapping(
    layerIds: string[],
    categoryValue: string
  ): Promise<string[]> {
    console.log('Mock: Getting effective objects for layer mapping', {
      layerIds,
      categoryValue
    })
    return Promise.resolve(['obj1', 'obj2', 'obj3'])
  }

  public getCategoryMappingsForObjects(objectIds: string[]): Promise<string[]> {
    console.log('Mock: Getting category mappings for objects', { objectIds })
    // Mock returning some categories for testing
    return Promise.resolve(
      objectIds.length > 1 ? ['OST_Walls', 'OST_Doors'] : ['OST_Walls']
    )
  }

  public getCategoryMappingsForLayers(layerIds: string[]): Promise<string[]> {
    console.log('Mock: Getting category mappings for layers', { layerIds })
    return Promise.resolve(
      layerIds.length > 1 ? ['OST_Floors', 'OST_Ceilings'] : ['OST_Floors']
    )
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
